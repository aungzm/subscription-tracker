// tests/api/userPassword.test.ts

import { PUT } from "@/app/api/user/password/route";
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

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import bcrypt from "bcryptjs";

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedNextJson = NextResponse.json as unknown as jest.MockedFunction<
  <T>(body: T, init?: { status: number }) => { body: T; init?: { status: number } }
>;
const mockedPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

type ApiResponse<T> = { body: T; init?: { status: number } };

function makeRequest(body: Record<string, string>) {
  return new Request("http://localhost/api/user/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API Integration Tests: User Password", () => {
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

  const validBody = {
    currentPassword: "OldPassword1",
    newPassword: "NewPassword1",
    repeatPassword: "NewPassword1",
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(session);
  });

  describe("PUT /api/user/password", () => {
    it("returns 401 when unauthenticated", async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = (await PUT(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(res.init).toEqual({ status: 401 });
    });

    it("returns 400 on validation failure (missing fields)", async () => {
      const res = (await PUT(
        makeRequest({ currentPassword: "x" })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 400 when new password is too short", async () => {
      const res = (await PUT(
        makeRequest({
          currentPassword: "OldPassword1",
          newPassword: "short",
          repeatPassword: "short",
        })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 400 when new passwords do not match", async () => {
      const res = (await PUT(
        makeRequest({
          currentPassword: "OldPassword1",
          newPassword: "NewPassword1",
          repeatPassword: "DifferentPassword1",
        })
      )) as unknown as ApiResponse<{ error: string }>;
      expect(res.body).toMatchObject({ error: "Validation failed" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 404 when user not found", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(null);
      const res = (await PUT(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "User not found" });
      expect(res.init).toEqual({ status: 404 });
    });

    it("returns 400 when current password is incorrect", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ password: "hashedOldPassword" })
      );
      mockedBcrypt.compare.mockResolvedValueOnce(false as never);

      const res = (await PUT(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Current password is incorrect" });
      expect(res.init).toEqual({ status: 400 });
    });

    it("returns 500 on database failure", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ password: "hashedOldPassword" })
      );
      mockedBcrypt.compare.mockResolvedValueOnce(true as never);
      mockedBcrypt.hash.mockResolvedValueOnce("newHashedPassword" as never);
      mockedPrisma.user.update.mockRejectedValueOnce(new Error("DB failure"));

      const res = (await PUT(makeRequest(validBody))) as unknown as ApiResponse<{
        error: string;
      }>;
      expect(res.body).toEqual({ error: "Failed to change password" });
      expect(res.init).toEqual({ status: 500 });
    });

    it("changes password successfully", async () => {
      mockedPrisma.user.findUnique.mockResolvedValueOnce(
        createMockUser({ password: "hashedOldPassword" })
      );
      mockedBcrypt.compare.mockResolvedValueOnce(true as never);
      mockedBcrypt.hash.mockResolvedValueOnce("newHashedPassword" as never);
      mockedPrisma.user.update.mockResolvedValueOnce(
        createMockUser({ password: "newHashedPassword" })
      );

      const res = (await PUT(makeRequest(validBody))) as unknown as ApiResponse<{
        message: string;
      }>;

      expect(res.body).toEqual({ message: "Password changed successfully" });

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        "OldPassword1",
        "hashedOldPassword"
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith("NewPassword1", 10);
      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: aliceId },
        data: { password: "newHashedPassword" },
      });
    });
  });
});
