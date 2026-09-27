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

    const body = await request.json();

    const {
      fullName,
      gender,
      email,
      phone,
      aboutMe,

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
      entrancePercentage,
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

    // Woreda stays optional here: tutors who registered before it was
    // asked for have none, and the admin may not know it.
    const addressResult = readAddress(
      (key) => body[key],
      "",
      { requireWoreda: false }
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
            "address2",
            { requireWoreda: false }
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

    if (
      gender !== "MALE" &&
      gender !== "FEMALE" &&
      gender !== "ANY"
    ) {
      return NextResponse.json(
        { error: "Invalid gender." },
        { status: 400 }
      );
    }

    const parsedEntranceScore =
      Number(entranceScore);

    const parsedEntranceTotal =
      Number(entranceTotal);

    const parsedEntrancePercentage =
      Number(entrancePercentage);

    if (
      !Number.isFinite(parsedEntranceScore) ||
      !Number.isFinite(parsedEntranceTotal) ||
      !Number.isFinite(parsedEntrancePercentage)
    ) {
      return NextResponse.json(
        {
          error:
            "Entrance examination values must be valid numbers.",
        },
        { status: 400 }
      );
    }

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
      !Number.isFinite(parsedCurrentGPA)
    ) {
      return NextResponse.json(
        {
          error:
            "Current GPA must be a valid number.",
        },
        { status: 400 }
      );
    }

    if (
      parsedCGPA !== null &&
      !Number.isFinite(parsedCGPA)
    ) {
      return NextResponse.json(
        {
          error:
            "CGPA must be a valid number.",
        },
        { status: 400 }
      );
    }

    // Prevent duplicate email addresses.
    const emailOwner =
      await prisma.tutor.findFirst({
        where: {
          email: {
            equals: String(email).trim(),
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

    const tutor =
      await prisma.tutor.update({
        where: {
          id,
        },

        data: {
          fullName: String(fullName).trim(),

          gender,

          email: String(email)
            .trim()
            .toLowerCase(),

          phone: String(phone).trim(),

          country: address.country,

          city: address.city,

          subcity: address.subcity,

          woreda: address.woreda,

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

    return NextResponse.json({
      success: true,
      tutor,
    });
  } catch (error) {
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
