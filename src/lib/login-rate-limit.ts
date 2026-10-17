import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/auth";
import { requestIp } from "@/lib/email-verification";

/*
 * Brute-force limit for `/api/auth/login` and `/api/admin/auth/login`.
 * SERVER ONLY.
 *
 * Counts *failed* attempts in a sliding window, per submitted email and per
 * IP, in Postgres — per-instance memory would not hold on Vercel. Checked
 * before the password, so a blocked request never reaches bcrypt and cannot
 * be used to test one. Keyed on the submitted email rather than the account,
 * so the response is the same whether or not the account exists.
 *
 * Not atomic: a burst of parallel requests can overshoot a limit by a few
 * attempts before the rows land. bcrypt's cost bounds how far.
 */

export type LoginScope = "TUTOR" | "ADMIN";

const WINDOW_MS = 15 * 60 * 1000;

/** Rows older than this carry no information any more. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

/*
 * Per-IP limits are loose for the same reason as `IP_LIMITS` in
 * `email-verification.ts`: carriers put many users behind one address.
 */
const LIMITS: Record<LoginScope, { perEmail: number; perIp: number }> = {
  TUTOR: { perEmail: 10, perIp: 50 },
  ADMIN: { perEmail: 5, perIp: 15 },
};

export const LOGIN_RATE_LIMITED_MESSAGE =
  "Too many failed sign-in attempts. Please wait 15 minutes and try again.";

export const LOGIN_RETRY_AFTER_SECONDS = WINDOW_MS / 1000;

/** True when this email or IP has used up its failures for the window. */
export async function isLoginRateLimited(
  scope: LoginScope,
  email: string,
  request: Request
): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const ip = requestIp(request);
  const limits = LIMITS[scope];

  const [emailFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: { scope, email, createdAt: { gt: since } },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: { scope, ip, createdAt: { gt: since } },
        })
      : 0,
  ]);

  return emailFailures >= limits.perEmail || ipFailures >= limits.perIp;
}

export async function recordLoginFailure(
  scope: LoginScope,
  email: string,
  request: Request
): Promise<void> {
  const now = Date.now();

  await prisma.loginAttempt.create({
    data: { scope, email, ip: requestIp(request) },
  });

  // Opportunistic cleanup, like `send-email-code`.
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(now - RETENTION_MS) } },
  });
}

/** A successful sign-in forgives that email's earlier typos. */
export async function clearLoginFailures(
  scope: LoginScope,
  email: string
): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { scope, email } });
}

let dummyHash: Promise<string> | null = null;

/**
 * Burns the same bcrypt time as a real check when no account matches, so
 * response timing doesn't reveal which emails are registered.
 */
export async function compareAgainstDummyHash(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));

  await comparePassword(password, await dummyHash);
}
