import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { generateNextJobCode } from "@/lib/job-code";
import { safeSyncJobTelegramPost } from "@/lib/telegram-job-post";
import { safeSyncJobSheetRow } from "@/lib/job-sheet-sync";

/* The create path now waits on a Telegram round-trip. */
export const maxDuration = 30;

const allowedGenders = [
  "MALE",
  "FEMALE",
  "ANY",
] as const;

type AllowedGender = (typeof allowedGenders)[number];

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const jobs = await prisma.job.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch jobs.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const {
      gender,
      grade,
      subject,
      place,
      parentName,
      parentPhone,
      salary,
      daysPerWeek,
      hoursPerDay,
      additionalDetails,
      status,
    } = body;

    // Required fields

    if (
      !gender ||
      !grade ||
      !subject ||
      !place ||
      !parentName ||
      !parentPhone ||
      salary === undefined ||
      salary === null ||
      daysPerWeek === undefined ||
      daysPerWeek === null ||
      hoursPerDay === undefined ||
      hoursPerDay === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All required fields must be provided.",
        },
        { status: 400 }
      );
    }

    // Gender validation

    if (
      !allowedGenders.includes(
        gender as AllowedGender
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid gender selection.",
        },
        { status: 400 }
      );
    }

    // Grade validation

    const normalizedGrade =
      String(grade).trim();

    if (!normalizedGrade) {
      return NextResponse.json(
        {
          success: false,
          message: "Grade is required.",
        },
        { status: 400 }
      );
    }

    // Subject validation

    const normalizedSubject =
      String(subject).trim();

    if (!normalizedSubject) {
      return NextResponse.json(
        {
          success: false,
          message: "Subject is required.",
        },
        { status: 400 }
      );
    }

    // Place validation

    const normalizedPlace =
      String(place).trim();

    if (!normalizedPlace) {
      return NextResponse.json(
        {
          success: false,
          message: "Place is required.",
        },
        { status: 400 }
      );
    }

    // Parent contact validation

    const normalizedParentName =
      String(parentName).trim();

    if (!normalizedParentName) {
      return NextResponse.json(
        {
          success: false,
          message: "Parent name is required.",
        },
        { status: 400 }
      );
    }

    const normalizedParentPhone =
      String(parentPhone).trim();

    if (!normalizedParentPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "Parent phone number is required.",
        },
        { status: 400 }
      );
    }

    // Salary validation

    const parsedSalary =
      Number(salary);

    if (
      !Number.isFinite(parsedSalary) ||
      parsedSalary <= 0 ||
      !Number.isInteger(parsedSalary)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Salary must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    // Schedule validation

    const parsedDaysPerWeek =
      Number(daysPerWeek);

    if (
      !Number.isFinite(parsedDaysPerWeek) ||
      !Number.isInteger(parsedDaysPerWeek) ||
      parsedDaysPerWeek < 1 ||
      parsedDaysPerWeek > 7
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Days per week must be a whole number between 1 and 7.",
        },
        { status: 400 }
      );
    }

    const parsedHoursPerDay =
      Number(hoursPerDay);

    if (
      !Number.isFinite(parsedHoursPerDay) ||
      parsedHoursPerDay < 0.5 ||
      parsedHoursPerDay > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hours per day must be between 0.5 and 12.",
        },
        { status: 400 }
      );
    }

    // Additional details

    const normalizedAdditionalDetails =
      typeof additionalDetails === "string"
        ? additionalDetails.trim()
        : "";

    if (normalizedAdditionalDetails.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Additional details must be 5000 characters or fewer.",
        },
        { status: 400 }
      );
    }

    // Status

    const normalizedStatus =
      status === "CLOSED"
        ? "CLOSED"
        : "OPEN";

    // Create job
    //
    // The job code is assigned automatically (E1000, E1001, ...).
    // Retry a few times in the rare case two admins create a job
    // at the same moment and race for the same code.

    const MAX_JOB_CODE_ATTEMPTS = 5;

    let job = null;

    for (
      let attempt = 1;
      attempt <= MAX_JOB_CODE_ATTEMPTS && !job;
      attempt++
    ) {
      const nextJobCode = await generateNextJobCode();

      try {
        job = await prisma.job.create({
          data: {
            jobCode: nextJobCode,
            gender: gender as AllowedGender,
            grade: normalizedGrade,
            subject: normalizedSubject,
            place: normalizedPlace,
            parentName: normalizedParentName,
            parentPhone: normalizedParentPhone,
            salary: parsedSalary,
            daysPerWeek: parsedDaysPerWeek,
            hoursPerDay: parsedHoursPerDay,
            additionalDetails:
              normalizedAdditionalDetails || null,
            status: normalizedStatus,
          },
        });
      } catch (error) {
        const isJobCodeConflict =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002";

        if (
          !isJobCodeConflict ||
          attempt >= MAX_JOB_CODE_ATTEMPTS
        ) {
          throw error;
        }
      }
    }

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Failed to assign a job code. Please try again.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // PUBLISH TO TELEGRAM
    // =====================================================
    //
    // Best-effort, after the row has already committed: the job is
    // real whether or not Telegram is reachable, so a failed post is
    // recorded on the row (and shown on the job page with a re-post
    // button) rather than turning a successful creation into a 500.
    //
    // Still *awaited*, not fired-and-forgotten — this runs in a
    // serverless function that can freeze the moment the response is
    // sent, which would silently drop the post. Awaiting also lets
    // the response carry the real outcome, so the admin lands on a
    // detail page that already knows whether the post went out.
    //
    // Tighter budget than the manual re-post endpoint: an admin is
    // waiting on this request, and the retry button exists precisely
    // for the slow cases.
    //
    // =====================================================

    const telegram = await safeSyncJobTelegramPost(job.id, {
      deadlineMs: 6_000,
      attempts: 2,
    });

    // Mirror the new row into the backup Google Sheet. Same
    // containment contract as Telegram: never throws, never turns a
    // successful job creation into a 500.
    await safeSyncJobSheetRow(job.id);

    // Re-read so the response carries the telegram columns the detail
    // page renders. `job.id` is unchanged either way — the create
    // form hard-depends on `result.job.id`.
    const createdJob =
      (await prisma.job.findUnique({
        where: { id: job.id },
      })) ?? job;

    return NextResponse.json(
      {
        success: true,

        message:
          telegram.status === "PUBLISHED"
            ? "Job created and posted to Telegram."
            : telegram.status === "FAILED"
              ? "Job created, but the Telegram post failed. You can re-post it from the job page."
              : "Job created successfully.",

        job: createdJob,
        telegram,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create job:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create job.",
      },
      { status: 500 }
    );
  }
}