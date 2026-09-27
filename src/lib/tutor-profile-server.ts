// Server half of `tutor-profile.ts`: the lookups that touch the database.
// Kept apart because `tutor-profile.ts` is also imported by client code.

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  PROFILE_LINK_LIFETIME_DAYS,
  PROFILE_TOKEN_PATTERN,
} from "@/lib/tutor-profile";

/** When a link created or reset right now stops working. */
export function newProfileShareExpiry() {
  return new Date(
    Date.now() + PROFILE_LINK_LIFETIME_DAYS * 24 * 60 * 60 * 1000
  );
}

/** Whether a stored expiry has passed. No expiry counts as expired. */
export function isProfileShareExpired(expiresAt: Date | null) {
  return !expiresAt || expiresAt.getTime() <= Date.now();
}

/**
 * The tutor behind a live share link, or null for a malformed, unknown,
 * revoked or expired token — callers treat every one of those as a 404.
 * Used by both the profile page and its document route, so the expiry rule
 * cannot drift between them.
 */
export async function findSharedTutor<S extends Prisma.TutorSelect>(
  token: string,
  select: S
) {
  if (!PROFILE_TOKEN_PATTERN.test(token)) {
    return null;
  }

  return prisma.tutor.findFirst({
    where: {
      profileShareToken: token,
      profileShareExpiresAt: { gt: new Date() },
    },
    select,
  });
}
