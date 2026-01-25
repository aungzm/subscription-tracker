import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notificationProviderCreateSchema, formatZodError } from "@/lib/validations";

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

    const parseResult = notificationProviderCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 });
    }

    const validatedData = parseResult.data;

    const data = {
      name: validatedData.name,
      type: validatedData.type,
      userId: session.user.id,
      smtpServer: validatedData.smtpServer || null,
      smtpPort: validatedData.smtpPort || null,
      smtpUser: validatedData.smtpUser || null,
      smtpPassword: validatedData.smtpPassword || null,
      webhookUrl: validatedData.webhookUrl || null,
      webhookSecret: validatedData.webhookSecret || null,
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
