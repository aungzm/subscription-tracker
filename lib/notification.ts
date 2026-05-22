import { assertSafeWebhookUrl } from "@/lib/webhook-url"

export type NotificationMessage = {
  subject: string
  body: string
}

export type DeliveryResult = {
  ok: true
  status: number
  statusText: string
  target: string
  responsePreview: string | null
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

function getTargetHost(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function isDiscordWebhook(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname === "discord.com" || parsed.hostname.endsWith(".discord.com")
  } catch {
    return false
  }
}

function buildWebhookPayload(input: WebhookNotificationInput) {
  if (input.webhookUrl && isDiscordWebhook(input.webhookUrl)) {
    return {
      content: `${input.message.subject}\n${input.message.body}`,
      embeds: [
        {
          title: input.message.subject,
          description: input.message.body,
          timestamp: new Date().toISOString(),
        },
      ],
    }
  }

  return {
    source: "subscription-tracker",
    event: "notification.test",
    subject: input.message.subject,
    body: input.message.body,
    timestamp: new Date().toISOString(),
  }
}

async function readResponsePreview(res: Response) {
  const responseBody = await res.text()
  const trimmed = responseBody.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 300) : null
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

  const responsePreview = await readResponsePreview(res)

  if (!res.ok) {
    throw new Error(
      `Resend responded with status ${res.status}: ${responsePreview || res.statusText}`
    )
  }

  return {
    ok: true,
    status: res.status,
    statusText: res.statusText,
    target: input.to,
    responsePreview,
  } satisfies DeliveryResult
}

export async function sendWebhook(input: WebhookNotificationInput) {
  if (!input.webhookUrl) {
    throw new Error("Missing webhook URL for PUSH notification")
  }

  assertSafeWebhookUrl(input.webhookUrl)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "subscription-tracker/1.0",
  }

  if (input.webhookSecret) {
    headers["X-Webhook-Secret"] = input.webhookSecret
  }

  const res = await fetch(input.webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(buildWebhookPayload(input)),
    redirect: "manual",
    signal: AbortSignal.timeout(5_000),
  })

  const responsePreview = await readResponsePreview(res)

  if (!res.ok) {
    throw new Error(
      `Webhook responded with status ${res.status}: ${responsePreview || res.statusText}`
    )
  }

  return {
    ok: true,
    status: res.status,
    statusText: res.statusText,
    target: getTargetHost(input.webhookUrl),
    responsePreview,
  } satisfies DeliveryResult
}
