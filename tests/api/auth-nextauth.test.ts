// tests/api/auth-nextauth.test.ts

jest.mock("next-auth", () => {
  // Create the handler inside the factory so it exists before route.ts evaluates
  const handler = jest.fn();
  (global as any).__mockNextAuthHandler = handler;
  return jest.fn(() => handler);
});

jest.mock("@/lib/auth", () => ({
  authOptions: { providers: [] },
}));

jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    NextResponse: {
      json: jest.fn((body, init) => ({ body, init })),
    },
  };
});

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({
    success: true,
    limit: 5,
    remaining: 4,
    resetIn: 60,
  }),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
  AUTH_RATE_LIMIT: { limit: 5, windowSeconds: 60 },
}));

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";
import { checkRateLimit } from "@/lib/rate-limit";
const { NextRequest } = jest.requireActual("next/server");

const mockHandler = (global as any).__mockNextAuthHandler as jest.Mock;
const mockedCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

type ApiResponse<T> = { body: T; init?: { status: number } };

describe("API Integration Tests: NextAuth Routes", () => {
  const makeCtx = () => ({
    params: Promise.resolve({ nextauth: ["callback", "credentials"] }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler.mockResolvedValue(new Response("OK", { status: 200 }));
    mockedCheckRateLimit.mockReturnValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetIn: 60,
    });
  });

  describe("GET /api/auth/[...nextauth]", () => {
    it("passes through to NextAuth handler", async () => {
      const req = new NextRequest("http://localhost/api/auth/session");
      const ctx = { params: Promise.resolve({ nextauth: ["session"] }) };

      await GET(req, ctx);

      expect(mockHandler).toHaveBeenCalledWith(req, ctx);
    });
  });

  describe("POST /api/auth/[...nextauth]", () => {
    it("passes through on non-credentials path", async () => {
      const req = new NextRequest(
        "http://localhost/api/auth/callback/github",
        { method: "POST" }
      );
      const ctx = { params: Promise.resolve({ nextauth: ["callback", "github"] }) };

      await POST(req, ctx);

      expect(mockedCheckRateLimit).not.toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(req, ctx);
    });

    it("returns 429 when rate limited on /callback/credentials", async () => {
      mockedCheckRateLimit.mockReturnValueOnce({
        success: false,
        limit: 5,
        remaining: 0,
        resetIn: 30,
      });

      const req = new NextRequest(
        "http://localhost/api/auth/callback/credentials",
        { method: "POST" }
      );

      const res = (await POST(req, makeCtx())) as unknown as ApiResponse<{
        error: string;
      }>;

      expect(res.body).toEqual({
        error: "Too many login attempts. Please try again later.",
      });
      expect(res.init?.status).toBe(429);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("passes through when rate limit allows credentials", async () => {
      const req = new NextRequest(
        "http://localhost/api/auth/callback/credentials",
        { method: "POST" }
      );

      await POST(req, makeCtx());

      expect(mockedCheckRateLimit).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalled();
    });

    it("propagates handler errors (return without await)", async () => {
      mockHandler.mockRejectedValueOnce(new Error("Auth error"));

      const req = new NextRequest(
        "http://localhost/api/auth/callback/credentials",
        { method: "POST" }
      );

      await expect(POST(req, makeCtx())).rejects.toThrow("Auth error");
    });
  });
});
