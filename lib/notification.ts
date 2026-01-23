import { z } from "zod";

export const providerSchema = z.object({
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
