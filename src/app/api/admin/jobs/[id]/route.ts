import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { refreshPublicJobPages } from "@/lib/public-job-pages";
import { safeSyncJobTelegramPost } from "@/lib/telegram-job-post";
import {
  safeRemoveJobSheetRow,
  safeSyncJobSheetRow,
} from "@/lib/job-sheet-sync";
import {
  deleteChannelMessage,
  isTelegramConfigured,
} from "@/lib/telegram";

/* Editing a job waits on a Telegram edit round-trip. */
export const maxDuration = 30;

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// `Job.salary` is a Postgres Int; a typo past this would 500 on insert.
const MAX_SALARY = 1_000_000;

const allowedGenders = [
  "MALE",
  "FEMALE",
  "ANY",
] as const;

export async function GET(
  request: Request,
  { params }: RouteContext
) {
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
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Failed to fetch job:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch job.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
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
    const { id } = await params;

    // A malformed or empty body falls through to the field checks below as a 400.
    const body = (await request.json().catch(() => null)) ?? {};

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
    } = body;

    // No `status` here: closing and re-opening each have their own
    // route, because each changes the job's applications too. Closing
    // without a tutor rejects the pool (`.../status`); re-opening puts
    // it back to pending and clears any assignment (`.../reopen`).
    // A flip from this form would skip both.

    const existingJob =
      await prisma.job.findUnique({
        where: {
          id,
        },
      });

    if (!existingJob) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found.",
        },
        { status: 404 }
      );
    }

    if (
      !gender ||
      !grade ||
      !subject ||
      !place ||
      !parentName ||
      !parentPhone
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "All required fields must be provided.",
        },
        { status: 400 }
      );
    }

    // Trimmed before checking, like `POST /api/admin/jobs`: a
    // whitespace-only value passes the truthiness check above and
    // would otherwise reach the row and the channel post as "".

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

    if (
      !allowedGenders.includes(
        gender
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid gender selection.",
        },
        { status: 400 }
      );
    }

    const parsedSalary =
      Number(salary);

    if (
      !Number.isInteger(
        parsedSalary
      ) ||
      parsedSalary <= 0 ||
      parsedSalary > MAX_SALARY
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Salary must be a whole number between 1 and 1,000,000.",
        },
        { status: 400 }
      );
    }

    // Schedule and details — same rules as `POST /api/admin/jobs`.

    const parsedDaysPerWeek =
      Number(daysPerWeek);

    if (
      daysPerWeek === undefined ||
      daysPerWeek === null ||
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
      hoursPerDay === undefined ||
      hoursPerDay === null ||
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

    const updatedJob =
      await prisma.job.update({
        where: {
          id,
        },
        data: {
          gender,
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
        },
      });

    // The channel post is a rendering of the row, so an edit here is
    // an edit there. Contained, never fatal — see `telegram-job-post`.

    refreshPublicJobPages(updatedJob.jobCode);

    const telegram =
      await safeSyncJobTelegramPost(
        updatedJob.id
      );

    await safeSyncJobSheetRow(updatedJob.id);

    return NextResponse.json({
      success: true,

      message:
        telegram.status === "FAILED"
          ? "Job updated, but the Telegram post could not be updated."
          : "Job updated successfully.",

      job: updatedJob,
      telegram,
    });
  } catch (error) {
    console.error(
      "Failed to update job:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update job.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE
// =====================================================
//
// Deletes the job outright, whether or not tutors have applied. Its
// applications go with it: `Application.job` has no cascade, so they
// are deleted explicitly in the same transaction — otherwise the
// foreign key would refuse the job delete. Tutors lose those rows
// from their application history; the confirm dialog says so.
//
// Its Telegram post and Google Sheet row are removed too, best-effort,
// after the transaction commits.
//
// Ending a live vacancy while keeping the record is still
// `PATCH .../status` with CLOSED.
//
// =====================================================

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
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
    const { id } = await params;

    const job =
      await prisma.job.findUnique({
        where: { id },

        select: {
          id: true,
          jobCode: true,
          telegramMessageId: true,

          _count: {
            select: {
              applications: true,
            },
          },
        },
      });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found.",
        },
        { status: 404 }
      );
    }

    const applicationCount =
      job._count.applications;

    await prisma.$transaction([
      prisma.application.deleteMany({
        where: { jobId: job.id },
      }),

      prisma.job.delete({
        where: { id: job.id },
      }),
    ]);

    // =====================================================
    // REMOVE THE CHANNEL POST
    // =====================================================
    //
    // Best-effort, after the row is gone, and the message id is held
    // in memory because the row that carried it no longer exists.
    // A post left behind advertises a job that cannot be applied to,
    // so when this fails the response says so plainly rather than
    // reporting a clean delete — the admin has to remove it by hand.
    //
    // =====================================================

    let channelPostRemoved = true;

    if (
      job.telegramMessageId !== null &&
      isTelegramConfigured()
    ) {
      try {
        await deleteChannelMessage({
          messageId: job.telegramMessageId,
        });
      } catch (telegramError) {
        channelPostRemoved = false;

        console.error(
          `Failed to delete the Telegram post for job ${job.jobCode}:`,
          telegramError
        );
      }
    }

    // Same treatment for the sheet mirror: best-effort, by code, and
    // a leftover row is named in the response. Never throws.

    refreshPublicJobPages(job.jobCode);

    const sheet =
      await safeRemoveJobSheetRow(job.jobCode);

    const sheetRowRemoved =
      sheet.status !== "FAILED";

    const leftovers = [
      channelPostRemoved
        ? null
        : "its Telegram post could not be removed — delete it in the channel yourself",
      sheetRowRemoved
        ? null
        : "its Google Sheet row could not be removed — delete it in the sheet yourself",
    ].filter((leftover) => leftover !== null);

    return NextResponse.json({
      success: true,

      message:
        `Job ${job.jobCode} deleted` +
        (applicationCount > 0
          ? ` along with ${applicationCount} ${
              applicationCount === 1
                ? "application"
                : "applications"
            }`
          : "") +
        (leftovers.length > 0
          ? `, but ${leftovers.join(", and ")}.`
          : "."),

      channelPostRemoved,
      sheetRowRemoved,
    });
  } catch (error) {
    console.error(
      "Failed to delete job:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete job.",
      },
      { status: 500 }
    );
  }
}
