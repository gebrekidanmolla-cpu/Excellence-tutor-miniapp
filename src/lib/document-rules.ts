/**
 * Size and type rules for tutor documents — the single source for the
 * registration form (`src/app/register/schema.ts`) and the server
 * (`src/lib/upload-document.ts`, `/api/auth/register`).
 *
 * Safe to import from client and server code alike: no Node APIs, and no
 * reference to `File` at module scope.
 */

export type DocumentKind = "document" | "cv" | "photo";

export const DOCUMENT_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
export const CV_MAX_SIZE = 3 * 1024 * 1024; // 3 MB

/**
 * Every document travels in one request, and Vercel rejects function
 * request bodies over 4.5 MB before the route ever runs. 4 MB of files
 * leaves room for the text fields and multipart overhead. Per-file limits
 * alone can't guarantee this — four 2 MB documents plus a CV would pass
 * each check individually.
 */
export const TOTAL_UPLOAD_MAX_SIZE = 4 * 1024 * 1024; // 4 MB

export const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ALLOWED_CV_TYPES = [...ALLOWED_DOCUMENT_TYPES, "application/pdf"];

export const DOCUMENT_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const CV_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

/**
 * The profile photo is uploaded on its own from `/tutor/profile`, after
 * registration, so it is outside the 4 MB combined registration limit.
 */
export const PHOTO_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
export const PHOTO_ACCEPT = DOCUMENT_ACCEPT;

export function documentRules(kind: DocumentKind) {
  if (kind === "photo") {
    return {
      maxSize: PHOTO_MAX_SIZE,
      allowedTypes: ALLOWED_DOCUMENT_TYPES,
      typeLabel: "a JPG, PNG or WEBP image",
    };
  }

  return kind === "cv"
    ? {
        maxSize: CV_MAX_SIZE,
        allowedTypes: ALLOWED_CV_TYPES,
        typeLabel: "a JPG, PNG, WEBP image or a PDF",
      }
    : {
        maxSize: DOCUMENT_MAX_SIZE,
        allowedTypes: ALLOWED_DOCUMENT_TYPES,
        typeLabel: "a JPG, PNG or WEBP image",
      };
}

/**
 * The browser's mirror of the server's checks in `prepareDocument`, so an
 * obvious mistake fails before uploading. It trusts `file.type`; the server
 * re-judges the type from the file's bytes. Empty string when acceptable.
 */
export function pickedFileProblem(
  file: { size: number; type: string },
  kind: DocumentKind
): string {
  const { maxSize, allowedTypes, typeLabel } = documentRules(kind);

  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (!allowedTypes.includes(file.type)) {
    return `Please choose ${typeLabel}.`;
  }

  if (file.size > maxSize) {
    return `File must be ${formatMegabytes(maxSize, 0)} or smaller.`;
  }

  return "";
}

export function formatMegabytes(bytes: number, digits = 1): string {
  return `${(bytes / (1024 * 1024)).toFixed(digits)} MB`;
}
