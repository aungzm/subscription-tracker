export type NotificationMessage = {
  subject: string
  body: string
}

export type EmailNotificationInput = {
  type: "EMAIL"
  to: string
  message: NotificationMessage
}

export type WebhookNotificationInput = {
  type: "PUSH"
  webhookUrl?: string | null
  webhookSecret?: string | null
  message: NotificationMessage
}

export type ProviderData = {
  name: string
  type: "EMAIL" | "PUSH"
  webhookUrl?: string | null
  webhookSecret?: string | null
  email?: string | null
  message: NotificationMessage
}

export async function sendEmail(input: EmailNotificationInput) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    throw new Error("Missing Resend configuration")
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.message.subject,
      text: input.message.body,
    }),
  })

  if (!res.ok) {
    const responseBody = await res.text()
    throw new Error(
      `Resend responded with status ${res.status}: ${responseBody || res.statusText}`
    )
  }

  return true
}

export async function sendWebhook(input: WebhookNotificationInput) {
  if (!input.webhookUrl) {
    throw new Error("Missing webhook URL for PUSH notification")
  }

  const discordPayload = {
    embeds: [
      {
        title: input.message.subject,
        description: input.message.body,
        timestamp: new Date().toISOString(),
      },
    ],
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (input.webhookSecret) {
    headers["X-Webhook-Secret"] = input.webhookSecret
  }

  const res = await fetch(input.webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(discordPayload),
  })

  if (!res.ok) {
    const responseBody = await res.text()
    throw new Error(
      `Webhook responded with status ${res.status}: ${responseBody || res.statusText}`
    )
  }

  return true
}
