import { GET, PUT, DELETE } from "@/app/api/notificationProvider/[id]/route"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { DeepMockProxy } from "jest-mock-extended"
import { PrismaClient } from "@prisma/client"
import {
  USER_IDS,
  NOTIFICATION_PROVIDER_IDS,
} from "../../prisma/test-ids"
import { createMockNotificationProvider } from "../factories"
import type { NotificationProvider } from "@prisma/client"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
}))

const mockedAuth = auth as jest.MockedFunction<typeof auth>
const mockedNextJson = NextResponse.json as unknown as jest.MockedFunction<
  <T>(body: T, init?: { status: number }) => { body: T; init?: { status: number } }
>
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>

type ApiResponse<T> = { body: T; init?: { status: number } }

describe("API Integration Tests: Notification Providers [id]", () => {
  const aliceId = USER_IDS.ALICE
  const bobId = USER_IDS.BOB
  const alicePushId = NOTIFICATION_PROVIDER_IDS.ALICE_PUSH
  const bobEmailId = NOTIFICATION_PROVIDER_IDS.BOB_EMAIL

  const aliceSession = {
    user: { id: aliceId, name: "Alice", email: "alice@example.com", image: null },
    expires: "2099-12-31T23:59:59.999Z",
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue(aliceSession)
  })

  describe("GET /api/notification-providers/[id]", () => {
    it("401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null)
      const req = new Request(
        `http://localhost/api/notification-providers/${alicePushId}`
      )
      const ctx = { params: Promise.resolve({ id: alicePushId }) }

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      )
      expect(res.body).toEqual({ error: "Unauthorized" })
      expect(res.init).toEqual({ status: 401 })
    })

    it("404 when not found", async () => {
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(null)
      const req = new Request(
        "http://localhost/api/notification-providers/nonexistent"
      )
      const ctx = { params: Promise.resolve({ id: "nonexistent" }) }

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      )
      expect(res.body).toEqual({ error: "Not found" })
    })

    it("404 when belongs to another user", async () => {
      const bobProvider = createMockNotificationProvider({
        id: bobEmailId,
        userId: bobId,
      })
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(bobProvider)

      const req = new Request(
        `http://localhost/api/notification-providers/${bobEmailId}`
      )
      const ctx = { params: Promise.resolve({ id: bobEmailId }) }

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      )
      expect(res.body).toEqual({ error: "Not found" })
    })

    it("500 on DB error", async () => {
      mockedPrisma.notificationProvider.findUnique.mockRejectedValueOnce(
        new Error("DB fail")
      )
      const req = new Request(
        `http://localhost/api/notification-providers/${alicePushId}`
      )
      const ctx = { params: Promise.resolve({ id: alicePushId }) }

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to fetch notification provider" },
        { status: 500 }
      )
      expect(res.body).toEqual({ error: "Failed to fetch notification provider" })
    })

    it("returns webhook provider for authorized user", async () => {
      const provider = createMockNotificationProvider({
        id: alicePushId,
        name: "Alice Push",
        type: "PUSH",
        smtpUser: null,
        webhookUrl: "https://push.example.com",
      })
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(provider)

      const req = new Request(
        `http://localhost/api/notification-providers/${alicePushId}`
      )
      const ctx = { params: Promise.resolve({ id: alicePushId }) }

      const res = (await GET(req, ctx)) as unknown as ApiResponse<NotificationProvider>
      expect(res.body).toMatchObject({
        id: alicePushId,
        userId: aliceId,
        name: "Alice Push",
        type: "PUSH",
        webhookUrl: "https://push.example.com",
      })
    })
  })

  describe("PUT /api/notification-providers/[id]", () => {
    const baseUrl = `http://localhost/api/notification-providers/${alicePushId}`
    const makeReq = (body: any) =>
      new Request(baseUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

    it("401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null)
      const res = (await PUT(
        makeReq({ name: "Webhook", type: "PUSH", webhookUrl: "https://hook.example.com" }),
        { params: Promise.resolve({ id: alicePushId }) }
      )) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      )
    })

    it("400 on validation error when webhookUrl is missing", async () => {
      const body = {
        name: "Bad",
        type: "PUSH",
      }
      const res = (await PUT(
        makeReq(body),
        { params: Promise.resolve({ id: alicePushId }) }
      )) as unknown as ApiResponse<{ error: string }>
      expect(res.init).toEqual({ status: 400 })
    })

    it("404 when not found / not owner", async () => {
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(null)
      const res = (await PUT(
        makeReq({ name: "X", type: "PUSH", webhookUrl: "https://hook.example.com" }),
        { params: Promise.resolve({ id: alicePushId }) }
      )) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      )
    })

    it("500 on DB update failure", async () => {
      const existingProvider = createMockNotificationProvider({
        id: alicePushId,
        name: "Alice Push",
        type: "PUSH",
        smtpUser: null,
        webhookUrl: "https://push.alice.com",
        webhookSecret: "secret",
      })
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(existingProvider)
      mockedPrisma.notificationProvider.update.mockRejectedValueOnce(new Error("Update fail"))

      const res = (await PUT(
        makeReq({ name: "New", type: "PUSH", webhookUrl: "https://new.webhook/" }),
        { params: Promise.resolve({ id: alicePushId }) }
      )) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to update notification provider" },
        { status: 500 }
      )
    })

    it("updates webhook provider", async () => {
      const existingProvider = createMockNotificationProvider({
        id: alicePushId,
        type: "PUSH",
      })
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(existingProvider)

      const updatedProvider = createMockNotificationProvider({
        id: alicePushId,
        name: "Webhook Only",
        type: "PUSH",
        smtpUser: null,
        webhookUrl: "https://new.webhook/",
        webhookSecret: "abc123",
      })
      mockedPrisma.notificationProvider.update.mockResolvedValueOnce(updatedProvider)

      const body = {
        name: "Webhook Only",
        type: "PUSH",
        webhookUrl: "https://new.webhook/",
        webhookSecret: "abc123",
      }
      const res = (await PUT(
        makeReq(body),
        { params: Promise.resolve({ id: alicePushId }) }
      )) as unknown as ApiResponse<NotificationProvider>
      expect(res.body).toMatchObject({
        id: alicePushId,
        userId: aliceId,
        name: "Webhook Only",
        type: "PUSH",
        webhookUrl: "https://new.webhook/",
        webhookSecret: "abc123",
      })

      expect(mockedPrisma.notificationProvider.update).toHaveBeenCalled()
    })
  })

  describe("DELETE /api/notification-providers/[id]", () => {
    it("401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null)
      const req = new Request(
        `http://localhost/api/notification-providers/${alicePushId}`
      )
      const ctx = { params: Promise.resolve({ id: alicePushId }) }
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      )
    })

    it("404 when not found / not owner", async () => {
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(null)
      const req = new Request(
        `http://localhost/api/notification-providers/${alicePushId}`
      )
      const ctx = { params: Promise.resolve({ id: alicePushId }) }
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      )
    })

    it("500 on DB delete failure", async () => {
      const existingProvider = createMockNotificationProvider({ id: alicePushId })
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(existingProvider)
      mockedPrisma.notificationProvider.delete.mockRejectedValueOnce(new Error("Delete fail"))

      const req = new Request(
        `http://localhost/api/notification-providers/${alicePushId}`
      )
      const ctx = { params: Promise.resolve({ id: alicePushId }) }
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to delete notification provider" },
        { status: 500 }
      )
    })

    it("deletes and returns success message", async () => {
      const existingProvider = createMockNotificationProvider({ id: alicePushId })
      mockedPrisma.notificationProvider.findUnique.mockResolvedValueOnce(existingProvider)
      mockedPrisma.notificationProvider.delete.mockResolvedValueOnce(existingProvider)

      const req = new Request(
        `http://localhost/api/notification-providers/${alicePushId}`
      )
      const ctx = { params: Promise.resolve({ id: alicePushId }) }
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ message: string }>
      expect(res.body).toEqual({ message: "Notification provider deleted" })

      expect(mockedPrisma.notificationProvider.delete).toHaveBeenCalled()
    })
  })
})
