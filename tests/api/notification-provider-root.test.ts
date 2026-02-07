// tests/api/notificationProviderRoot.test.ts

import { GET, POST } from "@/app/api/notificationProvider/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { USER_IDS, NOTIFICATION_PROVIDER_IDS } from "../../prisma/test-ids";
import { createMockNotificationProvider } from "../factories";
import type { NotificationProvider } from "@prisma/client";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedNextJson = NextResponse.json as unknown as jest.MockedFunction<
  <T>(body: T, init?: { status: number }) => { body: T; init?: { status: number } }
>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Notification Providers Root", () => {
  const aliceId = USER_IDS.ALICE;
  const session = {
    user: {
      id: aliceId,
      name: "Alice Test",
      email: "alice@test.com",
      image: null,
    },
    expires: "2099-12-31T23:59:59.999Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(session);
  });

  // ─── GET /api/notificationProvider ───────────────────────────────────

  describe("GET /api/notificationProvider", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await GET()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.notificationProvider.findMany.mockRejectedValueOnce(
        new Error("DB failure")
      );
      const res = (await GET()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({
        error: "Failed to fetch notification providers",
      });
      expect(res.init).toEqual({ status: 500 });
    });

    it("returns providers ordered by createdAt desc", async () => {
      const now = new Date();
      const provider1 = createMockNotificationProvider({
        id: NOTIFICATION_PROVIDER_IDS.ALICE_EMAIL,
        name: "Alice Email",
        type: "EMAIL",
        createdAt: now,
      });
      const provider2 = createMockNotificationProvider({
        id: NOTIFICATION_PROVIDER_IDS.ALICE_PUSH,
        name: "Alice Push",
        type: "PUSH",
        smtpServer: null,
        smtpPort: null,
        smtpUser: null,
        smtpPassword: null,
        webhookUrl: "https://push.example.com",
        webhookSecret: "secret",
        createdAt: new Date(now.getTime() - 1000),
      });
      mockedPrisma.notificationProvider.findMany.mockResolvedValueOnce([
        provider1,
        provider2,
      ]);

      const res = (await GET()) as unknown as ApiResponse<NotificationProvider[]>;

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toMatchObject({
        id: NOTIFICATION_PROVIDER_IDS.ALICE_EMAIL,
        name: "Alice Email",
        type: "EMAIL",
      });
      expect(res.body[1]).toMatchObject({
        id: NOTIFICATION_PROVIDER_IDS.ALICE_PUSH,
        name: "Alice Push",
        type: "PUSH",
      });

      expect(mockedPrisma.notificationProvider.findMany).toHaveBeenCalledWith({
        where: { userId: aliceId },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  // ─── POST /api/notificationProvider ──────────────────────────────────

  describe("POST /api/notificationProvider", () => {
    function makeRequest(body: Record<string, any>) {
      return new Request("http://localhost/api/notificationProvider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await POST(
        makeRequest({ name: "Test", type: "EMAIL" })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 400 when both SMTP and webhook are provided", async () => {
      const res = (await POST(
        makeRequest({
          name: "Bad",
          type: "EMAIL",
          smtpServer: "smtp.example.com",
          webhookUrl: "https://hook.example.com",
        })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.init).toEqual({ status: 400 });
    });

    it("creates EMAIL provider with SMTP config", async () => {
      const smtpBody = {
        name: "My Email",
        type: "EMAIL",
        smtpServer: "smtp.example.com",
        smtpPort: 587,
        smtpUser: "user@example.com",
        smtpPassword: "pass",
      };
      const created = createMockNotificationProvider({
        id: "new-provider-id",
        name: "My Email",
        type: "EMAIL",
        smtpServer: "smtp.example.com",
        smtpPort: 587,
        smtpUser: "user@example.com",
        smtpPassword: "pass",
        webhookUrl: null,
        webhookSecret: null,
      });
      mockedPrisma.notificationProvider.create.mockResolvedValueOnce(created);

      const res = (await POST(
        makeRequest(smtpBody)
      )) as unknown as ApiResponse<NotificationProvider>;

      expect(res.body).toMatchObject({
        name: "My Email",
        type: "EMAIL",
        smtpServer: "smtp.example.com",
        smtpPort: 587,
        userId: aliceId,
      });

      expect(mockedPrisma.notificationProvider.create).toHaveBeenCalledWith({
        data: {
          name: "My Email",
          type: "EMAIL",
          userId: aliceId,
          smtpServer: "smtp.example.com",
          smtpPort: 587,
          smtpUser: "user@example.com",
          smtpPassword: "pass",
          webhookUrl: null,
          webhookSecret: null,
        },
      });
    });

    it("creates PUSH provider with webhook config", async () => {
      const webhookBody = {
        name: "My Push",
        type: "PUSH",
        webhookUrl: "https://push.example.com/hook",
        webhookSecret: "secret123",
      };
      const created = createMockNotificationProvider({
        id: "new-push-id",
        name: "My Push",
        type: "PUSH",
        smtpServer: null,
        smtpPort: null,
        smtpUser: null,
        smtpPassword: null,
        webhookUrl: "https://push.example.com/hook",
        webhookSecret: "secret123",
      });
      mockedPrisma.notificationProvider.create.mockResolvedValueOnce(created);

      const res = (await POST(
        makeRequest(webhookBody)
      )) as unknown as ApiResponse<NotificationProvider>;

      expect(res.body).toMatchObject({
        name: "My Push",
        type: "PUSH",
        webhookUrl: "https://push.example.com/hook",
        userId: aliceId,
      });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.notificationProvider.create.mockRejectedValueOnce(
        new Error("DB failure")
      );
      const res = (await POST(
        makeRequest({ name: "Test", type: "EMAIL" })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({
        error: "Failed to create notification provider",
      });
      expect(res.init).toEqual({ status: 500 });
    });
  });
});
