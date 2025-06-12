import { GET, PUT, DELETE } from "@/app/api/notificationProvider/[id]/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  USER_IDS,
  NOTIFICATION_PROVIDER_IDS,
} from "../../prisma/test-ids";
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

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Notification Providers [id]", () => {
  const aliceId = USER_IDS.ALICE;
  const bobId = USER_IDS.BOB;
  const aliceEmailId = NOTIFICATION_PROVIDER_IDS.ALICE_EMAIL;
  const alicePushId = NOTIFICATION_PROVIDER_IDS.ALICE_PUSH;
  const bobEmailId = NOTIFICATION_PROVIDER_IDS.BOB_EMAIL;

  const aliceSession = {
    user: { id: aliceId, name: "Alice", email: "alice@example.com", image: null },
    expires: "2099-12-31T23:59:59.999Z",
  };
  const bobSession = {
    user: { id: bobId, name: "Bob", email: "bob@example.com", image: null },
    expires: "2099-12-31T23:59:59.999Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(aliceSession);
  });

  describe("GET /api/notification-providers/[id]", () => {
    it("401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(
        `http://localhost/api/notification-providers/${aliceEmailId}`
      );
      const ctx = { params: { id: aliceEmailId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("404 when not found", async () => {
      jest
        .spyOn(prisma.notificationProvider, "findUnique")
        .mockResolvedValueOnce(null);
      const req = new Request(
        `http://localhost/api/notification-providers/nonexistent`
      );
      const ctx = { params: { id: "nonexistent" } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Not found" });
    });

    it("404 when belongs to another user", async () => {
      // Alice session tries Bob's provider
      const req = new Request(
        `http://localhost/api/notification-providers/${bobEmailId}`
      );
      const ctx = { params: { id: bobEmailId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Not found" });
    });

    it("500 on DB error", async () => {
      jest
        .spyOn(prisma.notificationProvider, "findUnique")
        .mockRejectedValueOnce(new Error("DB fail"));
      const req = new Request(
        `http://localhost/api/notification-providers/${aliceEmailId}`
      );
      const ctx = { params: { id: aliceEmailId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to fetch notification provider" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to fetch notification provider" });
    });

    it("returns provider for authorized user", async () => {
      const req = new Request(
        `http://localhost/api/notification-providers/${aliceEmailId}`
      );
      const ctx = { params: { id: aliceEmailId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<NotificationProvider>;
      expect(res.body).toMatchObject({
        id: aliceEmailId,
        userId: aliceId,
        name: expect.any(String),
        type: "EMAIL",
      });
      // smtp fields should be present
      expect(res.body.smtpServer).toBeDefined();
      expect(res.body.webhookUrl).toBeNull();
    });
  });

  describe("PUT /api/notification-providers/[id]", () => {
    const baseUrl = `http://localhost/api/notification-providers/${alicePushId}`;
    const makeReq = (body: any) =>
      new Request(baseUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    it("401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await PUT(makeReq({}), { params: Promise.resolve({ id: alicePushId }) })) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("400 on validation error (both SMTP & Webhook)", async () => {
      const body = {
        name: "Bad",
        type: "EMAIL",
        smtpServer: "s",
        webhookUrl: "w",
      };
      const res = (await PUT(makeReq(body), { params: Promise.resolve({ id: alicePushId }) })) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Provide either SMTP or Webhook configuration, not both." },
        { status: 400 }
      );
    });

    it("404 when not found / not owner", async () => {
      jest
        .spyOn(prisma.notificationProvider, "findUnique")
        .mockResolvedValueOnce(null);
      const res = (await PUT(makeReq({ name: "X", type: "PUSH" }), { params: Promise.resolve({ id: alicePushId }) })) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      );
    });

    it("500 on DB update failure", async () => {
      const spyFind = jest
        .spyOn(prisma.notificationProvider, "findUnique")
        .mockResolvedValueOnce({
          id: alicePushId,
          userId: aliceId,
          name: "Alice Push",
          type: "PUSH",
          smtpServer: null,
          smtpPort: null,
          smtpUser: null,
          smtpPassword: null,
          webhookUrl: "https://push.alice.com",
          webhookSecret: "secret",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      jest
        .spyOn(prisma.notificationProvider, "update")
        .mockRejectedValueOnce(new Error("Update fail"));
      const res = (await PUT(makeReq({ name: "New", type: "PUSH" }), { params: Promise.resolve({ id: alicePushId }) })) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to update notification provider" },
        { status: 500 }
      );
      spyFind.mockRestore();
    });

    it("updates SMTP‐only provider", async () => {
      // first ensure owner record comes back
      const existing = await prisma.notificationProvider.findUnique({
        where: { id: aliceEmailId },
      });
      const body = {
        name: "SMTP Only",
        type: "EMAIL",
        smtpServer: "smtp.new.com",
        smtpPort: 2525,
        smtpUser: "u",
        smtpPassword: "p",
      };
      const res = (await PUT(makeReq(body), { params: Promise.resolve({ id: aliceEmailId }) })) as unknown as ApiResponse<NotificationProvider>;
      expect(res.body).toMatchObject({
        id: aliceEmailId,
        userId: aliceId,
        name: "SMTP Only",
        type: "EMAIL",
        smtpServer: "smtp.new.com",
        smtpPort: 2525,
        smtpUser: "u",
        smtpPassword: "p",
        webhookUrl: null,
        webhookSecret: null,
      });
      // persisted?
      const dbRec = await prisma.notificationProvider.findUnique({
        where: { id: aliceEmailId },
      });
      expect(dbRec).toMatchObject({
        name: "SMTP Only",
        smtpServer: "smtp.new.com",
        webhookUrl: null,
      });
    });

    it("updates Webhook‐only provider", async () => {
      const body = {
        name: "Webhook Only",
        type: "PUSH",
        webhookUrl: "https://new.webhook/",
        webhookSecret: "abc123",
      };
      const res = (await PUT(makeReq(body), { params: Promise.resolve({ id: alicePushId }) })) as unknown as ApiResponse<NotificationProvider>;
      expect(res.body).toMatchObject({
        id: alicePushId,
        userId: aliceId,
        name: "Webhook Only",
        type: "PUSH",
        smtpServer: null,
        smtpPort: null,
        webhookUrl: "https://new.webhook/",
        webhookSecret: "abc123",
      });
      const dbRec = await prisma.notificationProvider.findUnique({
        where: { id: alicePushId },
      });
      expect(dbRec).toMatchObject({
        name: "Webhook Only",
        webhookUrl: "https://new.webhook/",
        smtpUser: null,
      });
    });
  });

  describe("DELETE /api/notification-providers/[id]", () => {
    it("401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(
        `http://localhost/api/notification-providers/${aliceEmailId}`
      );
      const ctx = { params: { id: aliceEmailId } };
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("404 when not found / not owner", async () => {
      jest
        .spyOn(prisma.notificationProvider, "findUnique")
        .mockResolvedValueOnce(null);
      const req = new Request(
        `http://localhost/api/notification-providers/${aliceEmailId}`
      );
      const ctx = { params: { id: aliceEmailId } };
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Not found" },
        { status: 404 }
      );
    });

    it("500 on DB delete failure", async () => {
      const spyFind = jest
        .spyOn(prisma.notificationProvider, "findUnique")
        .mockResolvedValueOnce({
          id: aliceEmailId,
          userId: aliceId,
        } as any);
      jest
        .spyOn(prisma.notificationProvider, "delete")
        .mockRejectedValueOnce(new Error("Delete fail"));
      const req = new Request(
        `http://localhost/api/notification-providers/${aliceEmailId}`
      );
      const ctx = { params: { id: aliceEmailId } };
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to delete notification provider" },
        { status: 500 }
      );
      spyFind.mockRestore();
    });

    it("deletes and returns success message", async () => {
      const req = new Request(
        `http://localhost/api/notification-providers/${alicePushId}`
      );
      const ctx = { params: { id: alicePushId } };
      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ message: string }>;
      expect(res.body).toEqual({ message: "Notification provider deleted" });
      // verify deletion in DB
      const gone = await prisma.notificationProvider.findUnique({
        where: { id: alicePushId },
      });
      expect(gone).toBeNull();
    });
  });
});