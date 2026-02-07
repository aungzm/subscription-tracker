// tests/api/analytics-details.test.ts

import { GET } from "@/app/api/analytics/details/route";
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
  normalizeToMonthlyCost: jest.fn(async (cost: number) => cost),
  convertCurrency: jest.fn(async (cost: number) => cost),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Analytics Details", () => {
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

  function makeRequest() {
    return new NextRequest("http://localhost/api/analytics/details");
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(session);
  });

  describe("GET /api/analytics/details", () => {
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

    it("returns zeros when no subscriptions", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "USD" })
      );
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([]);

      const res = (await GET(makeRequest())) as unknown as ApiResponse<any>;

      expect(res.body).toEqual({
        averageMonthly: { value: 0, currency: "USD" },
        averageYearly: { value: 0, currency: "USD" },
        largestExpense: null,
      });
    });

    it("returns averageMonthly, averageYearly, and largestExpense", async () => {
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
          cost: 15.99,
          currency: "USD",
          billingFrequency: "monthly",
          endDate: null,
        }),
        category,
      };
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);

      const res = (await GET(makeRequest())) as unknown as ApiResponse<any>;

      expect(res.body.averageMonthly).toMatchObject({
        currency: "USD",
      });
      expect(typeof res.body.averageMonthly.value).toBe("number");
      expect(res.body.averageMonthly.value).toBeGreaterThan(0);

      expect(res.body.averageYearly).toMatchObject({
        currency: "USD",
      });
      expect(res.body.averageYearly.value).toBeGreaterThan(0);

      expect(res.body.largestExpense).toMatchObject({
        id: SUBSCRIPTION_IDS.NETFLIX,
        name: "Netflix",
        currency: "USD",
      });
      expect(res.body.largestExpense.category).toMatchObject({
        id: CATEGORY_IDS.STREAMING,
        name: "Streaming",
      });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.findUnique.mockRejectedValueOnce(
        new Error("DB failure")
      );
      const res = (await GET(makeRequest())) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Failed to fetch analytics summary" });
      expect(res.init).toEqual({ status: 500 });
    });
  });
});
