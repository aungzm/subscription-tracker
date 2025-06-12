import { GET, PUT, DELETE } from "@/app/api/subscriptions/[id]/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USER_IDS, SUBSCRIPTION_IDS, CATEGORY_IDS, PAYMENT_METHOD_IDS } from "../../prisma/test-ids";

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

describe("API Integration Tests: Subscriptions [id]", () => {
  const aliceId = USER_IDS.ALICE;
  const bobId = USER_IDS.BOB;
  const netflixId = SUBSCRIPTION_IDS.NETFLIX;
  const spotifyId = SUBSCRIPTION_IDS.SPOTIFY;

  const aliceSession = {
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
    mockedAuth.mockResolvedValue(aliceSession);
  });

  describe("GET /api/subscriptions/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/subscriptions/${netflixId}`);
      const res = (await GET(req)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 404 when not found or not owner", async () => {
      // Alice tries to fetch Bob's subscription
      const req = new Request(`http://localhost/api/subscriptions/${spotifyId}`);
      const res = (await GET(req)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Subscription not found" },
        { status: 404 }
      );
      expect(res.body).toEqual({ error: "Subscription not found" });
    });

    it("returns 500 on database error", async () => {
      jest
        .spyOn(prisma.subscription, "findFirst")
        .mockRejectedValueOnce(new Error("DB fail"));
      const req = new Request(`http://localhost/api/subscriptions/${netflixId}`);
      const res = (await GET(req)) as unknown as ApiResponse<{ error: string }>;

      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to fetch subscription" },
        { status: 500 }
      );
      expect(res.body).toEqual({ error: "Failed to fetch subscription" });
    });

    it("returns subscription with mapped relations for owner", async () => {
      const req = new Request(`http://localhost/api/subscriptions/${netflixId}`);
      const res = (await GET(req)) as ApiResponse<any>;
      const sub = res.body;

      // Core fields
      expect(sub).toMatchObject({
        id: netflixId,
        userId: aliceId,
        name: "Netflix",
        cost: 15.99,
        billingFrequency: "monthly",
      });

      // category & paymentMethod are names
      expect(typeof sub.category).toBe("string");
      expect(typeof sub.paymentMethod).toBe("string");

      // reminders is an array of { date, providers: string[] }
      expect(Array.isArray(sub.reminders)).toBe(true);
      if (sub.reminders.length > 0) {
        const r = sub.reminders[0];
        expect(r).toHaveProperty("date");
        expect(Array.isArray(r.providers)).toBe(true);
      }
    });
  });

  describe("PUT /api/subscriptions/[id]", () => {
    const makeCtx = (id: string) => ({
      params: Promise.resolve({ id }),
    });

    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://x`, {
        method: "PUT",
        body: JSON.stringify({ name: "X" }),
      });
      const res = (await PUT(req, makeCtx(netflixId))) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("returns 404 when subscription not found", async () => {
      jest
        .spyOn(prisma.subscription, "findFirst")
        .mockResolvedValueOnce(null);
      const req = new Request(`http://x`, {
        method: "PUT",
        body: JSON.stringify({ name: "X" }),
      });
      const res = (await PUT(req, makeCtx(netflixId))) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Subscription not found" },
        { status: 404 }
      );
    });

    it("returns 500 on database update failure", async () => {
      // let findFirst succeed
      const spyFind = jest.spyOn(prisma.subscription, "findFirst");
      // next update fails
      jest
        .spyOn(prisma.subscription, "update")
        .mockRejectedValueOnce(new Error("Update fail"));
      const req = new Request(`http://x`, {
        method: "PUT",
        body: JSON.stringify({ name: "Y" }),
      });
      const res = (await PUT(req, makeCtx(netflixId))) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
      spyFind.mockRestore();
    });

    it("updates full subscription data", async () => {
      const newData = {
        name: "MyNewSub",
        cost: 123.45,
        billingFrequency: "yearly",
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: null,
        notes: "updated notes",
        currency: "EUR",
        category: CATEGORY_IDS.PRODUCTIVITY,
        paymentMethod: PAYMENT_METHOD_IDS.PAYPAL,
      };
      const req = new Request(`http://localhost/api/subscriptions/${netflixId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
      const res = (await PUT(req, makeCtx(netflixId))) as ApiResponse<any>;
      const updated = res.body;

      expect(updated).toMatchObject({
        id: netflixId,
        userId: aliceId,
        name: newData.name,
        cost: newData.cost,
        billingFrequency: newData.billingFrequency,
        notes: newData.notes,
        currency: newData.currency,
      });
      // included relations
      expect(updated.category).toMatchObject({
        id: CATEGORY_IDS.PRODUCTIVITY,
      });
      expect(updated.paymentMethod).toMatchObject({
        id: PAYMENT_METHOD_IDS.PAYPAL,
      });

      // verify persisted
      const db = await prisma.subscription.findUnique({
        where: { id: netflixId },
      });
      expect(db).toMatchObject({
        name: newData.name,
        cost: newData.cost,
        currency: newData.currency,
      });
    });

    it("updates partial fields (name only)", async () => {
      const req = new Request(`http://x`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "PartialName" }),
      });
      const res = (await PUT(req, makeCtx(netflixId))) as ApiResponse<any>;
      expect(res.body.name).toBe("PartialName");

      const db = await prisma.subscription.findUnique({
        where: { id: netflixId },
      });
      expect(db?.name).toBe("PartialName");
    });
  });

  describe("DELETE /api/subscriptions/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/subscriptions/${netflixId}`);
      const res = (await DELETE(req, { params: { id: netflixId } })) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });

    it("returns 404 when not found", async () => {
      jest
        .spyOn(prisma.subscription, "findFirst")
        .mockResolvedValueOnce(null);
      const req = new Request(`http://localhost/api/subscriptions/${netflixId}`);
      const res = (await DELETE(req, { params: { id: netflixId } })) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Subscription not found" },
        { status: 404 }
      );
    });

    it("returns 500 on database delete failure", async () => {
      // let findFirst succeed
      const spyFind = jest.spyOn(prisma.subscription, "findFirst");
      jest
        .spyOn(prisma.subscription, "delete")
        .mockRejectedValueOnce(new Error("Delete fail"));
      const req = new Request(`http://localhost/api/subscriptions/${netflixId}`);
      const res = (await DELETE(req, { params: { id: netflixId } })) as unknown as ApiResponse<{ error: string }>;
      expect(mockedNextJson).toHaveBeenCalledWith(
        { error: "Failed to delete subscription" },
        { status: 500 }
      );
      spyFind.mockRestore();
    });

    it("deletes subscription and returns success message", async () => {
      const req = new Request(`http://localhost/api/subscriptions/${netflixId}`);
      const res = (await DELETE(req, { params: { id: netflixId } })) as unknown as ApiResponse<{ message: string }>;
      expect(res.body).toEqual({ message: "Subscription deleted successfully" });

      const gone = await prisma.subscription.findUnique({
        where: { id: netflixId },
      });
      expect(gone).toBeNull();
    });
  });
});