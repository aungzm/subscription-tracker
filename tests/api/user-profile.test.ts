// tests/api/userProfile.test.ts

import {
  GET as getProfile,
  PUT as putProfile,
  DELETE as deleteProfile,
} from "@/app/api/user/profile/route";
import {
  GET as getCurrency,
  PUT as putCurrency,
} from "@/app/api/user/currency/route";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { USER_IDS } from "../../prisma/test-ids";
import { createMockUser } from "../factories";

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

describe("API Integration Tests: User Profile & Currency", () => {
  const aliceId = USER_IDS.ALICE;
  const session = {
    user: {
      id: aliceId,
      name: "Alice Test",
      email: "alice@test.com",
      image: null,
    },
    expires: "2025-12-31T23:59:59.999Z",
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(session);
  });

  // ─── GET /api/user/profile ───────────────────────────────────────────

  describe("GET /api/user/profile", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await getProfile()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 404 when user not found", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(null);
      const res = (await getProfile()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "User not found" });
      expect(res.init).toEqual({ status: 404 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.findUnique.mockRejectedValueOnce(new Error("DB failure"));
      const res = (await getProfile()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Failed to fetch user details" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("returns user profile for authenticated user", async () => {
      const mockUser = createMockUser();
      mockedPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = (await getProfile()) as unknown as ApiResponse<{
        email: string;
        name: string;
        image: string | null;
        currency: string;
      }>;

      expect(res.body).toMatchObject({
        email: "alice@test.com",
        name: "Alice Test",
        image: null,
        currency: "USD",
      });

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: aliceId },
        select: { email: true, name: true, image: true, currency: true },
      });
    });
  });

  // ─── PUT /api/user/profile ───────────────────────────────────────────

  describe("PUT /api/user/profile", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request("http://localhost/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      });
      const res = (await putProfile(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 400 on validation failure", async () => {
      const req = new Request("http://localhost/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });
      const res = (await putProfile(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.update.mockRejectedValueOnce(new Error("DB failure"));
      const req = new Request("http://localhost/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      });
      const res = (await putProfile(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Failed to update user" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("updates and returns user profile", async () => {
      const updatedUser = createMockUser({ name: "New Name", currency: "EUR" });
      mockedPrisma.user.update.mockResolvedValueOnce(updatedUser);

      const req = new Request("http://localhost/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name", currency: "EUR" }),
      });
      const res = (await putProfile(req)) as unknown as ApiResponse<{
        message: string;
        user: { email: string; name: string; image: string | null; currency: string };
      }>;

      expect(res.body.message).toBe("User updated successfully");
      expect(res.body.user).toMatchObject({
        email: "alice@test.com",
        name: "New Name",
        currency: "EUR",
      });

      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: aliceId },
        data: { name: "New Name", image: undefined, currency: "EUR" },
      });
    });

    it("updates with partial data (name only)", async () => {
      const updatedUser = createMockUser({ name: "Just Name" });
      mockedPrisma.user.update.mockResolvedValueOnce(updatedUser);

      const req = new Request("http://localhost/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Just Name" }),
      });
      const res = (await putProfile(req)) as unknown as ApiResponse<{
        message: string;
        user: { name: string };
      }>;

      expect(res.body.message).toBe("User updated successfully");
      expect(res.body.user.name).toBe("Just Name");
    });
  });

  // ─── DELETE /api/user/profile ────────────────────────────────────────

  describe("DELETE /api/user/profile", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await deleteProfile()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.delete.mockRejectedValueOnce(new Error("DB failure"));
      const res = (await deleteProfile()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Failed to delete user account" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("deletes user account and returns success message", async () => {
      const mockUser = createMockUser();
      mockedPrisma.user.delete.mockResolvedValueOnce(mockUser);

      const res = (await deleteProfile()) as unknown as ApiResponse<{ message: string }>;

      expect(res.body).toEqual({ message: "User account deleted successfully" });
      expect(mockedPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: aliceId },
      });
    });
  });

  // ─── GET /api/user/currency ──────────────────────────────────────────

  describe("GET /api/user/currency", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await getCurrency()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 404 when user not found", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(null);
      const res = (await getCurrency()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "User not found" });
      expect(res.init).toEqual({ status: 404 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.findUnique.mockRejectedValueOnce(new Error("DB failure"));
      const res = (await getCurrency()) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Failed to fetch currency setting" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("returns currency for authenticated user", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ currency: "GBP" })
      );

      const res = (await getCurrency()) as unknown as ApiResponse<{ currency: string }>;

      expect(res.body).toEqual({ currency: "GBP" });
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: aliceId },
        select: { currency: true },
      });
    });
  });

  // ─── PUT /api/user/currency ──────────────────────────────────────────

  describe("PUT /api/user/currency", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const req = new Request("http://localhost/api/user/currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "EUR" }),
      });
      const res = (await putCurrency(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 400 on validation failure (empty currency)", async () => {
      const req = new Request("http://localhost/api/user/currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "" }),
      });
      const res = (await putCurrency(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.update.mockRejectedValueOnce(new Error("DB failure"));
      const req = new Request("http://localhost/api/user/currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "EUR" }),
      });
      const res = (await putCurrency(req)) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toEqual({ error: "Failed to update currency" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("updates and returns the new currency", async () => {
      mockedPrisma.user.update.mockResolvedValueOnce(
        createMockUser({ currency: "EUR" })
      );

      const req = new Request("http://localhost/api/user/currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "EUR" }),
      });
      const res = (await putCurrency(req)) as unknown as ApiResponse<{
        message: string;
        currency: string;
      }>;

      expect(res.body.message).toBe("Currency updated successfully");
      expect(res.body.currency).toBe("EUR");

      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: aliceId },
        data: { currency: "EUR" },
        select: { currency: true },
      });
    });
  });
});
