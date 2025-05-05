import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function validateProviderFields(body: any) {
  const hasSmtp =
    body.smtpServer || body.smtpPort || body.smtpUser || body.smtpPassword;
  const hasWebhook = body.webhookUrl || body.webhookSecret;
  if (hasSmtp && hasWebhook) {
    return "Provide either SMTP or Webhook configuration, not both.";
  }
  return null;
}

// GET: Get a single Notification Provider by id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const validationError = validateProviderFields(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    // Verify ownership
    const existing = await prisma.notificationProvider.findUnique({
      where: { id: params.id },
    });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data: any = {
      name: body.name,
      type: body.type,
      subscriptionId: body.subscriptionId,
      smtpServer: body.smtpServer !== undefined ? body.smtpServer : null,
      smtpPort: body.smtpPort !== undefined ? body.smtpPort : null,
      smtpUser: body.smtpUser !== undefined ? body.smtpUser : null,
      smtpPassword: body.smtpPassword !== undefined ? body.smtpPassword : null,
      webhookUrl: body.webhookUrl !== undefined ? body.webhookUrl : null,
      webhookSecret: body.webhookSecret !== undefined ? body.webhookSecret : null,
    };
    const updated = await prisma.notificationProvider.update({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
