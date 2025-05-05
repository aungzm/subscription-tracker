import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // Create or find category if provided
    let categoryId = null;
    if (body.category) {
      const category = await prisma.category.findFirst({
        where: {
          name: body.category,
          userId: session.user.id,
        },
      });

      if (category) {
        categoryId = category.id;
      } else {
        const newCategory = await prisma.category.create({
          data: {
            name: body.category,
            userId: session.user.id,
          },
        });
        categoryId = newCategory.id;
      }
    }

    // Create or find payment method if provided
    let paymentMethodId = null;
    if (body.paymentMethod) {
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          name: body.paymentMethod,
          userId: session.user.id,
        },
      });

      if (paymentMethod) {
        paymentMethodId = paymentMethod.id;
      } else {
        const newPaymentMethod = await prisma.paymentMethod.create({
          data: {
            name: body.paymentMethod,
            type: body.paymentMethod, // You may want to adjust this
            userId: session.user.id,
          },
        });
        paymentMethodId = newPaymentMethod.id;
      }
    }

    const subscription = await prisma.subscription.create({
      data: {
        name: body.name,
        cost: body.cost,
        billingFrequency: body.billingFrequency,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate) || null,
        notes: body.notes,
        userId: session.user.id,
        categoryId,
        paymentMethodId,
        currency: body.currency,
      },
      include: {
        category: true,
        paymentMethod: true,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
