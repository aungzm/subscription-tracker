import { SendNotificationInput } from "@/lib/validations";

export async function sendEmail(provider: SendNotificationInput) {
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

export async function sendWebhook(provider: SendNotificationInput) {
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
