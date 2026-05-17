import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscriptionCreateSchema, formatZodError } from "@/lib/validations";

// GET all subscriptions for the logged-in user
export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.user.id },
      include: {
        category: true,
        paymentMethod: true,
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// POST a new subscription
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const parseResult = subscriptionCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 });
    }

    const validatedData = parseResult.data;

    // category/paymentMethod come in as IDs from the form. Verify ownership.
    let categoryId: string | null = null;
    if (validatedData.category) {
      const category = await prisma.category.findFirst({
        where: { id: validatedData.category, userId: session.user.id },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
      categoryId = category.id;
    }

    let paymentMethodId: string | null = null;
    if (validatedData.paymentMethod) {
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: validatedData.paymentMethod, userId: session.user.id },
        select: { id: true },
      });
      if (!paymentMethod) {
        return NextResponse.json(
          { error: "Invalid payment method" },
          { status: 400 }
        );
      }
      paymentMethodId = paymentMethod.id;
    }

    const subscription = await prisma.subscription.create({
      data: {
        name: validatedData.name,
        cost: validatedData.cost,
        billingFrequency: validatedData.billingFrequency,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        notes: validatedData.notes,
        userId: session.user.id,
        categoryId,
        paymentMethodId,
        currency: validatedData.currency,
      },
      include: {
        category: true,
        paymentMethod: true,
      },
    });

    revalidateTag("dashboard");
    revalidateTag("analytics");
    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
