// ==========================================
// PUBLIC TUTOR PROFILE LINK
// ==========================================
//
// An admin sends `/tutor-profile/<token>` to parents who want to see a
// candidate. Anyone holding the link can read it, so the token is 32
// random bytes stored on the row (`Tutor.profileShareToken`), never
// anything derived from the tutor's id — regenerating or clearing it is
// how a link is revoked. Every link also expires on its own
// `PROFILE_LINK_LIFETIME_DAYS` after it was created or reset
// (`Tutor.profileShareExpiresAt`).
//
// The page shows the tutor's documents, government ID included, but
// leaves out their contact details and exact address: parents reach the
// tutor through the agency.
//
// With `PARENT_PROFILE_URL` set (production: the parent subdomain), the
// link an admin copies is `<that origin>/<token>` instead, and
// `src/proxy.ts` maps it back onto `/tutor-profile/<token>`. Links made
// on the main domain keep working either way.
//
// Imported by client components too, so nothing server-only at module
// level — the token itself is minted in
// `api/admin/tutors/[id]/share/route.ts`, and the database lookup lives
// in `tutor-profile-server.ts`.
//
// ==========================================

export const PROFILE_LINK_LIFETIME_DAYS = 30;

/** Only these documents are reachable through a public link. */
export const PUBLIC_PROFILE_DOCUMENTS = {
  transcript: "transcriptUrl",
  entranceResult: "entranceResultUrl",
  graduationDocument: "graduationDocumentUrl",
  governmentId: "governmentIdUrl",
  cv: "cvUrl",
} as const;

export type PublicProfileDocument =
  keyof typeof PUBLIC_PROFILE_DOCUMENTS;

export function isPublicProfileDocument(
  value: string
): value is PublicProfileDocument {
  return Object.prototype.hasOwnProperty.call(
    PUBLIC_PROFILE_DOCUMENTS,
    value
  );
}

/** 32 random bytes, base64url: always exactly 43 characters. */
export const PROFILE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function profileSharePath(token: string) {
  return `/tutor-profile/${token}`;
}

/**
 * The parent subdomain's origin, or null when it is not configured (local
 * development) or not a valid URL. Server-side only: it reads a non-public
 * env var, which is undefined in the browser.
 */
export function getParentProfileOrigin(): URL | null {
  const raw = process.env.PARENT_PROFILE_URL?.trim();

  if (!raw) {
    return null;
  }

  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * Everything before the token in a shareable link: the parent subdomain
 * when configured, otherwise the profile route on the site the admin is
 * using (`siteOrigin`).
 */
export function profileShareLinkBase(siteOrigin: string) {
  const parentOrigin = getParentProfileOrigin();

  return parentOrigin
    ? parentOrigin.origin
    : `${siteOrigin}/tutor-profile`;
}

export function profileDocumentPath(
  token: string,
  document: PublicProfileDocument
) {
  return `/api/tutor-profile/${token}/${document}`;
}
