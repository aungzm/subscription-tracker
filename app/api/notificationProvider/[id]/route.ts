import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notificationProviderUpdateSchema, formatZodError } from "@/lib/validations";

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
    return NextResponse.json(provider);
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
    const data = {
      name: validatedData.name,
      type: validatedData.type,
      smtpServer: validatedData.smtpServer !== undefined ? validatedData.smtpServer : null,
      smtpPort: validatedData.smtpPort !== undefined ? validatedData.smtpPort : null,
      smtpUser: validatedData.smtpUser !== undefined ? validatedData.smtpUser : null,
      smtpPassword: validatedData.smtpPassword !== undefined ? validatedData.smtpPassword : null,
      webhookUrl: validatedData.webhookUrl !== undefined ? validatedData.webhookUrl : null,
      webhookSecret: validatedData.webhookSecret !== undefined ? validatedData.webhookSecret : null,
    };
    const updated = await prisma.notificationProvider.update({
      where: { id: params.id, userId: session.user.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating notification provider:", error);
    return NextResponse.json(
      { error: "Failed to update notification provider" },
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
      where: { id: params.id, userId: session.user.id },
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
