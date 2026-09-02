import { getInternalAppOrigin } from "@/lib/app-url";

describe("getInternalAppOrigin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXTAUTH_URL;
    delete process.env.APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.PORT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses NEXTAUTH_URL when configured", () => {
    process.env.NEXTAUTH_URL = "https://app.example.com/some/path";

    expect(getInternalAppOrigin()).toBe("https://app.example.com");
  });

  it("uses APP_URL when NEXTAUTH_URL is not configured", () => {
    process.env.APP_URL = "https://subscriptions.example.com";

    expect(getInternalAppOrigin()).toBe("https://subscriptions.example.com");
  });

  it("uses VERCEL_URL when no app URL is configured", () => {
    process.env.VERCEL_URL = "subscription-tracker.vercel.app";

    expect(getInternalAppOrigin()).toBe("https://subscription-tracker.vercel.app");
  });

  it("allows a localhost fallback in test and development", () => {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "test";
    process.env.PORT = "4000";

    expect(getInternalAppOrigin()).toBe("http://localhost:4000");
  });
});
