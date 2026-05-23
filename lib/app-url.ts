export function getInternalAppOrigin() {
  const configuredUrl =
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      return `http://localhost:${process.env.PORT || "3000"}`;
    }

    throw new Error("Missing NEXTAUTH_URL or APP_URL for internal API requests");
  }

  return new URL(configuredUrl).origin;
}
