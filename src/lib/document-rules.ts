/**
 * Size and type rules for tutor documents — the single source for the
 * registration form (`src/app/register/schema.ts`) and the server
 * (`src/lib/upload-document.ts`, `/api/auth/register`).
 *
 * Safe to import from client and server code alike: no Node APIs, and no
 * reference to `File` at module scope.
 */

export type DocumentKind = "document" | "cv";

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

export function documentRules(kind: DocumentKind) {
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

export function formatMegabytes(bytes: number, digits = 1): string {
  return `${(bytes / (1024 * 1024)).toFixed(digits)} MB`;
}
