import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getTutorId } from "@/lib/session";
import { secondAddressColumns } from "@/lib/address";
import { normalizeEthiopianPhone } from "@/lib/phone";
import { safeSyncJobSheetRow } from "@/lib/job-sheet-sync";
import {
  needsCurrentJob,
  profileEditSchema,
} from "@/lib/tutor-profile-edit";

/*
 * The tutor's own profile edit. Validation is the form's own schema
 * (`src/lib/tutor-profile-edit.ts`), and only the fields it lists are ever
 * written — anything else in the body is ignored. Errors carry `field`, so
 * the form can put the message under the right input.
 */

function fail(message: string, status: number, field?: string) {
  return NextResponse.json({ success: false, message, field }, { status });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function PATCH(request: Request) {
  const tutorId = await getTutorId();

  if (!tutorId) {
    return fail("Unauthorized.", 401);
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return fail("Invalid request.", 400);
    }

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      select: {
        tutorStatus: true,
        phone: true,
        assignedJobs: { select: { id: true } },
      },
    });

    if (!tutor) {
      return fail("Unauthorized.", 401);
    }

    const parsed = profileEditSchema.safeParse({
      ...body,
      // Accepts +251…, 0… and the bare 9 digits the form sends.
      phone: normalizeEthiopianPhone(String(body.phone ?? "")),
      // Never taken from the client: it only picks the education rules.
      tutorStatus: tutor.tutorStatus,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];

      return fail(
        issue.message,
        400,
        typeof issue.path[0] === "string" ? issue.path[0] : undefined
      );
    }

    const values = parsed.data;
    const phone = `+251${values.phone}`;
    const isStudent = tutor.tutorStatus === "STUDENT";

    if (phone !== tutor.phone) {
      const phoneOwner = await prisma.tutor.findUnique({
        where: { phone },
        select: { id: true },
      });

      if (phoneOwner && phoneOwner.id !== tutorId) {
        return fail(
          "Another account already uses this phone number.",
          409,
          "phone"
        );
      }
    }

    await prisma.tutor.update({
      where: { id: tutorId },
      data: {
        phone,
        country: values.country,
        city: values.city,
        subcity: values.subcity,
        exactPlace: values.exactPlace,
        ...secondAddressColumns(
          values.hasSecondAddress
            ? {
                country: values.address2Country,
                city: values.address2City,
                subcity: values.address2Subcity,
                exactPlace: values.address2ExactPlace,
              }
            : null
        ),
        aboutMe: values.aboutMe || null,
        ...(isStudent
          ? { currentYear: values.currentYear }
          : {
              employmentStatus: values.employmentStatus as
                | "EMPLOYED"
                | "SELF_EMPLOYED"
                | "UNEMPLOYED"
                | "OTHER",
              currentJob: needsCurrentJob(values.employmentStatus)
                ? values.currentJob
                : null,
            }),
      },
    });

    // The job sheet names the assigned tutor's phone; keep it current.
    // Best-effort and never throws — the edit has already been saved.
    if (phone !== tutor.phone) {
      for (const job of tutor.assignedJobs) {
        await safeSyncJobSheetRow(job.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Your profile has been updated.",
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(
        "Another account already uses this phone number.",
        409,
        "phone"
      );
    }

    console.error("Tutor profile update error:", error);

    return fail("Couldn't save your profile. Please try again.", 500);
  }
}
