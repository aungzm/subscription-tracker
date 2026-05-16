// tests/api/remindersRoot.test.ts

import { GET, POST } from "@/app/api/reminders/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import {
  USER_IDS,
  REMINDER_IDS,
  SUBSCRIPTION_IDS,
  NOTIFICATION_PROVIDER_IDS,
} from "../../prisma/test-ids";
import {
  createMockReminder,
  createMockSubscription,
  createMockReminderWithSubscription,
} from "../factories";

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

describe("API Integration Tests: Reminders Root", () => {
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

  // ─── GET /api/reminders ──────────────────────────────────────────────

  describe("GET /api/reminders", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await GET()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.reminder.findMany.mockRejectedValueOnce(new Error("DB failure"));
      const res = (await GET()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Failed to fetch reminders" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("returns reminders with subscription for authenticated user", async () => {
      const reminder1 = createMockReminderWithSubscription(
        {
          id: REMINDER_IDS.NETFLIX,
          reminderDate: new Date("2025-06-01"),
        },
        { name: "Netflix" }
      );
      const reminder2 = createMockReminderWithSubscription(
        {
          id: REMINDER_IDS.SPOTIFY,
          reminderDate: new Date("2025-07-01"),
        },
        { name: "Spotify" }
      );
      mockedPrisma.reminder.findMany.mockResolvedValueOnce([
        reminder1,
        reminder2,
      ] as any);

      const res = (await GET()) as unknown as ApiResponse<any[]>;

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toMatchObject({ id: REMINDER_IDS.NETFLIX });
      expect(res.body[0].subscription).toBeDefined();

      expect(mockedPrisma.reminder.findMany).toHaveBeenCalledWith({
        where: { userId: aliceId },
        include: { subscription: true },
        orderBy: { nextSendAt: "asc" },
      });
    });
  });

  // ─── POST /api/reminders ─────────────────────────────────────────────

  describe("POST /api/reminders", () => {
    const validBody = {
      subscriptionId: SUBSCRIPTION_IDS.NETFLIX,
      reminderDate: "2025-06-15T10:00:00.000Z",
      reminderPreset: "custom",
      nextSendAt: "2025-06-15T10:00:00.000Z",
      notificationProviderIds: [NOTIFICATION_PROVIDER_IDS.ALICE_EMAIL],
    };

    function makeRequest(body: Record<string, any>) {
      return new Request("http://localhost/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await POST(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 400 on validation failure", async () => {
      const res = (await POST(
        makeRequest({ subscriptionId: "" })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 404 when subscription not found (ownership check)", async () => {
      mockedPrisma.subscription.findFirst.mockResolvedValueOnce(null);
      const res = (await POST(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Subscription not found" });
      expect(res.init).toEqual({ status: 404 });
    });

    it("creates a new reminder", async () => {
      const subscription = createMockSubscription({
        id: SUBSCRIPTION_IDS.NETFLIX,
      });
      mockedPrisma.subscription.findFirst.mockResolvedValueOnce(subscription);

      const createdReminder = createMockReminder({
        id: REMINDER_IDS.NETFLIX,
        subscriptionId: SUBSCRIPTION_IDS.NETFLIX,
        reminderDate: new Date(validBody.reminderDate),
      });
      mockedPrisma.reminder.create.mockResolvedValueOnce(createdReminder);

      const res = (await POST(makeRequest(validBody))) as unknown as ApiResponse<any>;

      expect(res.body).toMatchObject({
        id: REMINDER_IDS.NETFLIX,
        subscriptionId: SUBSCRIPTION_IDS.NETFLIX,
        userId: aliceId,
      });
      expect(mockedPrisma.reminder.create).toHaveBeenCalled();
    });

    it("updates existing reminder when id is provided", async () => {
      const subscription = createMockSubscription({
        id: SUBSCRIPTION_IDS.NETFLIX,
      });
      mockedPrisma.subscription.findFirst.mockResolvedValueOnce(subscription);

      const updatedReminder = createMockReminder({
        id: REMINDER_IDS.NETFLIX,
        reminderDate: new Date(validBody.reminderDate),
      });
      mockedPrisma.reminder.update.mockResolvedValueOnce(updatedReminder);

      const res = (await POST(
        makeRequest({ ...validBody, id: REMINDER_IDS.NETFLIX })
      )) as unknown as ApiResponse<any>;

      expect(res.body).toMatchObject({ id: REMINDER_IDS.NETFLIX });
      expect(mockedPrisma.reminder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REMINDER_IDS.NETFLIX, userId: aliceId },
        })
      );
    });

    it("returns 500 on database failure", async () => {
      const subscription = createMockSubscription({
        id: SUBSCRIPTION_IDS.NETFLIX,
      });
      mockedPrisma.subscription.findFirst.mockResolvedValueOnce(subscription);
      mockedPrisma.reminder.create.mockRejectedValueOnce(new Error("DB failure"));

      const res = (await POST(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Failed to create reminder" });
      expect(res.init).toEqual({ status: 500 });
    });
  });
});
