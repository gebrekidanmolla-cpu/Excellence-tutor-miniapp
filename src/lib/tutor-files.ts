/**
 * A tutor's own files, as the tutor portal sees them — served by
 * `/api/tutor/files/[kind]`, which checks the tutor session instead of the
 * admin one.
 *
 * Every stored file can be viewed; only the optional ones (photo, CV) can be
 * uploaded, replaced or removed after registration. The required documents
 * were checked when the account was created, so changing them goes through
 * the Excellence Tutor team.
 *
 * Safe to import from client components: no Node APIs.
 */

import type { DocumentKind } from "@/lib/document-rules";

export const TUTOR_FILE_COLUMNS = {
  photo: "profilePhotoUrl",
  transcript: "transcriptUrl",
  entranceResult: "entranceResultUrl",
  governmentId: "governmentIdUrl",
  graduationDocument: "graduationDocumentUrl",
  cv: "cvUrl",
} as const;

export type TutorFileKind = keyof typeof TUTOR_FILE_COLUMNS;

export function isTutorFileKind(value: string): value is TutorFileKind {
  return Object.prototype.hasOwnProperty.call(TUTOR_FILE_COLUMNS, value);
}

/** The files a tutor may upload, replace and remove themselves. */
export const EDITABLE_TUTOR_FILES = {
  photo: { rules: "photo", label: "Profile photo" },
  cv: { rules: "cv", label: "CV" },
} as const satisfies Record<string, { rules: DocumentKind; label: string }>;

export type EditableTutorFileKind = keyof typeof EDITABLE_TUTOR_FILES;

export function isEditableTutorFileKind(
  value: string
): value is EditableTutorFileKind {
  return Object.prototype.hasOwnProperty.call(EDITABLE_TUTOR_FILES, value);
}

/**
 * The URL a tutor-portal page uses for one of the tutor's own files, or null
 * when none is stored. The object key's tail goes in the query string, so a
 * replaced photo gets a new URL and the browser never shows the cached one.
 */
export function tutorFileHref(
  kind: TutorFileKind,
  key: string | null | undefined
): string | null {
  if (!key) {
    return null;
  }

  const version = key.slice(key.lastIndexOf("/") + 1).slice(-12);

  return `/api/tutor/files/${kind}?v=${encodeURIComponent(version)}`;
}
