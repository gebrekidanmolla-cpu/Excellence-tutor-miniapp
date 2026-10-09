import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { getSignedDownloadUrl } from "@/lib/r2";
import {
  DocumentError,
  deleteDocuments,
  prepareDocument,
  storeDocument,
} from "@/lib/upload-document";
import {
  TUTOR_DOCUMENT_SELECT,
  isRequiredDocument,
  isTutorDocumentKind,
  tutorDocument,
} from "@/lib/admin-documents";

/*
 * One of a tutor's files, for an admin (kinds in `src/lib/admin-documents.ts`).
 *
 *   GET    — 302 to a 10-minute presigned URL.
 *   POST   — upload or replace the file (multipart, field `file`).
 *   DELETE — remove it, unless the tutor is required to have one.
 *
 * Uploads go through the same checks as registration (`prepareDocument`
 * judges the type by the file's bytes). As in `/api/tutor/files/[kind]`, a
 * replaced or removed object is deleted from R2 only after the row stops
 * pointing at it, so a failure in between leaves an orphaned object at
 * worst, never a row naming a missing one.
 */

type RouteContext = {
  params: Promise<{
    id: string;
    document: string;
  }>;
};

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    // =====================================================
    // ADMIN AUTHENTICATION
    // =====================================================

    const admin = await getCurrentAdmin();

    if (!admin) {
      return fail("Unauthorized.", 401);
    }

    // =====================================================
    // ROUTE PARAMETERS
    // =====================================================

    const { id, document } = await params;

    if (!isTutorDocumentKind(document)) {
      return fail("Invalid document type.", 400);
    }

    const fieldName = tutorDocument(document).column;

    // =====================================================
    // FIND TUTOR
    // =====================================================

    const tutor = await prisma.tutor.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        [fieldName]: true,
      },
    });

    if (!tutor) {
      return fail("Tutor not found.", 404);
    }

    const storagePath =
      tutor[fieldName as keyof typeof tutor];

    if (
      typeof storagePath !== "string" ||
      !storagePath
    ) {
      return fail("Document not found.", 404);
    }

    // =====================================================
    // GENERATE SIGNED URL
    // =====================================================

    let signedUrl: string;

    try {
      signedUrl =
        await getSignedDownloadUrl(
          storagePath,
          60 * 10 // 10 minutes
        );
    } catch (error) {
      console.error(
        "Failed to create signed document URL:",
        error
      );

      return fail("Failed to access the document.", 500);
    }

    // =====================================================
    // REDIRECT TO STORED DOCUMENT
    // =====================================================

    return NextResponse.redirect(
      signedUrl
    );
  } catch (error) {
    console.error(
      "Admin document access error:",
      error
    );

    return fail(
      "Something went wrong while opening the document.",
      500
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  const { id, document } = await params;

  if (!isTutorDocumentKind(document)) {
    return fail("Invalid document type.", 400);
  }

  const { column, label, rules } = tutorDocument(document);

  let newKey: string | null = null;

  try {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return fail("Invalid upload request.", 400);
    }

    const entry = formData.get("file");

    if (!(entry instanceof File) || entry.size === 0) {
      return fail("Please choose a file to upload.", 400);
    }

    const existing = await prisma.tutor.findUnique({
      where: { id },
      select: TUTOR_DOCUMENT_SELECT,
    });

    if (!existing) {
      return fail("Tutor not found.", 404);
    }

    const previousKey = existing[column];

    const prepared = await prepareDocument(entry, rules, label);

    newKey = `tutors/${id}/${document}-${randomUUID()}`;
    await storeDocument(newKey, prepared);

    await prisma.tutor.update({
      where: { id },
      data: { [column]: newKey },
    });

    newKey = null;

    if (previousKey) {
      await deleteDocuments([previousKey]);
    }

    return NextResponse.json({
      success: true,
      message: `${label} saved.`,
    });
  } catch (error) {
    if (newKey) {
      await deleteDocuments([newKey]);
    }

    if (error instanceof DocumentError) {
      return fail(error.message, 400);
    }

    console.error("Admin document upload error:", error);

    return fail("Couldn't save the file. Please try again.", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  const { id, document } = await params;

  if (!isTutorDocumentKind(document)) {
    return fail("Invalid document type.", 400);
  }

  const { column, label } = tutorDocument(document);

  try {
    const existing = await prisma.tutor.findUnique({
      where: { id },
      select: { tutorStatus: true, ...TUTOR_DOCUMENT_SELECT },
    });

    if (!existing) {
      return fail("Tutor not found.", 404);
    }

    if (isRequiredDocument(document, existing.tutorStatus)) {
      return fail(
        `${label} is required for this tutor, so it can be replaced but not removed.`,
        400
      );
    }

    const previousKey = existing[column];

    if (previousKey) {
      await prisma.tutor.update({
        where: { id },
        data: { [column]: null },
      });

      await deleteDocuments([previousKey]);
    }

    return NextResponse.json({
      success: true,
      message: `${label} removed.`,
    });
  } catch (error) {
    console.error("Admin document delete error:", error);

    return fail("Couldn't remove the file. Please try again.", 500);
  }
}
