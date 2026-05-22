import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost"]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 && second === 254 ||
    first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168 ||
    first >= 224
  );
}

function isBlockedIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function getWebhookUrlSafetyError(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return "Webhook URL must be a valid URL";
  }

  if (parsed.protocol !== "https:") {
    return "Webhook URL must use HTTPS";
  }

  if (parsed.username || parsed.password) {
    return "Webhook URL must not include credentials";
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return "Webhook URL host is not allowed";
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateIpv4(hostname)) {
    return "Webhook URL host is not allowed";
  }

  if (ipVersion === 6 && isBlockedIpv6(hostname)) {
    return "Webhook URL host is not allowed";
  }

  return null;
}

export function assertSafeWebhookUrl(value: string) {
  const error = getWebhookUrlSafetyError(value);
  if (error) {
    throw new Error(error);
  }
}
