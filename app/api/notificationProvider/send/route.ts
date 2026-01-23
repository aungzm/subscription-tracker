import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { providerSchema, sendEmail, sendWebhook } from "@/lib/notification";

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
