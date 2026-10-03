/**
 * The tutor files an admin can open, in the order the documents menu lists
 * them. Each `kind` is a path segment of
 * `/api/admin/tutors/[id]/documents/[document]`, which checks the admin
 * session and 302s to a short-lived signed URL.
 *
 * Client-safe: list pages send only the `kind`s a tutor actually has, never
 * the storage keys behind them.
 */
export const TUTOR_DOCUMENTS = [
  { kind: "transcript", column: "transcriptUrl", label: "Transcript" },
  { kind: "entranceResult", column: "entranceResultUrl", label: "Entrance result" },
  { kind: "governmentId", column: "governmentIdUrl", label: "Government ID" },
  {
    kind: "graduationDocument",
    column: "graduationDocumentUrl",
    label: "Graduation document",
  },
  { kind: "cv", column: "cvUrl", label: "CV / Resume" },
  { kind: "profilePhoto", column: "profilePhotoUrl", label: "Profile photo" },
] as const;

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

export function documentLabel(kind: TutorDocumentKind): string {
  return TUTOR_DOCUMENTS.find((document) => document.kind === kind)?.label ?? kind;
}

export function adminDocumentHref(tutorId: string, kind: TutorDocumentKind) {
  return `/api/admin/tutors/${tutorId}/documents/${kind}`;
}
