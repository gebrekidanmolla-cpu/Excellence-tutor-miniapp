// Server half of `tutor-profile.ts`: the lookups that touch the database.
// Kept apart because `tutor-profile.ts` is also imported by client code.

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  PROFILE_LINK_LIFETIME_DAYS,
  PROFILE_TOKEN_PATTERN,
  profileShareLinkBase,
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

/** The token to build a copied link from, or null when no live link exists. */
export function liveShareToken(
  token: string | null,
  expiresAt: Date | null
) {
  return token && !isProfileShareExpired(expiresAt) ? token : null;
}

/**
 * Everything before the token in a link an admin copies. The link is pasted
 * into chats, so it has to be absolute: without the parent subdomain
 * configured it falls back to this request's own host, which is right in
 * every environment.
 */
export async function getProfileShareLinkBase() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  return profileShareLinkBase(host ? `${protocol}://${host}` : "");
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
