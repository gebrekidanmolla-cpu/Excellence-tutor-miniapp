import type { DocumentKind } from "@/lib/document-rules";

/**
 * The tutor files an admin can open, in the order the documents menu lists
 * them. Each `kind` is a path segment of
 * `/api/admin/tutors/[id]/documents/[document]`, which checks the admin
 * session: GET 302s to a short-lived signed URL, POST uploads or replaces
 * the file, DELETE removes one that isn't required. `rules` names the
 * size/type limits in `document-rules.ts` an upload is held to.
 *
 * Client-safe: list pages send only the `kind`s a tutor actually has, never
 * the storage keys behind them.
 */
export const TUTOR_DOCUMENTS = [
  { kind: "transcript", column: "transcriptUrl", label: "Transcript", rules: "document" },
  {
    kind: "entranceResult",
    column: "entranceResultUrl",
    label: "Entrance result",
    rules: "document",
  },
  { kind: "governmentId", column: "governmentIdUrl", label: "Government ID", rules: "document" },
  {
    kind: "graduationDocument",
    column: "graduationDocumentUrl",
    label: "Graduation document",
    rules: "document",
  },
  { kind: "cv", column: "cvUrl", label: "CV / Resume", rules: "cv" },
  { kind: "profilePhoto", column: "profilePhotoUrl", label: "Profile photo", rules: "photo" },
] as const satisfies readonly {
  kind: string;
  column: string;
  label: string;
  rules: DocumentKind;
}[];

export type TutorDocumentKind = (typeof TUTOR_DOCUMENTS)[number]["kind"];

type DocumentColumn = (typeof TUTOR_DOCUMENTS)[number]["column"];

/** Spread into a Prisma `tutor` select to load what `availableDocuments` reads. */
export const TUTOR_DOCUMENT_SELECT = {
  transcriptUrl: true,
  entranceResultUrl: true,
  governmentIdUrl: true,
  graduationDocumentUrl: true,
  cvUrl: true,
  profilePhotoUrl: true,
} as const satisfies Record<DocumentColumn, true>;

export function availableDocuments(
  tutor: Record<DocumentColumn, string | null>
): TutorDocumentKind[] {
  return TUTOR_DOCUMENTS.filter(({ column }) => Boolean(tutor[column])).map(
    ({ kind }) => kind
  );
}

export function isTutorDocumentKind(value: string): value is TutorDocumentKind {
  return TUTOR_DOCUMENTS.some((document) => document.kind === value);
}

export function tutorDocument(kind: TutorDocumentKind) {
  return TUTOR_DOCUMENTS.find((document) => document.kind === kind)!;
}

export function documentLabel(kind: TutorDocumentKind): string {
  return TUTOR_DOCUMENTS.find((document) => document.kind === kind)?.label ?? kind;
}

/**
 * Whether a tutor of this type must have the file, as registration requires.
 * A required file can be replaced but never removed — three of the columns
 * aren't even nullable.
 */
export function isRequiredDocument(
  kind: TutorDocumentKind,
  tutorStatus: string
): boolean {
  if (kind === "graduationDocument") {
    return tutorStatus === "GRADUATE";
  }

  return kind === "transcript" || kind === "entranceResult" || kind === "governmentId";
}

/**
 * Pass the stored `key` where the page has it: its tail goes in the query
 * string, as in `tutorFileHref`, so a replaced file gets a new URL and an
 * `<img>` re-renders with the new picture instead of the one it already has.
 */
export function adminDocumentHref(
  tutorId: string,
  kind: TutorDocumentKind,
  key?: string | null
) {
  const href = `/api/admin/tutors/${tutorId}/documents/${kind}`;

  if (!key) {
    return href;
  }

  const version = key.slice(key.lastIndexOf("/") + 1).slice(-12);

  return `${href}?v=${encodeURIComponent(version)}`;
}
