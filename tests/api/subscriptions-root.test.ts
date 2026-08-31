// tests/api/subscriptionsRoot.test.ts

import { GET, POST } from "@/app/api/subscriptions/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import {
  USER_IDS,
  SUBSCRIPTION_IDS,
  CATEGORY_IDS,
  PAYMENT_METHOD_IDS,
} from "../../prisma/test-ids";
import {
  createMockSubscription,
  createMockCategory,
  createMockPaymentMethod,
  createMockSubscriptionWithRelations,
} from "../factories";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedNextJson = NextResponse.json as unknown as jest.MockedFunction<
  <T>(body: T, init?: { status: number }) => { body: T; init?: { status: number } }
>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Subscriptions Root", () => {
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

  // ─── GET /api/subscriptions ──────────────────────────────────────────

  describe("GET /api/subscriptions", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await GET()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.subscription.findMany.mockRejectedValueOnce(
        new Error("DB failure")
      );
      const res = (await GET()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Failed to fetch subscriptions" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("returns subscriptions with relations for authenticated user", async () => {
      const now = new Date();
      const sub1 = createMockSubscriptionWithRelations({
        id: SUBSCRIPTION_IDS.NETFLIX,
        name: "Netflix",
        startDate: new Date(now.getTime() - 1000),
      });
      const sub2 = createMockSubscriptionWithRelations({
        id: SUBSCRIPTION_IDS.SPOTIFY,
        name: "Spotify",
        startDate: now,
      });
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub1, sub2] as any);

      const res = (await GET()) as unknown as ApiResponse<any[]>;

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toMatchObject({ id: SUBSCRIPTION_IDS.NETFLIX, name: "Netflix" });
      expect(res.body[1]).toMatchObject({ id: SUBSCRIPTION_IDS.SPOTIFY, name: "Spotify" });
      expect(res.body[0].category).toBeDefined();
      expect(res.body[0].paymentMethod).toBeDefined();

      expect(mockedPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: aliceId },
        include: { category: true, paymentMethod: true },
        orderBy: { startDate: "asc" },
      });
    });
  });

  // ─── POST /api/subscriptions ─────────────────────────────────────────

  describe("POST /api/subscriptions", () => {
    const validBody = {
      name: "Disney+",
      cost: 9.99,
      billingFrequency: "monthly",
      startDate: "2025-01-01",
      currency: "USD",
    };

    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request("http://localhost/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      });
      const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 400 on validation failure", async () => {
      const req = new Request("http://localhost/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Missing fields" }),
      });
      const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.subscription.create.mockRejectedValueOnce(
        new Error("DB failure")
      );
      const req = new Request("http://localhost/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      });
      const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Failed to create subscription" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("creates subscription with existing category and payment method", async () => {
      const existingCat = createMockCategory({ id: CATEGORY_IDS.STREAMING, name: "Streaming" });
      const existingPm = createMockPaymentMethod({ id: PAYMENT_METHOD_IDS.VISA, name: "Visa" });

      mockedPrisma.category.findFirst.mockResolvedValueOnce(existingCat);
      mockedPrisma.paymentMethod.findFirst.mockResolvedValueOnce(existingPm);

      const createdSub = {
        ...createMockSubscription({
          name: "Disney+",
          cost: 9.99,
          categoryId: CATEGORY_IDS.STREAMING,
          paymentMethodId: PAYMENT_METHOD_IDS.VISA,
        }),
        category: existingCat,
        paymentMethod: existingPm,
      };
      mockedPrisma.subscription.create.mockResolvedValueOnce(createdSub as any);

      const req = new Request("http://localhost/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validBody,
          category: CATEGORY_IDS.STREAMING,
          paymentMethod: PAYMENT_METHOD_IDS.VISA,
        }),
      });
      const res = (await POST(req)) as unknown as ApiResponse<any>;

      expect(res.body).toMatchObject({ name: "Disney+", cost: 9.99 });
      expect(res.body.category).toBeDefined();
      expect(res.body.paymentMethod).toBeDefined();

      // Should have looked up existing, not created new
      expect(mockedPrisma.category.findFirst).toHaveBeenCalled();
      expect(mockedPrisma.category.create).not.toHaveBeenCalled();
      expect(mockedPrisma.paymentMethod.findFirst).toHaveBeenCalled();
      expect(mockedPrisma.paymentMethod.create).not.toHaveBeenCalled();
    });

    it("returns 400 when category is not owned by the user", async () => {
      mockedPrisma.category.findFirst.mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validBody,
          category: CATEGORY_IDS.PRODUCTIVITY,
        }),
      });
      const res = (await POST(req)) as unknown as ApiResponse<{ error: string }>;

      expect(res.body).toEqual({ error: "Invalid category" });
      expect(res.init).toEqual({ status: 400 });
      expect(mockedPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it("creates subscription without category or payment method", async () => {
      const createdSub = {
        ...createMockSubscription({
          name: "Disney+",
          cost: 9.99,
          categoryId: null,
          paymentMethodId: null,
        }),
        category: null,
        paymentMethod: null,
      };
      mockedPrisma.subscription.create.mockResolvedValueOnce(createdSub as any);

      const req = new Request("http://localhost/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      });
      const res = (await POST(req)) as unknown as ApiResponse<any>;

      expect(res.body.name).toBe("Disney+");
      expect(mockedPrisma.category.findFirst).not.toHaveBeenCalled();
      expect(mockedPrisma.paymentMethod.findFirst).not.toHaveBeenCalled();
    });
  });
});
