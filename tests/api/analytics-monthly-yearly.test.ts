// tests/api/analytics-monthly-yearly.test.ts

import { GET as getMonthly } from "@/app/api/analytics/monthly/route";
import { GET as getYearly } from "@/app/api/analytics/yearly/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { USER_IDS, SUBSCRIPTION_IDS, CATEGORY_IDS } from "../../prisma/test-ids";
import { createMockUser, createMockSubscription, createMockCategory } from "../factories";
import {
  convertCurrencyWithRatesSafe,
  normalizeToMonthlyCostSyncSafe,
} from "@/lib/currency";

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
  prefetchExchangeRates: jest.fn(async () => new Map()),
  normalizeToMonthlyCostSyncSafe: jest.fn((cost: number) => ({
    success: true,
    amount: cost,
  })),
  convertCurrencyWithRatesSafe: jest.fn((cost: number) => ({
    success: true,
    amount: cost,
  })),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;
const mockedNormalizeToMonthlyCostSyncSafe =
  normalizeToMonthlyCostSyncSafe as jest.MockedFunction<typeof normalizeToMonthlyCostSyncSafe>;
const mockedConvertCurrencyWithRatesSafe =
  convertCurrencyWithRatesSafe as jest.MockedFunction<typeof convertCurrencyWithRatesSafe>;

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Analytics Monthly & Yearly", () => {
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

  // ─── GET /api/analytics/monthly ──────────────────────────────────────

  describe("GET /api/analytics/monthly", () => {
    function makeRequest(params = "") {
      return new NextRequest(
        `http://localhost/api/analytics/monthly${params ? "?" + params : ""}`
      );
    }

    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await getMonthly(makeRequest())) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 404 when user not found", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(null);
      const res = (await getMonthly(makeRequest())) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "User not found" });
      expect(res.init).toEqual({ status: 404 });
    });

    it("returns 400 on invalid year param", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "USD" })
      );
      const res = (await getMonthly(
        makeRequest("year=abc")
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Invalid year parameter" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns monthlyData, categories, years, and currency", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "USD" })
      );

      const category = createMockCategory({
        id: CATEGORY_IDS.STREAMING,
        name: "Streaming",
        color: "#FF0000",
      });
      const sub = {
        ...createMockSubscription({
          id: SUBSCRIPTION_IDS.NETFLIX,
          name: "Netflix",
          cost: 15,
          currency: "USD",
          billingFrequency: "monthly",
          startDate: new Date(2025, 0, 1),
          endDate: null,
        }),
        category,
      };
      // First findMany: subscriptions for the year
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);
      // Second findMany: all subscriptions for available years
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([
        { startDate: new Date(2025, 0, 1), endDate: null },
      ] as any);

      const res = (await getMonthly(
        makeRequest("year=2025")
      )) as unknown as ApiResponse<any>;

      expect(res.body).toHaveProperty("monthlyData");
      expect(res.body).toHaveProperty("categories");
      expect(res.body).toHaveProperty("years");
      expect(res.body).toHaveProperty("currency", "USD");

      // 12 months of data
      expect(res.body.monthlyData).toHaveLength(12);
      expect(res.body.monthlyData[0]).toHaveProperty("name");
      expect(res.body.monthlyData[0]).toHaveProperty("total");

      // Categories array
      expect(res.body.categories.length).toBeGreaterThan(0);
      expect(res.body.categories[0]).toMatchObject({
        id: CATEGORY_IDS.STREAMING,
        name: "Streaming",
      });
    });

    it("returns empty data when no subscriptions", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "USD" })
      );
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([]);
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([]);

      const res = (await getMonthly(
        makeRequest("year=2025")
      )) as unknown as ApiResponse<any>;

      expect(res.body.monthlyData).toHaveLength(12);
      expect(res.body.monthlyData.every((m: any) => m.total === 0)).toBe(true);
      expect(res.body.categories).toEqual([]);
      expect(res.body.currency).toBe("USD");
    });

    it("returns warnings instead of 500 when monthly conversion fails", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "CAD" })
      );

      const sub = {
        ...createMockSubscription({
          id: SUBSCRIPTION_IDS.NETFLIX,
          cost: 12,
          currency: "USD",
          billingFrequency: "monthly",
          startDate: new Date(2025, 0, 1),
          endDate: null,
        }),
        category: null,
      };
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([
        { startDate: new Date(2025, 0, 1), endDate: null },
      ] as any);
      mockedNormalizeToMonthlyCostSyncSafe.mockReturnValueOnce({
        success: false,
        amount: 12,
        error: "No exchange rates found for USD",
      });

      const res = (await getMonthly(
        makeRequest("year=2025")
      )) as unknown as ApiResponse<any>;

      expect(res.init).toBeUndefined();
      expect(res.body.monthlyData[0].total).toBe(12);
      expect(res.body.warnings.conversionErrors).toEqual([
        `${SUBSCRIPTION_IDS.NETFLIX}: No exchange rates found for USD`,
      ]);
    });
  });

  // ─── GET /api/analytics/yearly ───────────────────────────────────────

  describe("GET /api/analytics/yearly", () => {
    function makeRequest() {
      return new NextRequest("http://localhost/api/analytics/yearly");
    }

    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await getYearly(makeRequest())) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 404 when user not found", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(null);
      const res = (await getYearly(makeRequest())) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "User not found" });
      expect(res.init).toEqual({ status: 404 });
    });

    it("returns yearlyData, categories, and currency", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "USD" })
      );

      const category = createMockCategory({
        id: CATEGORY_IDS.STREAMING,
        name: "Streaming",
        color: "#FF0000",
      });
      const sub = {
        ...createMockSubscription({
          id: SUBSCRIPTION_IDS.NETFLIX,
          name: "Netflix",
          cost: 120,
          currency: "USD",
          billingFrequency: "monthly",
          startDate: new Date(2024, 0, 1),
          endDate: null,
        }),
        category,
      };
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);

      const res = (await getYearly(makeRequest())) as unknown as ApiResponse<any>;

      expect(res.body).toHaveProperty("yearlyData");
      expect(res.body).toHaveProperty("categories");
      expect(res.body).toHaveProperty("currency", "USD");

      expect(Array.isArray(res.body.yearlyData)).toBe(true);
      expect(res.body.yearlyData.length).toBeGreaterThan(0);
      expect(res.body.yearlyData[0]).toHaveProperty("year");
      expect(res.body.yearlyData[0]).toHaveProperty("total");
      expect(res.body.yearlyData[0].total).toBeGreaterThan(0);

      expect(res.body.categories.length).toBeGreaterThan(0);
    });

    it("returns empty data when no subscriptions", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "USD" })
      );
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([]);

      const res = (await getYearly(makeRequest())) as unknown as ApiResponse<any>;

      expect(res.body.yearlyData).toEqual([]);
      expect(res.body.categories).toEqual([]);
      expect(res.body.currency).toBe("USD");
    });

    it("returns warnings instead of 500 when yearly conversion fails", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "CAD" })
      );

      const sub = {
        ...createMockSubscription({
          id: SUBSCRIPTION_IDS.NETFLIX,
          cost: 10,
          currency: "USD",
          billingFrequency: "monthly",
          startDate: new Date(2025, 0, 1),
          endDate: new Date(2025, 11, 31),
        }),
        category: null,
      };
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);
      mockedConvertCurrencyWithRatesSafe.mockReturnValueOnce({
        success: false,
        amount: 10,
        error: "No exchange rates found for USD",
      });

      const res = (await getYearly(makeRequest())) as unknown as ApiResponse<any>;

      expect(res.init).toBeUndefined();
      expect(res.body.yearlyData).toEqual([
        { year: 2025, total: 120, uncategorized: 120 },
      ]);
      expect(res.body.warnings.conversionErrors).toEqual([
        `${SUBSCRIPTION_IDS.NETFLIX}: No exchange rates found for USD`,
      ]);
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.findUnique.mockRejectedValueOnce(
        new Error("DB failure")
      );
      const res = (await getYearly(makeRequest())) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Failed to fetch analytics data" });
      expect(res.init).toEqual({ status: 500 });
    });
  });
});
