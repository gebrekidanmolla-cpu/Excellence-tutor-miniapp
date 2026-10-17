/**
 * The agency's original Trade Bureau certificates, as issued (PDF), kept in
 * `src/assets/legal/` and served to signed-in tutors only by
 * `GET /api/legal/[certificate]`. `/legal` links each card to its file.
 *
 * Unlike the page's transcription, the originals show the owner's photo,
 * phone number and house number; the user chose to publish them that way.
 */
export const LEGAL_CERTIFICATES = {
  "commercial-registration": {
    file: "commercial-registration-certificate.pdf",
    downloadName: "Excellence Tutor - Commercial Registration Certificate.pdf",
  },
  "trade-name-registration": {
    file: "trade-name-registration-certificate.pdf",
    downloadName: "Excellence Tutor - Trade Name Registration Certificate.pdf",
  },
} as const;

export type LegalCertificate = keyof typeof LEGAL_CERTIFICATES;

export function isLegalCertificate(value: string): value is LegalCertificate {
  return Object.hasOwn(LEGAL_CERTIFICATES, value);
}

export function legalCertificateHref(certificate: LegalCertificate): string {
  return `/api/legal/${certificate}`;
}
