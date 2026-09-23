import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { safeSyncJobTelegramPost } from "@/lib/telegram-job-post";
import { safeSyncJobSheetRow } from "@/lib/job-sheet-sync";
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

const allowedGenders = [
  "MALE",
  "FEMALE",
  "ANY",
] as const;

const allowedStatuses = [
  "OPEN",
  "CLOSED",
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

    const body = await request.json();

    const {
      gender,
      grade,
      subject,
      place,
      parentName,
      parentPhone,
      salary,
      status,
    } = body;

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

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid job status.",
        },
        { status: 400 }
      );
    }

    // The edit form carries `status` too, so it is a second
    // route into the half-reopened state. Same guard as
    // `.../status`: clearing an assignment is `.../reopen`.
    if (
      status === "OPEN" &&
      existingJob.assignedTutorId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This job still has an assigned tutor. Use Re-open job to clear the assignment and start a new application round.",
        },
        { status: 409 }
      );
    }

    const parsedSalary =
      Number(salary);

    if (
      !Number.isInteger(
        parsedSalary
      ) ||
      parsedSalary <= 0
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

    const updatedJob =
      await prisma.job.update({
        where: {
          id,
        },
        data: {
          gender,
          grade:
            String(grade).trim(),
          subject:
            String(subject).trim(),
          place: normalizedPlace,
          parentName: normalizedParentName,
          parentPhone: normalizedParentPhone,
          salary: parsedSalary,
          status,
        },
      });

    // The channel post is a rendering of the row, so an edit here is
    // an edit there. Contained, never fatal — see `telegram-job-post`.

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
// Deleting is for jobs that should never have existed — a typo, a
// duplicate, a test. It is not the way to end a live vacancy: that
// is `PATCH .../status` with CLOSED, which keeps the record and the
// channel post.
//
// A job that tutors have already applied to cannot be deleted. Those
// rows are someone's application history, `Application.job` has no
// cascade, and silently erasing them to satisfy a button would be
// the wrong trade. The refusal says so and points at closing.
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

    if (applicationCount > 0) {
      return NextResponse.json(
        {
          success: false,

          message:
            `This job has ${applicationCount} ` +
            `${
              applicationCount === 1
                ? "application"
                : "applications"
            } from tutors, and deleting it would erase ` +
            `their records too. Close the job instead — it ` +
            `stops accepting applications and keeps the history.`,
        },
        { status: 409 }
      );
    }

    await prisma.job.delete({
      where: { id: job.id },
    });

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

    return NextResponse.json({
      success: true,

      message: channelPostRemoved
        ? `Job ${job.jobCode} deleted.`
        : `Job ${job.jobCode} deleted, but its Telegram post could not be removed — delete it in the channel yourself.`,

      channelPostRemoved,
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
