import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

/*
 * Password-reset links. SERVER ONLY.
 *
 * The token is stateless — there is no table behind it. It carries the tutor
 * id and an expiry, and its signature also covers the tutor's *current*
 * password hash. Setting a new password changes that hash, so a link stops
 * working the moment it has been used (and every older link with it), without
 * anything to store or clean up.
 */

/** How long an emailed reset link stays usable. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export const RESET_TOKEN_TTL_MINUTES = RESET_TOKEN_TTL_MS / 60_000;

interface ResetPayload {
  sub: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not defined in environment variables.");
  }

  return secret;
}

/**
 * The prefix keeps these signatures from ever matching a session cookie's,
 * which are HMACs of the bare encoded payload under the same secret.
 */
function sign(encoded: string, passwordHash: string): Buffer {
  return createHmac("sha256", getSecret())
    .update(`password-reset:${encoded}:${passwordHash}`)
    .digest();
}

export function createPasswordResetToken(tutor: {
  id: string;
  passwordHash: string;
}): string {
  const payload: ResetPayload = {
    sub: tutor.id,
    exp: Date.now() + RESET_TOKEN_TTL_MS,
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString(
    "base64url"
  );

  return `${encoded}.${sign(encoded, tutor.passwordHash).toString("base64url")}`;
}

function decodePayload(encoded: string): ResetPayload | null {
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    );

    if (typeof payload?.sub !== "string" || typeof payload?.exp !== "number") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * The tutor a live token belongs to, or `null` for anything else — malformed,
 * expired, already used, or for an account that no longer exists. Callers
 * can't tell those apart, and don't need to: each means "request a new link".
 */
export async function findTutorByResetToken(token: string) {
  const [encoded, signature, ...rest] = token.split(".");

  if (!encoded || !signature || rest.length > 0) {
    return null;
  }

  const payload = decodePayload(encoded);

  if (!payload || payload.exp <= Date.now()) {
    return null;
  }

  const tutor = await prisma.tutor.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      fullName: true,
      email: true,
      passwordHash: true,
      sessionVersion: true,
    },
  });

  if (!tutor) {
    return null;
  }

  const expected = sign(encoded, tutor.passwordHash);
  const actual = Buffer.from(signature, "base64url");

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  return tutor;
}
