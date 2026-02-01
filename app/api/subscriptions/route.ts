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

    // Create or find category if provided
    let categoryId = null;
    if (validatedData.category) {
      const category = await prisma.category.findFirst({
        where: {
          name: validatedData.category,
          userId: session.user.id,
        },
      });

      if (category) {
        categoryId = category.id;
      } else {
        const newCategory = await prisma.category.create({
          data: {
            name: validatedData.category,
            userId: session.user.id,
          },
        });
        categoryId = newCategory.id;
      }
    }

    // Create or find payment method if provided
    let paymentMethodId = null;
    if (validatedData.paymentMethod) {
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          name: validatedData.paymentMethod,
          userId: session.user.id,
        },
      });

      if (paymentMethod) {
        paymentMethodId = paymentMethod.id;
      } else {
        const newPaymentMethod = await prisma.paymentMethod.create({
          data: {
            name: validatedData.paymentMethod,
            type: "OTHER",
            userId: session.user.id,
          },
        });
        paymentMethodId = newPaymentMethod.id;
      }
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
    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
