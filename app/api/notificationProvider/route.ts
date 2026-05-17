import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notificationProviderCreateSchema, formatZodError } from "@/lib/validations";

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
    return NextResponse.json(providers.map(serializeProvider));
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

    const data =
      validatedData.type === "EMAIL"
        ? {
            name: validatedData.name,
            type: validatedData.type,
            userId: session.user.id,
            smtpServer: null,
            smtpPort: null,
            smtpUser: validatedData.email,
            smtpPassword: null,
            webhookUrl: null,
            webhookSecret: null,
          }
        : {
            name: validatedData.name,
            type: validatedData.type,
            userId: session.user.id,
            smtpServer: null,
            smtpPort: null,
            smtpUser: null,
            smtpPassword: null,
            webhookUrl: validatedData.webhookUrl,
            webhookSecret: validatedData.webhookSecret || null,
          };
    const provider = await prisma.notificationProvider.create({
      data,
    });
    return NextResponse.json(serializeProvider(provider));
  } catch (error) {
    console.error("Error creating notification provider:", error);
    return NextResponse.json(
      { error: "Failed to create notification provider" },
      { status: 500 }
    );
  }
}
