// tests/api/auth-register.test.ts

import { POST } from "@/app/api/auth/register/route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { USER_IDS } from "../../prisma/test-ids";
import { createMockUser } from "../factories";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password_123"),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({
    success: true,
    limit: 3,
    remaining: 2,
    resetIn: 60,
  }),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
  REGISTER_RATE_LIMIT: { limit: 3, windowSeconds: 60 },
}));

import { checkRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

const mockedCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

type ApiResponse<T> = { body: T; init?: { status: number; headers?: Record<string, string> } };

function makeRequest(body: Record<string, any>) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API Integration Tests: Auth Register", () => {
  const validBody = {
    name: "Alice Test",
    email: "alice@test.com",
    password: "SecurePass123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedCheckRateLimit.mockReturnValue({
      success: true,
      limit: 3,
      remaining: 2,
      resetIn: 60,
    });
  });

  describe("POST /api/auth/register", () => {
    it("returns 429 when rate limited", async () => {
      mockedCheckRateLimit.mockReturnValueOnce({
        success: false,
        limit: 3,
        remaining: 0,
        resetIn: 45,
      });

      const res = (await POST(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({
        error: "Too many registration attempts. Please try again later.",
      });
      expect(res.init?.status).toBe(429);
    });

    it("returns 400 on validation failure (missing fields)", async () => {
      const res = (await POST(
        makeRequest({ email: "test@test.com" })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 400 on validation failure (short password)", async () => {
      const res = (await POST(
        makeRequest({ name: "Test", email: "test@test.com", password: "short" })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 400 when user already exists", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(createMockUser());

      const res = (await POST(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({
        error: "User with this email already exists",
      });
      expect(res.init).toEqual({ status: 400 });
    });

    it("creates user with hashed password and excludes password from response", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(null);
      const createdUser = createMockUser({
        id: USER_IDS.ALICE,
        name: "Alice Test",
        email: "alice@test.com",
        password: "hashed_password_123",
        currency: "USD",
      });
      mockedPrisma.user.create.mockResolvedValueOnce(createdUser);

      const res = (await POST(makeRequest(validBody))) as unknown as ApiResponse<any>;

      // Password should be excluded from response
      expect(res.body).not.toHaveProperty("password");
      expect(res.body).toMatchObject({
        id: USER_IDS.ALICE,
        name: "Alice Test",
        email: "alice@test.com",
        currency: "USD",
      });

      // Verify bcrypt was called
      expect(bcrypt.hash).toHaveBeenCalledWith("SecurePass123", 10);

      // Verify prisma create was called with hashed password
      expect(mockedPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "Alice Test",
          email: "alice@test.com",
          password: "hashed_password_123",
          currency: "USD",
        },
      });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockedPrisma.user.create.mockRejectedValueOnce(new Error("DB failure"));

      const res = (await POST(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Failed to register user" });
      expect(res.init).toEqual({ status: 500 });
    });
  });
});
