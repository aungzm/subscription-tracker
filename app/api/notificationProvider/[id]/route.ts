import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notificationProviderUpdateSchema, formatZodError } from "@/lib/validations";
import { Prisma } from "@prisma/client";

function serializeProvider(provider: {
  id: string
  name: string
  type: "EMAIL" | "PUSH"
  webhookUrl: string | null
  webhookSecret: string | null
  smtpUser: string | null
  createdAt: Date
  updatedAt: Date
  userId: string
}) {
  return {
    ...provider,
    email: provider.type === "EMAIL" ? provider.smtpUser : null,
  };
}

function getProviderErrorMessage(error: unknown, fallback: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "You already have a notification provider with that name."
  }

  return fallback
}

// GET: Get a single Notification Provider by id
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
    const provider = await prisma.notificationProvider.findUnique({
      where: { id: params.id }
    });
    if (!provider || provider.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serializeProvider(provider));
  } catch (error) {
    console.error("Error fetching notification provider:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification provider" },
      { status: 500 }
    );
  }
}

// PUT: Update an existing Notification Provider by id
export async function PUT(
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

    const parseResult = notificationProviderUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 });
    }

    const validatedData = parseResult.data;

    // Verify ownership
    const existing = await prisma.notificationProvider.findUnique({
      where: { id: params.id },
    });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data =
      validatedData.type === "EMAIL"
        ? {
            name: validatedData.name,
            type: validatedData.type,
            smtpUser: validatedData.email,
            webhookUrl: null,
            webhookSecret: null,
          }
        : {
            name: validatedData.name,
            type: validatedData.type,
            smtpUser: null,
            webhookUrl: validatedData.webhookUrl,
            webhookSecret: validatedData.webhookSecret || null,
          };
    const updated = await prisma.notificationProvider.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(serializeProvider(updated));
  } catch (error) {
    console.error("Error updating notification provider:", error);
    return NextResponse.json(
      { error: getProviderErrorMessage(error, "Failed to update notification provider") },
      { status: 500 }
    );
  }
}

// DELETE: Remove a Notification Provider by id
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
    // Verify ownership
    const provider = await prisma.notificationProvider.findUnique({
      where: { id: params.id },
    });
    if (!provider || provider.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.notificationProvider.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: "Notification provider deleted" });
  } catch (error) {
    console.error("Error deleting notification provider:", error);
    return NextResponse.json(
      { error: "Failed to delete notification provider" },
      { status: 500 }
    );
  }
}
