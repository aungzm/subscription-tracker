// tests/api/subscriptionDetails.test.ts

import { GET } from "@/app/api/subscriptions/details/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { USER_IDS, SUBSCRIPTION_IDS, CATEGORY_IDS } from "../../prisma/test-ids";
import { createMockUser, createMockSubscription, createMockCategory } from "../factories";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
  NextRequest: jest.requireActual("next/server").NextRequest,
}));

jest.mock("@/lib/currency", () => ({
  prefetchExchangeRates: jest.fn().mockResolvedValue(new Map()),
  convertCurrencyWithRatesSafe: jest.fn(
    (amount: number, from: string, to: string) => ({
      amount,
      success: true,
    })
  ),
  normalizeToMonthlyCostSyncSafe: jest.fn(
    (cost: number, _currency: string, freq: string) => {
      let amount = cost;
      if (freq === "yearly") amount = cost / 12;
      if (freq === "weekly") amount = cost * (52 / 12);
      return { amount, success: true };
    }
  ),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Subscription Details", () => {
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

  function makeRequest(url = "http://localhost/api/subscriptions/details") {
    return new NextRequest(url);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(session);
  });

  describe("GET /api/subscriptions/details", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await GET(makeRequest())) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 404 when user not found", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(null);
      const res = (await GET(makeRequest())) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "User not found" });
      expect(res.init).toEqual({ status: 404 });
    });

    it("returns totals, recentSubscriptions, and upcomingRenewals", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "USD" })
      );

      const now = new Date();
      const category = createMockCategory({ name: "Streaming", color: "#FF0000" });
      const sub = {
        ...createMockSubscription({
          id: SUBSCRIPTION_IDS.NETFLIX,
          name: "Netflix",
          cost: 15.99,
          currency: "USD",
          billingFrequency: "monthly",
          startDate: new Date(now.getFullYear(), now.getMonth() - 2, 15),
          endDate: null,
        }),
        category,
        paymentMethod: null,
        reminders: [],
      };

      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);

      const res = (await GET(makeRequest())) as unknown as ApiResponse<any>;

      expect(res.body).toHaveProperty("totals");
      expect(res.body).toHaveProperty("recentSubscriptions");
      expect(res.body).toHaveProperty("upcomingRenewals");

      expect(res.body.totals).toMatchObject({
        currency: "USD",
        activeSubscriptions: 1,
      });
      expect(typeof res.body.totals.totalMonthly).toBe("number");
      expect(typeof res.body.totals.totalYearly).toBe("number");

      expect(Array.isArray(res.body.recentSubscriptions)).toBe(true);
      expect(res.body.recentSubscriptions[0]).toMatchObject({
        id: SUBSCRIPTION_IDS.NETFLIX,
        name: "Netflix",
      });
    });

    it("returns empty arrays when user has no subscriptions", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "USD" })
      );
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([]);

      const res = (await GET(makeRequest())) as unknown as ApiResponse<any>;

      expect(res.body.totals.activeSubscriptions).toBe(0);
      expect(res.body.totals.totalMonthly).toBe(0);
      expect(res.body.recentSubscriptions).toEqual([]);
      expect(res.body.upcomingRenewals).toEqual([]);
    });
  });
});
