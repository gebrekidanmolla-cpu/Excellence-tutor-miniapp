import { createHmac, timingSafeEqual } from "crypto";

/*
 * Shared by `/api/auth/send-email-code`, `/api/auth/verify-email-code` and
 * `/api/auth/register`. SERVER ONLY.
 */

/** How long a sent code can be entered. */
export const CODE_TTL_MS = 10 * 60 * 1000;

/**
 * How long a verified address stays usable for registration. Long enough for
 * a full sitting of the wizard — finding and photographing documents takes
 * well over the 10 minutes a code lives.
 */
export const VERIFIED_TTL_MS = 2 * 60 * 60 * 1000;

export const RESEND_COOLDOWN_MS = 60 * 1000;

export const MAX_ATTEMPTS = 5;

/**
 * Per-IP limits on sending codes. Each code sent to an address that does not
 * exist bounces, and hard bounces feed the mail host's suppression list — so
 * spraying addresses from one machine can damage delivery for the whole site.
 * Deliberately loose: Ethiopian mobile carriers put many users behind one
 * public address.
 */
export const IP_LIMITS = [
  { windowMs: 15 * 60 * 1000, max: 10 },
  { windowMs: 24 * 60 * 60 * 1000, max: 40 },
] as const;

/** Rows older than the longest IP window carry no information any more. */
export const RECORD_RETENTION_MS = IP_LIMITS[IP_LIMITS.length - 1].windowMs;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not defined in environment variables.");
  }

  return secret;
}

/**
 * Keyed and bound to the address, so a leaked table cannot be reversed by
 * hashing all million 6-digit codes.
 */
export function hashVerificationCode(email: string, code: string): string {
  return createHmac("sha256", getSecret())
    .update(`${email}:${code}`)
    .digest("hex");
}

export function verificationCodeMatches(
  email: string,
  code: string,
  storedHash: string
): boolean {
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashVerificationCode(email, code), "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * The caller's IP. On Vercel both headers are set by the platform and cannot
 * be spoofed by the client; locally they are usually absent.
 */
export function requestIp(request: Request): string | null {
  const realIp = request.headers.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];

  return forwarded?.trim() || null;
}
