import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const providerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["EMAIL", "PUSH"]),
  smtpServer: z.string().optional().nullable(),
  smtpPort: z.number().optional().nullable(),
  smtpUser: z.string().optional().nullable(),
  smtpPassword: z.string().optional().nullable(),
  webhookUrl: z.string().url().optional().nullable(),
  webhookSecret: z.string().optional().nullable(),
  message: z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
});

export type ProviderData = z.infer<typeof providerSchema>;

export async function sendEmail(provider: ProviderData) {
  if (
    !provider.smtpServer ||
    !provider.smtpPort ||
    !provider.smtpUser ||
    !provider.smtpPassword
  ) {
    throw new Error("Missing SMTP configuration");
  }
  return true;
}

export async function sendWebhook(provider: ProviderData) {
  if (!provider.webhookUrl) {
    throw new Error("Missing webhook URL for PUSH notification");
  }

  const discordPayload = {
    embeds: [
      {
        title: provider.message.subject,
        description: provider.message.body,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const res = await fetch(provider.webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(discordPayload),
  });

  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(
      `Webhook responded with status ${res.status}: ${responseBody || res.statusText}`
    );
  }

  return true;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = providerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "Invalid provider data",
          errors: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const provider = parseResult.data;

    if (provider.type === "EMAIL") {
      await sendEmail(provider);
    } else if (provider.type === "PUSH") {
      if (!provider.webhookUrl) {
        return NextResponse.json(
          { message: "Webhook URL is required for PUSH notifications" },
          { status: 400 }
        );
      }
      await sendWebhook(provider);
    } else {
      return NextResponse.json(
        { message: "Unknown provider type" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Notification test via ${provider.type} sent successfully.`,
    });
  } catch (error: any) {
    let errorMessage = "Failed to test notification provider";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
