import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatZodError, subscriptionImportSchema } from "@/lib/validations"

async function verifyOptionalRelation(params: {
  type: "category" | "paymentMethod"
  id: string | null | undefined
  userId: string
}) {
  const { type, id, userId } = params

  if (!id) {
    return null
  }

  const owned =
    type === "category"
      ? await prisma.category.findFirst({
          where: { id, userId },
          select: { id: true },
        })
      : await prisma.paymentMethod.findFirst({
          where: { id, userId },
          select: { id: true },
        })

  return owned?.id ?? false
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = subscriptionImportSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 })
    }

    const created: unknown[] = []

    for (const subscription of parseResult.data.subscriptions) {
      const categoryId = await verifyOptionalRelation({
        type: "category",
        id: subscription.category,
        userId: session.user.id,
      })

      if (categoryId === false) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 })
      }

      const paymentMethodId = await verifyOptionalRelation({
        type: "paymentMethod",
        id: subscription.paymentMethod,
        userId: session.user.id,
      })

      if (paymentMethodId === false) {
        return NextResponse.json(
          { error: "Invalid payment method" },
          { status: 400 }
        )
      }

      const createdSubscription = await prisma.subscription.create({
        data: {
          name: subscription.name,
          cost: subscription.cost,
          currency: subscription.currency,
          billingFrequency: "monthly",
          startDate: new Date(subscription.startDate),
          endDate: null,
          notes: subscription.notes ?? "Imported from transaction history",
          userId: session.user.id,
          categoryId,
          paymentMethodId,
        },
        include: {
          category: true,
          paymentMethod: true,
        },
      })

      created.push(createdSubscription)
    }

    revalidateTag("dashboard")
    revalidateTag("analytics")

    return NextResponse.json({ imported: created.length, subscriptions: created })
  } catch (error) {
    console.error("Error importing subscriptions:", error)
    return NextResponse.json(
      { error: "Failed to import subscriptions" },
      { status: 500 }
    )
  }
}
