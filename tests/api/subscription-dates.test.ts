// tests/api/subscriptionDates.test.ts

import { GET } from "@/app/api/subscriptions/dates/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { USER_IDS, SUBSCRIPTION_IDS, CATEGORY_IDS } from "../../prisma/test-ids";
import { createMockSubscription, createMockCategory } from "../factories";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
  NextRequest: jest.requireActual("next/server").NextRequest,
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: Subscription Dates", () => {
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

  function makeRequest(params: string) {
    return new NextRequest(
      `http://localhost/api/subscriptions/dates?${params}`
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(session);
  });

  describe("GET /api/subscriptions/dates", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await GET(makeRequest("year=2025"))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 400 when year is missing", async () => {
      const res = (await GET(makeRequest(""))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Missing year" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns renewal dates for monthly subscription", async () => {
      const category = createMockCategory({ name: "Streaming", color: "#FF0000" });
      const sub = {
        ...createMockSubscription({
          id: SUBSCRIPTION_IDS.NETFLIX,
          name: "Netflix",
          cost: 15.99,
          currency: "USD",
          billingFrequency: "monthly",
          startDate: new Date(2025, 0, 15),
          endDate: null,
        }),
        category,
      };
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);

      const res = (await GET(
        makeRequest("year=2025&month=3")
      )) as unknown as ApiResponse<{ overview: any[] }>;

      expect(res.body).toHaveProperty("overview");
      expect(Array.isArray(res.body.overview)).toBe(true);
      expect(res.body.overview.length).toBe(1);

      const entry = res.body.overview[0];
      expect(entry).toMatchObject({
        id: SUBSCRIPTION_IDS.NETFLIX,
        name: "Netflix",
        billingFrequency: "monthly",
        cost: 15.99,
        currency: "USD",
        category: "Streaming",
        category_color: "#FF0000",
      });
      expect(entry.sub_dates.length).toBe(1);
      expect(entry.sub_dates[0]).toBe("2025-03-15");
    });

    it("returns yearly subscription for year-only query", async () => {
      const sub = {
        ...createMockSubscription({
          id: SUBSCRIPTION_IDS.NOTION,
          name: "Notion",
          cost: 96,
          currency: "USD",
          billingFrequency: "yearly",
          startDate: new Date(2024, 5, 1),
          endDate: null,
        }),
        category: null,
      };
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);

      const res = (await GET(
        makeRequest("year=2025")
      )) as unknown as ApiResponse<{ overview: any[] }>;

      const entry = res.body.overview[0];
      expect(entry.name).toBe("Notion");
      expect(entry.sub_dates).toContain("2025-06-01");
    });

    it("returns empty sub_dates when no renewals in requested period", async () => {
      const sub = {
        ...createMockSubscription({
          billingFrequency: "yearly",
          startDate: new Date(2025, 2, 1),
        }),
        category: null,
      };
      mockedPrisma.subscription.findMany.mockResolvedValueOnce([sub] as any);

      const res = (await GET(
        makeRequest("year=2025&month=6")
      )) as unknown as ApiResponse<{ overview: any[] }>;

      expect(res.body.overview[0].sub_dates).toEqual([]);
    });
  });
});
