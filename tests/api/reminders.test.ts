import { GET, PUT, DELETE } from "@/app/api/reminders/[id]/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { USER_IDS, REMINDER_IDS, SUBSCRIPTION_IDS } from "../../prisma/test-ids";
import { createMockReminder, createMockSubscription } from "../factories";
import type { Reminder, Subscription } from "@prisma/client";

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
type ReminderWithSubscription = Reminder & { subscription: Subscription };

describe("API Integration Tests: /api/reminders/[id]", () => {
  const aliceId = USER_IDS.ALICE;
  const bobId = USER_IDS.BOB;
  const netflixReminderId = REMINDER_IDS.NETFLIX;
  const spotifyReminderId = REMINDER_IDS.SPOTIFY;
  const aliceSession = {
    user: {
      id: aliceId,
      name: "Alice Test",
      email: "alice@test.com",
      image: null
    },
    expires: "2025-12-31T23:59:59.999Z"
  };
  const bobSession = {
    user: {
      id: bobId,
      name: "Bob Test",
      email: "bob@test.com",
      image: null
    },
    expires: "2025-12-31T23:59:59.999Z"
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(aliceSession);
  });

  describe("GET /api/reminders/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`);
      const ctx = { params: { id: netflixReminderId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when reminder not found", async () => {
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/reminders/nonexistent`);
      const ctx = { params: { id: "nonexistent" } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Reminder not found or unauthorized" });
    });

    it("returns 404 when reminder belongs to different user", async () => {
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/reminders/${spotifyReminderId}`);
      const ctx = { params: { id: spotifyReminderId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Reminder not found or unauthorized" });
    });

    it("returns 500 on database error", async () => {
      mockedPrisma.reminder.findFirst.mockRejectedValueOnce(new Error("DB failure"));

      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`);
      const ctx = { params: { id: netflixReminderId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to fetch reminder" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to fetch reminder" });
    });

    it("returns reminder with subscription data for authorized user", async () => {
      const subscription = createMockSubscription({
        id: SUBSCRIPTION_IDS.NETFLIX,
        name: "Netflix",
      });
      const reminder = {
        ...createMockReminder({
          id: netflixReminderId,
          subscriptionId: SUBSCRIPTION_IDS.NETFLIX,
          isRead: false,
        }),
        subscription,
      };
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(reminder as any);

      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`);
      const ctx = { params: { id: netflixReminderId } };

      const res = (await GET(req, ctx)) as unknown as ApiResponse<ReminderWithSubscription>;

      expect(res.body).toMatchObject({
        id: netflixReminderId,
        userId: aliceId,
        subscriptionId: SUBSCRIPTION_IDS.NETFLIX,
        isRead: false,
      });
      expect(res.body.subscription).toMatchObject({
        id: SUBSCRIPTION_IDS.NETFLIX,
        name: "Netflix",
        userId: aliceId,
      });
      expect(res.body.reminderDate).toBeDefined();
    });
  });

  describe("PUT /api/reminders/[id]", () => {
    const updateData = {
      reminderDate: "2025-07-15T10:00:00.000Z",
      isRead: true,
    };

    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: netflixReminderId }) };

      const res = (await PUT(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when reminder not found", async () => {
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/reminders/nonexistent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: "nonexistent" }) };

      const res = (await PUT(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Reminder not found or unauthorized" });
    });

    it("returns 404 when reminder belongs to different user", async () => {
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/reminders/${spotifyReminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: spotifyReminderId }) };

      const res = (await PUT(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Reminder not found or unauthorized" });
    });

    it("returns 500 on database error during update", async () => {
      const existingReminder = createMockReminder({ id: netflixReminderId });
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(existingReminder);
      mockedPrisma.reminder.update.mockRejectedValueOnce(new Error("Update failure"));

      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: netflixReminderId }) };

      const res = (await PUT(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to update reminder" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to update reminder" });
    });

    it("updates reminder with full data", async () => {
      const existingReminder = createMockReminder({ id: netflixReminderId });
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(existingReminder);

      const subscription = createMockSubscription();
      const updatedReminder = {
        ...createMockReminder({
          id: netflixReminderId,
          reminderDate: new Date(updateData.reminderDate),
          isRead: true,
        }),
        subscription,
      };
      mockedPrisma.reminder.update.mockResolvedValueOnce(updatedReminder as any);

      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const ctx = { params: Promise.resolve({ id: netflixReminderId }) };

      const res = (await PUT(req, ctx)) as unknown as ApiResponse<ReminderWithSubscription>;

      expect(res.body).toMatchObject({
        id: netflixReminderId,
        userId: aliceId,
        isRead: true,
      });
      expect(new Date(res.body.reminderDate).toISOString()).toBe(updateData.reminderDate);
      expect(res.body.subscription).toBeDefined();

      expect(mockedPrisma.reminder.update).toHaveBeenCalled();
    });

    it("updates reminder with partial data (only isRead)", async () => {
      const existingReminder = createMockReminder({ id: netflixReminderId });
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(existingReminder);

      const partialUpdate = { isRead: true };
      const subscription = createMockSubscription();
      const updatedReminder = {
        ...createMockReminder({
          id: netflixReminderId,
          isRead: true,
        }),
        subscription,
      };
      mockedPrisma.reminder.update.mockResolvedValueOnce(updatedReminder as any);

      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });
      const ctx = { params: Promise.resolve({ id: netflixReminderId }) };

      const res = (await PUT(req, ctx)) as unknown as ApiResponse<ReminderWithSubscription>;

      expect(res.body).toMatchObject({
        id: netflixReminderId,
        userId: aliceId,
        isRead: true,
      });

      expect(mockedPrisma.reminder.update).toHaveBeenCalled();
    });

    it("updates reminder with partial data (only reminderDate)", async () => {
      const existingReminder = createMockReminder({ id: netflixReminderId });
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(existingReminder);

      const newDate = "2025-08-01T15:30:00.000Z";
      const partialUpdate = { reminderDate: newDate };
      const subscription = createMockSubscription();
      const updatedReminder = {
        ...createMockReminder({
          id: netflixReminderId,
          reminderDate: new Date(newDate),
        }),
        subscription,
      };
      mockedPrisma.reminder.update.mockResolvedValueOnce(updatedReminder as any);

      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });
      const ctx = { params: Promise.resolve({ id: netflixReminderId }) };

      const res = (await PUT(req, ctx)) as unknown as ApiResponse<ReminderWithSubscription>;

      expect(res.body).toMatchObject({
        id: netflixReminderId,
        userId: aliceId,
      });
      expect(new Date(res.body.reminderDate).toISOString()).toBe(newDate);

      expect(mockedPrisma.reminder.update).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/reminders/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`);
      const ctx = { params: { id: netflixReminderId } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when reminder not found", async () => {
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/reminders/nonexistent`);
      const ctx = { params: { id: "nonexistent" } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Reminder not found or unauthorized" });
    });

    it("returns 404 when reminder belongs to different user", async () => {
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(null);

      const req = new Request(`http://localhost/api/reminders/${spotifyReminderId}`);
      const ctx = { params: { id: spotifyReminderId } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Reminder not found or unauthorized" });
    });

    it("returns 500 on database error", async () => {
      const existingReminder = createMockReminder({ id: netflixReminderId });
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(existingReminder);
      mockedPrisma.reminder.delete.mockRejectedValueOnce(new Error("Delete failure"));

      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`);
      const ctx = { params: { id: netflixReminderId } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to delete reminder" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to delete reminder" });
    });

    it("deletes reminder and returns success message", async () => {
      const existingReminder = createMockReminder({ id: netflixReminderId });
      mockedPrisma.reminder.findFirst.mockResolvedValueOnce(existingReminder);
      mockedPrisma.reminder.delete.mockResolvedValueOnce(existingReminder);

      const req = new Request(`http://localhost/api/reminders/${netflixReminderId}`);
      const ctx = { params: { id: netflixReminderId } };

      const res = (await DELETE(req, ctx)) as unknown as ApiResponse<{ message: string }>;

      expect(res.body).toEqual({ message: "Reminder deleted successfully" });

      expect(mockedPrisma.reminder.delete).toHaveBeenCalled();
    });
  });
});
