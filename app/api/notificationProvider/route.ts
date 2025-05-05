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

// GET: List all Notification Providers for the current user.
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const providers = await prisma.notificationProvider.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(providers);
  } catch (error) {
    console.error("Error fetching notification providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification providers" },
      { status: 500 }
    );
  }
}

// POST: Create a new Notification Provider.
export async function POST(request: Request) {
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
    const data: any = {
      subscriptionId: body.subscriptionId,
      name: body.name,
      type: body.type,
      userId: session.user.id,
      smtpServer: body.smtpServer || null,
      smtpPort: body.smtpPort || null,
      smtpUser: body.smtpUser || null,
      smtpPassword: body.smtpPassword || null,
      webhookUrl: body.webhookUrl || null,
      webhookSecret: body.webhookSecret || null,
    };
    const provider = await prisma.notificationProvider.create({
      data,
    });
    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error creating notification provider:", error);
    return NextResponse.json(
      { error: "Failed to create notification provider" },
      { status: 500 }
    );
  }
}
