import { POST } from "@/app/api/notificationProvider/send/route"
import { sendWebhook, sendEmail } from "@/lib/notification"
import type { ProviderData } from "@/lib/notification"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import type { ExtendedSession } from "@/lib/auth"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("next/server", () => ({
  NextResponse: { json: jest.fn((body, init) => ({ body, init })) },
}))

const mockedAuth = auth as jest.MockedFunction<typeof auth>

describe("sendWebhook()", () => {
  let fetchSpy: jest.SpyInstance

  const baseProvider: ProviderData = {
    name: "Test Push",
    type: "PUSH",
    webhookUrl: "https://example.com/hook",
    webhookSecret: "secret",
    message: {
      subject: "Hello",
      body: "World",
    },
  }

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it("throws if webhookUrl is null", async () => {
    await expect(
      sendWebhook({
        type: "PUSH",
        webhookUrl: null,
        message: baseProvider.message,
      })
    ).rejects.toThrow("Missing webhook URL for PUSH notification")
  })

  it("throws when fetch returns non-OK", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      text: () => Promise.resolve("Oops"),
    } as never)

    await expect(
      sendWebhook({
        type: "PUSH",
        webhookUrl: baseProvider.webhookUrl,
        webhookSecret: baseProvider.webhookSecret,
        message: baseProvider.message,
      })
    ).rejects.toThrow("Webhook responded with status 502: Oops")
  })

  it("resolves to true when fetch.ok === true", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true } as never)
    await expect(
      sendWebhook({
        type: "PUSH",
        webhookUrl: baseProvider.webhookUrl,
        webhookSecret: baseProvider.webhookSecret,
        message: baseProvider.message,
      })
    ).resolves.toBe(true)
  })
})

describe("sendEmail()", () => {
  const originalEnv = process.env
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: "resend_test_key",
      EMAIL_FROM: "hello@example.com",
    }
    fetchSpy = jest.spyOn(global, "fetch")
  })

  afterEach(() => {
    process.env = originalEnv
    fetchSpy.mockRestore()
  })

  it("throws if resend configuration is missing", async () => {
    delete process.env.RESEND_API_KEY

    await expect(
      sendEmail({
        type: "EMAIL",
        to: "user@example.com",
        message: { subject: "S", body: "B" },
      })
    ).rejects.toThrow("Missing Resend configuration")
  })

  it("resolves true when resend accepts the request", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true } as never)

    await expect(
      sendEmail({
        type: "EMAIL",
        to: "user@example.com",
        message: { subject: "S", body: "B" },
      })
    ).resolves.toBe(true)
  })
})

describe("POST /api/notification-providers/test", () => {
  const goodPush = {
    name: "PushTest",
    type: "PUSH" as const,
    webhookUrl: "https://example.com/hook",
    webhookSecret: "sec",
    message: { subject: "Sub", body: "Body" },
  }

  const fakeSession: ExtendedSession = {
    user: {
      id: "user1",
      name: "Test",
      email: "test@example.com",
      image: null,
    },
    expires: "2100-01-01T00:00:00.000Z",
  }

  let fetchSpy: jest.SpyInstance
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue(fakeSession)
    fetchSpy = jest.spyOn(global, "fetch")
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: "resend_test_key",
      EMAIL_FROM: "hello@example.com",
    }
  })

  afterEach(() => {
    process.env = originalEnv
    fetchSpy.mockRestore()
  })

  it("401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null)
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify(goodPush),
    })
    const res = (await POST(req)) as any
    expect(res.body).toEqual({ message: "Unauthorized" })
    expect(res.init).toEqual({ status: 401 })
  })

  it("400 on invalid schema", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const res = (await POST(req)) as any
    expect(res.init).toEqual({ status: 400 })
    expect(res.body.error).toBe("Validation failed")
  })

  it("400 when PUSH but no webhookUrl", async () => {
    const bad = { ...goodPush, webhookUrl: null }
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify(bad),
    })
    const res = (await POST(req)) as any
    expect(res.init).toEqual({ status: 400 })
    expect(res.body.message).toBe(
      "Webhook URL is required for PUSH notifications"
    )
  })

  it("500 when sendWebhook fails", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "ERR",
      text: () => Promise.resolve("uh oh"),
    } as never)

    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify(goodPush),
    })
    const res = (await POST(req)) as any
    expect(res.init).toEqual({ status: 500 })
    expect(res.body.message).toContain("Webhook responded with status 500")
  })

  it("200 when sendWebhook succeeds", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true } as never)
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify(goodPush),
    })
    const res = (await POST(req)) as any
    expect(res.init).toBeUndefined()
    expect(res.body).toEqual({
      success: true,
      message: "Notification test via PUSH sent successfully.",
    })
  })
})
