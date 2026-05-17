import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail, sendWebhook } from "@/lib/notification";
import { sendNotificationSchema, formatZodError } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = sendNotificationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(formatZodError(parseResult.error), { status: 400 });
    }

    const provider = parseResult.data;
    let result:
      | { ok: true; status: number; statusText: string; target: string; responsePreview: string | null }
      | undefined

    if (provider.type === "EMAIL") {
      if (!provider.email) {
        return NextResponse.json(
          { message: "Email address is required for email notifications" },
          { status: 400 }
        );
      }

      result = await sendEmail({
        type: "EMAIL",
        to: provider.email,
        message: provider.message,
      });
    } else if (provider.type === "PUSH") {
      if (!provider.webhookUrl) {
        return NextResponse.json(
          { message: "Webhook URL is required for PUSH notifications" },
          { status: 400 }
        );
      }
      result = await sendWebhook({
        type: "PUSH",
        webhookUrl: provider.webhookUrl,
        webhookSecret: provider.webhookSecret,
        message: provider.message,
      });
    } else {
      return NextResponse.json(
        { message: "Unknown provider type" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        provider.type === "EMAIL"
          ? `Email test accepted for ${result?.target}.`
          : `Webhook test accepted by ${result?.target}.`,
      delivery: result,
    });
  } catch (error: unknown) {
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
