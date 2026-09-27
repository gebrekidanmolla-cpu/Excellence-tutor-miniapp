import { NextResponse } from "next/server";
import { getSignedDownloadUrl } from "@/lib/r2";
import { findSharedTutor } from "@/lib/tutor-profile-server";
import {
  isPublicProfileDocument,
  PUBLIC_PROFILE_DOCUMENTS,
} from "@/lib/tutor-profile";

type RouteContext = {
  params: Promise<{
    token: string;
    document: string;
  }>;
};

/**
 * The public counterpart of `/api/admin/tutors/[id]/documents/[document]`:
 * a live (unexpired, unrevoked) share token stands in for the admin
 * session. 302s to a 10-minute presigned GET, so the
 * `<img>` tags on `/tutor-profile/[token]` keep working however long the
 * page stays open — each load re-signs.
 */
export async function GET(
  request: Request,
  { params }: RouteContext
) {
  const { token, document } = await params;

  if (!isPublicProfileDocument(document)) {
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 }
    );
  }

  try {
    const tutor = await findSharedTutor(token, {
      transcriptUrl: true,
      entranceResultUrl: true,
      graduationDocumentUrl: true,
      governmentIdUrl: true,
      cvUrl: true,
    });

    const key =
      tutor?.[PUBLIC_PROFILE_DOCUMENTS[document]];

    if (!key) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    const signedUrl = await getSignedDownloadUrl(
      key,
      60 * 10
    );

    const response = NextResponse.redirect(signedUrl);

    // A cached redirect would outlive both the signature and a
    // revoked link.
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error(
      "Public tutor document access error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to open the document." },
      { status: 500 }
    );
  }
}
