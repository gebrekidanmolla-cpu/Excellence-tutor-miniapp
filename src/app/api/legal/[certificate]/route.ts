import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getTutorId } from "@/lib/session";
import {
  LEGAL_CERTIFICATES,
  isLegalCertificate,
  type LegalCertificate,
} from "@/lib/legal-certificates";

/*
 * One of the agency's original certificates (see
 * `src/lib/legal-certificates.ts`), for signed-in tutors only, like `/legal`
 * itself. The files are read from disk, so `next.config.ts` lists them under
 * `outputFileTracingIncludes` for this route — without that entry they are
 * missing from the Vercel function bundle.
 *
 * Opened from a link rather than fetched, so a visitor without a session is
 * sent to sign in (and back to `/legal`) instead of shown a JSON 401.
 */

type RouteContext = {
  params: Promise<{ certificate: string }>;
};

const DIRECTORY = path.join(process.cwd(), "src/assets/legal");

/* The files never change during a deployment, so each instance reads them once. */
const cache = new Map<LegalCertificate, Uint8Array<ArrayBuffer>>();

async function loadCertificate(certificate: LegalCertificate) {
  let body = cache.get(certificate);

  if (!body) {
    body = new Uint8Array(
      await readFile(path.join(DIRECTORY, LEGAL_CERTIFICATES[certificate].file))
    );
    cache.set(certificate, body);
  }

  return body;
}

export async function GET(request: Request, { params }: RouteContext) {
  const tutorId = await getTutorId();

  if (!tutorId) {
    return NextResponse.redirect(new URL("/login?next=/legal", request.url));
  }

  const { certificate } = await params;

  if (!isLegalCertificate(certificate)) {
    return NextResponse.json(
      { success: false, message: "Certificate not found." },
      { status: 404 }
    );
  }

  try {
    const body = await loadCertificate(certificate);

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${LEGAL_CERTIFICATES[certificate].downloadName}"`,
        /* Browser-only: the response depends on the session cookie. */
        "Cache-Control": "private, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("Failed to read legal certificate:", error);

    return NextResponse.json(
      { success: false, message: "Unable to open the certificate." },
      { status: 500 }
    );
  }
}
