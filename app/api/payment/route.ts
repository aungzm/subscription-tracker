import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentMethodCreateSchema, formatZodError } from "@/lib/validations";

// GET: List all payment methods for the authenticated user.
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(paymentMethods);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

// POST: Create a new payment method.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    const parseResult = paymentMethodCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 });
    }

    const validatedData = parseResult.data;

    const newPaymentMethod = await prisma.paymentMethod.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        lastFour: validatedData.lastFour || null,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(newPaymentMethod);
  } catch (error) {
    console.error("Error creating payment method:", error);
    return NextResponse.json(
      { error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}
