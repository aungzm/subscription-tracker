import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscriptionUpdateSchema, formatZodError } from "@/lib/validations";

// GET a single subscription by id
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params.id;

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: session.user.id },
      include: {
        category: { select: { id: true, name: true } },
        paymentMethod: { select: { id: true, name: true } },
        reminders: {
          select: {
            id: true,
            reminderDate: true,
            preset: true,
            daysBefore: true,
            nextSendAt: true,
            notificationProviders: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
      );
    }

    // Destructure to exclude categoryId and paymentMethodId
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { categoryId, paymentMethodId, ...rest } = subscription;

    return NextResponse.json({
      ...rest,
      category: subscription.category?.id ?? null,
      categoryName: subscription.category?.name ?? null,
      paymentMethod: subscription.paymentMethod?.id ?? null,
      paymentMethodName: subscription.paymentMethod?.name ?? null,
      reminders: subscription.reminders.map(reminder => ({
        id: reminder.id,
        date: reminder.reminderDate,
        preset: reminder.preset,
        daysBefore: reminder.daysBefore,
        nextSendAt: reminder.nextSendAt,
        providers: reminder.notificationProviders.map(provider => provider.id),
        providerNames: reminder.notificationProviders.map(provider => provider.name),
      })),
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// PUT to update an existing subscription by id
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const hasEndDate = Object.prototype.hasOwnProperty.call(body, "endDate");

    const parseResult = subscriptionUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 });
    }

    const validatedData = parseResult.data;

    // Ensure the subscription belongs to the current user
    const existing = await prisma.subscription.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Verify category / paymentMethod ownership if provided
    if (validatedData.category) {
      const owned = await prisma.category.findFirst({
        where: { id: validatedData.category, userId: session.user.id },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }
    if (validatedData.paymentMethod) {
      const owned = await prisma.paymentMethod.findFirst({
        where: { id: validatedData.paymentMethod, userId: session.user.id },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json(
          { error: "Invalid payment method" },
          { status: 400 }
        );
      }
    }

    const endDate = hasEndDate
      ? validatedData.endDate === null || validatedData.endDate === undefined
        ? null
        : new Date(validatedData.endDate)
      : existing.endDate;

    const updated = await prisma.subscription.update({
      where: { id, userId: session.user.id },
      data: {
        name: validatedData.name ?? existing.name,
        cost: validatedData.cost ?? existing.cost,
        billingFrequency: validatedData.billingFrequency ?? existing.billingFrequency,
        startDate: validatedData.startDate
          ? new Date(validatedData.startDate)
          : existing.startDate,
        endDate,
        notes: validatedData.notes ?? existing.notes,
        currency: validatedData.currency ?? existing.currency,
        categoryId: validatedData.category ?? existing.categoryId,
        paymentMethodId: validatedData.paymentMethod ?? existing.paymentMethodId
      },
      include: {
        category: true,
        paymentMethod: true,
      },
    });

    revalidateTag("dashboard");
    revalidateTag("analytics");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

// DELETE a subscription by id
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params.id;

    // Ensure the subscription belongs to the current user
    const existing = await prisma.subscription.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    await prisma.subscription.delete({
      where: { id, userId: session.user.id },
    });

    revalidateTag("dashboard");
    revalidateTag("analytics");
    return NextResponse.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}

