import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getTutorId } from "@/lib/session";
import { getSignedDownloadUrl } from "@/lib/r2";
import {
  DocumentError,
  deleteDocuments,
  prepareDocument,
  storeDocument,
} from "@/lib/upload-document";
import {
  EDITABLE_TUTOR_FILES,
  TUTOR_FILE_COLUMNS,
  isEditableTutorFileKind,
  isTutorFileKind,
} from "@/lib/tutor-files";

/*
 * The signed-in tutor's own files (see `src/lib/tutor-files.ts`).
 *
 *   GET    — 302 to a 10-minute presigned URL, like the admin route.
 *   POST   — upload or replace the photo / CV (multipart, field `file`).
 *   DELETE — remove the photo / CV.
 *
 * A replaced or removed object is deleted from R2 only after the row stops
 * pointing at it, so a failure in between leaves an orphaned object at
 * worst, never a row naming a missing one.
 */

type RouteContext = {
  params: Promise<{ kind: string }>;
};

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const tutorId = await getTutorId();

  if (!tutorId) {
    return fail("Unauthorized.", 401);
  }

  const { kind } = await params;

  if (!isTutorFileKind(kind)) {
    return fail("File not found.", 404);
  }

  try {
    const column = TUTOR_FILE_COLUMNS[kind];

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      select: { [column]: true },
    });

    const key = tutor?.[column as keyof typeof tutor];

    if (typeof key !== "string" || !key) {
      return fail("File not found.", 404);
    }

    const response = NextResponse.redirect(
      await getSignedDownloadUrl(key, 60 * 10)
    );

    // Pages add `?v=` from the key, so a replaced file gets a new URL; a
    // short private cache spares a re-sign on every navigation, and stays
    // well inside the signature's lifetime.
    response.headers.set("Cache-Control", "private, max-age=300");

    return response;
  } catch (error) {
    console.error("Tutor file access error:", error);

    return fail("Failed to open the file.", 500);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const tutorId = await getTutorId();

  if (!tutorId) {
    return fail("Unauthorized.", 401);
  }

  const { kind } = await params;

  if (!isEditableTutorFileKind(kind)) {
    return fail("This file can't be changed here.", 400);
  }

  const { rules, label } = EDITABLE_TUTOR_FILES[kind];
  const column = TUTOR_FILE_COLUMNS[kind];

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
      return fail(`Please choose a file for your ${label.toLowerCase()}.`, 400);
    }

    const existing = await prisma.tutor.findUnique({
      where: { id: tutorId },
      select: { [column]: true },
    });

    if (!existing) {
      return fail("Unauthorized.", 401);
    }

    const previousKey = existing[column as keyof typeof existing];

    const document = await prepareDocument(entry, rules, label);

    newKey = `tutors/${tutorId}/${kind}-${randomUUID()}`;
    await storeDocument(newKey, document);

    await prisma.tutor.update({
      where: { id: tutorId },
      data: { [column]: newKey },
    });

    const storedKey = newKey;
    newKey = null;

    if (typeof previousKey === "string" && previousKey) {
      await deleteDocuments([previousKey]);
    }

    return NextResponse.json({
      success: true,
      message: `${label} saved.`,
      key: storedKey,
    });
  } catch (error) {
    if (newKey) {
      await deleteDocuments([newKey]);
    }

    if (error instanceof DocumentError) {
      return fail(error.message, 400);
    }

    console.error("Tutor file upload error:", error);

    return fail(`Couldn't save your ${label.toLowerCase()}. Please try again.`, 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const tutorId = await getTutorId();

  if (!tutorId) {
    return fail("Unauthorized.", 401);
  }

  const { kind } = await params;

  if (!isEditableTutorFileKind(kind)) {
    return fail("This file can't be changed here.", 400);
  }

  const { label } = EDITABLE_TUTOR_FILES[kind];
  const column = TUTOR_FILE_COLUMNS[kind];

  try {
    const existing = await prisma.tutor.findUnique({
      where: { id: tutorId },
      select: { [column]: true },
    });

    if (!existing) {
      return fail("Unauthorized.", 401);
    }

    const previousKey = existing[column as keyof typeof existing];

    if (typeof previousKey === "string" && previousKey) {
      await prisma.tutor.update({
        where: { id: tutorId },
        data: { [column]: null },
      });

      await deleteDocuments([previousKey]);
    }

    return NextResponse.json({ success: true, message: `${label} removed.` });
  } catch (error) {
    console.error("Tutor file delete error:", error);

    return fail(`Couldn't remove your ${label.toLowerCase()}. Please try again.`, 500);
  }
}
