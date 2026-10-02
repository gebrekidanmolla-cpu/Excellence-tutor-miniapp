import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { refreshPublicJobPages } from "@/lib/public-job-pages";
import { safeSyncJobTelegramPost } from "@/lib/telegram-job-post";

/* Closing or re-opening a job waits on a Telegram edit. */
export const maxDuration = 30;

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const allowedStatuses = [
  "OPEN",
  "CLOSED",
] as const;

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

    const { status } = body;

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

    const job =
      await prisma.job.findUnique({
        where: {
          id,
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

    // =====================================================
    // NEVER REOPEN AN ASSIGNED JOB HERE
    // =====================================================
    //
    // Flipping status alone would leave `assignedTutorId`
    // set: the job would accept new applications while the
    // assign route and the application status route both
    // refuse to touch it, stranding every new applicant.
    //
    // Clearing the assignment is `POST .../reopen`.
    //
    // =====================================================

    if (
      status === "OPEN" &&
      job.assignedTutorId
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

    const updatedJob =
      await prisma.job.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });

    // Closing appends the CLOSED marker to the channel post and drops
    // its apply button; re-opening restores both, because the post is
    // re-rendered from the row rather than patched.

    refreshPublicJobPages(updatedJob.jobCode);

    const telegram =
      await safeSyncJobTelegramPost(
        updatedJob.id
      );

    return NextResponse.json({
      success: true,

      message:
        telegram.status === "FAILED"
          ? "Job status updated, but the Telegram post could not be updated."
          : "Job status updated successfully.",

      job: updatedJob,
      telegram,
    });
  } catch (error) {
    console.error(
      "Failed to update job status:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update job status.",
      },
      { status: 500 }
    );
  }
}