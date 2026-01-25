import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentMethodUpdateSchema, formatZodError } from "@/lib/validations";

// GET: Get a single payment method by id
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(paymentMethod);
  } catch (error) {
    console.error("Error fetching payment method:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment method" },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing payment method by id
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await context.params;
    const body = await request.json();

    const parseResult = paymentMethodUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 });
    }

    const validatedData = parseResult.data;

    // Ensure the payment method belongs to the current user.
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // Prepare update data only for defined fields.
    const updateData: { [key: string]: any } = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.lastFour !== undefined) updateData.lastFour = validatedData.lastFour;
    if (validatedData.expiryDate !== undefined) {
      updateData.expiryDate = validatedData.expiryDate ? new Date(validatedData.expiryDate) : null;
    }

    const updatedPaymentMethod = await prisma.paymentMethod.update({
      where: { id: params.id, userId: session.user.id },
      data: updateData,
    });

    return NextResponse.json(updatedPaymentMethod);
  } catch (error) {
    console.error("Error updating payment method:", error);
    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a payment method by id
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    // Ensure the payment method belongs to the current user.
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    await prisma.paymentMethod.delete({
      where: { id: params.id, userId: session.user.id },
    });

    return NextResponse.json({
      message: "Payment method deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
