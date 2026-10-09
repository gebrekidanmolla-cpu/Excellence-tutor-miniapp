import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import {
  readAddress,
  secondAddressColumns,
} from "@/lib/address";
import { EmploymentStatus } from "@prisma/client";
import { deleteObjects } from "@/lib/r2";
import { safeSyncJobSheetRow } from "@/lib/job-sheet-sync";
import { canonicalEthiopianPhone } from "@/lib/phone";
import { EMAIL_PATTERN } from "@/lib/email-verification";
import { NAME_MAX_LENGTH } from "@/app/register/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseEmploymentStatus(
  value: unknown
): EmploymentStatus | null {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const normalized = String(value).trim();

  if (
    !Object.values(EmploymentStatus).includes(
      normalized as EmploymentStatus
    )
  ) {
    return null;
  }

  return normalized as EmploymentStatus;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Tutor ID is required." },
      { status: 400 }
    );
  }

  try {
    const existingTutor =
      await prisma.tutor.findUnique({
        where: { id },
      });

    if (!existingTutor) {
      return NextResponse.json(
        { error: "Tutor not found." },
        { status: 404 }
      );
    }

    // A malformed or empty body falls through to the field checks below as a 400.
    const body = (await request.json().catch(() => null)) ?? {};

    const {
      fullName,
      gender,
      email,
      phone,
      aboutMe,
      tutorStatus,

      university,
      department,
      currentYear,
      currentGPA,

      fieldOfGraduation,
      universityGraduatedFrom,
      CGPA,
      employmentStatus,
      currentJob,

      entranceScore,
      entranceTotal,
    } = body;

    if (
      !fullName ||
      !email ||
      !phone
    ) {
      return NextResponse.json(
        {
          error:
            "Full name, email, and phone are required.",
        },
        { status: 400 }
      );
    }

    const addressResult = readAddress(
      (key) => body[key],
      ""
    );

    if ("error" in addressResult) {
      return NextResponse.json(
        { error: addressResult.error },
        { status: 400 }
      );
    }

    const secondAddressResult =
      body.hasSecondAddress === true
        ? readAddress(
            (key) => body[key],
            "address2"
          )
        : null;

    if (
      secondAddressResult &&
      "error" in secondAddressResult
    ) {
      return NextResponse.json(
        {
          error: `Second address: ${secondAddressResult.error}`,
        },
        { status: 400 }
      );
    }

    const address =
      addressResult.address;

    // Stored in the one canonical form (+2519XXXXXXXX) that registration,
    // `check-phone` and the tutor's own edit form all assume — a number
    // saved as typed would slip past the uniqueness check and fail the
    // tutor's profile form validation.
    const canonicalPhone =
      canonicalEthiopianPhone(String(phone));

    if (!canonicalPhone) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid Ethiopian mobile number.",
        },
        { status: 400 }
      );
    }

    // `ANY` is a job requirement, not a tutor's gender: a tutor stored
    // with it would fail the gender check on every gendered job.
    if (
      gender !== "MALE" &&
      gender !== "FEMALE"
    ) {
      return NextResponse.json(
        { error: "Invalid gender." },
        { status: 400 }
      );
    }

    // Switching type keeps the other type's fields as they are: every page
    // reads only the current type's, so switching back restores them. A
    // form loaded before the type was editable sends none — keep it.
    const nextTutorStatus =
      tutorStatus === undefined
        ? existingTutor.tutorStatus
        : tutorStatus;

    if (
      nextTutorStatus !== "STUDENT" &&
      nextTutorStatus !== "GRADUATE"
    ) {
      return NextResponse.json(
        { error: "Invalid tutor type." },
        { status: 400 }
      );
    }

    const parsedEntranceScore =
      Number(entranceScore);

    const parsedEntranceTotal =
      Number(entranceTotal);

    // Same rules as registration: a whole score out of 600 or 700. The
    // percentage is derived here rather than trusted from the form.
    if (
      entranceScore === "" ||
      entranceScore === null ||
      entranceScore === undefined ||
      !Number.isInteger(parsedEntranceScore) ||
      (parsedEntranceTotal !== 600 && parsedEntranceTotal !== 700) ||
      parsedEntranceScore < 0 ||
      parsedEntranceScore > parsedEntranceTotal
    ) {
      return NextResponse.json(
        {
          error:
            "Entrance score must be a whole number between 0 and the total (600 or 700).",
        },
        { status: 400 }
      );
    }

    const parsedEntrancePercentage = Number(
      ((parsedEntranceScore / parsedEntranceTotal) * 100).toFixed(2)
    );

    const parsedCurrentGPA =
      currentGPA === "" ||
      currentGPA === null ||
      currentGPA === undefined
        ? null
        : Number(currentGPA);

    const parsedCGPA =
      CGPA === "" ||
      CGPA === null ||
      CGPA === undefined
        ? null
        : Number(CGPA);

    // Parse and validate employment status
    const parsedEmploymentStatus =
      parseEmploymentStatus(employmentStatus);

    if (
      employmentStatus !== null &&
      employmentStatus !== undefined &&
      String(employmentStatus).trim() !== "" &&
      parsedEmploymentStatus === null
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid employment status.",
        },
        { status: 400 }
      );
    }

    if (
      parsedCurrentGPA !== null &&
      (!Number.isFinite(parsedCurrentGPA) ||
        parsedCurrentGPA < 0 ||
        parsedCurrentGPA > 4)
    ) {
      return NextResponse.json(
        {
          error:
            "Current GPA must be between 0 and 4.",
        },
        { status: 400 }
      );
    }

    if (
      parsedCGPA !== null &&
      (!Number.isFinite(parsedCGPA) ||
        parsedCGPA < 0 ||
        parsedCGPA > 4)
    ) {
      return NextResponse.json(
        {
          error:
            "CGPA must be between 0 and 4.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (
      normalizedEmail.length > 254 ||
      !EMAIL_PATTERN.test(normalizedEmail)
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (String(fullName).trim().length > NAME_MAX_LENGTH) {
      return NextResponse.json(
        {
          error: `Full name must be ${NAME_MAX_LENGTH} characters or fewer.`,
        },
        { status: 400 }
      );
    }

    // Prevent duplicate email addresses.
    const emailOwner =
      await prisma.tutor.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

    if (emailOwner) {
      return NextResponse.json(
        {
          error:
            "Another tutor is already using this email address.",
        },
        { status: 409 }
      );
    }

    const phoneOwner =
      await prisma.tutor.findFirst({
        where: {
          phone: canonicalPhone,
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

    if (phoneOwner) {
      return NextResponse.json(
        {
          error:
            "Another tutor is already using this phone number.",
        },
        { status: 409 }
      );
    }

    const tutor =
      await prisma.tutor.update({
        where: {
          id,
        },

        data: {
          fullName: String(fullName).trim(),

          gender,

          email: normalizedEmail,

          phone: canonicalPhone,

          country: address.country,

          city: address.city,

          subcity: address.subcity,


          exactPlace: address.exactPlace,

          ...secondAddressColumns(
            secondAddressResult?.address ??
              null
          ),

          aboutMe:
            aboutMe === null ||
            aboutMe === undefined ||
            String(aboutMe).trim() === ""
              ? null
              : String(aboutMe).trim(),

          tutorStatus: nextTutorStatus,

          university:
            university === null ||
            university === undefined ||
            String(university).trim() === ""
              ? null
              : String(university).trim(),

          department:
            department === null ||
            department === undefined ||
            String(department).trim() === ""
              ? null
              : String(department).trim(),

          currentYear:
            currentYear === null ||
            currentYear === undefined ||
            String(currentYear).trim() === ""
              ? null
              : String(currentYear).trim(),

          currentGPA: parsedCurrentGPA,

          fieldOfGraduation:
            fieldOfGraduation === null ||
            fieldOfGraduation === undefined ||
            String(fieldOfGraduation).trim() === ""
              ? null
              : String(fieldOfGraduation).trim(),

          universityGraduatedFrom:
            universityGraduatedFrom === null ||
            universityGraduatedFrom === undefined ||
            String(
              universityGraduatedFrom
            ).trim() === ""
              ? null
              : String(
                  universityGraduatedFrom
                ).trim(),

          CGPA: parsedCGPA,

          employmentStatus:
            parsedEmploymentStatus,

          currentJob:
            currentJob === null ||
            currentJob === undefined ||
            String(currentJob).trim() === ""
              ? null
              : String(currentJob).trim(),

          entranceScore:
            parsedEntranceScore,

          entranceTotal:
            parsedEntranceTotal,

          entrancePercentage:
            parsedEntrancePercentage,
        },

        select: {
          id: true,
          fullName: true,
          email: true,
        },
      });

    // The job sheet names the assigned tutor's phone; keep it current.
    // Best-effort and never throws — the edit has already been saved.
    if (canonicalPhone !== existingTutor.phone) {
      const assignedJobs =
        await prisma.job.findMany({
          where: { assignedTutorId: id },
          select: { id: true },
        });

      for (const job of assignedJobs) {
        await safeSyncJobSheetRow(job.id);
      }
    }

    return NextResponse.json({
      success: true,
      tutor,
    });
  } catch (error) {
    // Lost a race with another write taking the same email or phone.
    if (
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Another tutor is already using this email address or phone number.",
        },
        { status: 409 }
      );
    }

    console.error(
      "ADMIN_TUTOR_UPDATE_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update tutor information.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE
// =====================================================
//
// Deletes the tutor's account outright. Neither relation cascades, so
// the transaction does it by hand: the tutor's applications are
// deleted, and any job they were assigned to is unassigned (it stays
// CLOSED — the admin re-opens it if the vacancy is live again).
//
// Afterwards, best-effort: the uploaded documents are removed from R2,
// and the sheet row of every job they were assigned to is re-synced so
// it no longer names them. The tutor's session cookie dies on its own,
// because `getCurrentTutor()` finds no row.
//
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const tutor =
      await prisma.tutor.findUnique({
        where: { id },

        select: {
          id: true,
          fullName: true,
          transcriptUrl: true,
          entranceResultUrl: true,
          graduationDocumentUrl: true,
          cvUrl: true,
          governmentIdUrl: true,
          profilePhotoUrl: true,

          assignedJobs: {
            select: { id: true },
          },

          _count: {
            select: {
              applications: true,
            },
          },
        },
      });

    if (!tutor) {
      return NextResponse.json(
        { error: "Tutor not found." },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.application.deleteMany({
        where: { tutorId: tutor.id },
      }),

      prisma.job.updateMany({
        where: { assignedTutorId: tutor.id },
        data: { assignedTutorId: null },
      }),

      prisma.tutor.delete({
        where: { id: tutor.id },
      }),
    ]);

    await deleteObjects(
      [
        tutor.transcriptUrl,
        tutor.entranceResultUrl,
        tutor.graduationDocumentUrl,
        tutor.cvUrl,
        tutor.governmentIdUrl,
        tutor.profilePhotoUrl,
      ].filter((key): key is string => Boolean(key))
    );

    for (const job of tutor.assignedJobs) {
      await safeSyncJobSheetRow(job.id);
    }

    const applicationCount =
      tutor._count.applications;

    return NextResponse.json({
      success: true,

      message:
        `${tutor.fullName} deleted` +
        (applicationCount > 0
          ? ` along with ${applicationCount} ${
              applicationCount === 1
                ? "application"
                : "applications"
            }.`
          : "."),
    });
  } catch (error) {
    console.error(
      "ADMIN_TUTOR_DELETE_ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Failed to delete tutor." },
      { status: 500 }
    );
  }
}
