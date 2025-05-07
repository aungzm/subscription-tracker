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
    message: z
        .object({
            subject: z.string().min(1),
            body: z.string().min(1),
        })
});

async function sendEmail(provider: any) {
    // Dummy implementation: Replace with actual SMTP logic
    if (!provider.smtpServer || !provider.smtpPort || !provider.smtpUser || !provider.smtpPassword) {
        throw new Error("Missing SMTP configuration");
    }
    // Simulate sending email
    return true;
}

async function sendWebhook(provider: any) {
    if (!provider.webhookUrl) {
      throw new Error("Missing webhook URL");
    }
  
    // Use the subject and body from the message object
    const payload = {
      subject: provider.message.subject,
      body: provider.message.body,
      timestamp: new Date().toISOString(),
    };
  
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (provider.webhookSecret) {
      headers["X-Webhook-Secret"] = provider.webhookSecret;
    }
  
    const res = await fetch(provider.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Webhook responded with status ${res.status}: ${text || res.statusText}`
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
                { message: "Invalid provider data", errors: parseResult.error.flatten() },
                { status: 400 }
            );
        }

        const provider = parseResult.data;

        if (provider.type === "EMAIL") {
            await sendEmail(provider);
        } else if (provider.type === "PUSH") {
            await sendWebhook(provider);
        } else {
            return NextResponse.json({ message: "Unknown provider type" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error testing notification provider:", error);
        return NextResponse.json(
            { message: error.message || "Failed to test notification provider" },
            { status: 500 }
        );
    }
}