import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

// Context type for App Router dynamic routes
type RouteContext = { params: Promise<{ nextauth: string[] }> };

// GET requests don't need rate limiting (callbacks, session checks, etc.)
export async function GET(request: NextRequest, context: RouteContext) {
  return handler(request, context);
}

// Rate limit POST requests (sign in attempts)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const url = new URL(request.url);

    // Only rate limit the signin endpoint
    if (url.pathname.endsWith("/callback/credentials")) {
      const clientIp = getClientIp(request);
      const rateLimitResult = checkRateLimit(`auth:${clientIp}`, AUTH_RATE_LIMIT);

      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: "Too many login attempts. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimitResult.resetIn),
              "X-RateLimit-Limit": String(rateLimitResult.limit),
              "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            },
          }
        );
      }
    }

    // Pass through to NextAuth handler with context
    return handler(request, context);
  } catch (error) {
    console.error("NextAuth POST error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
