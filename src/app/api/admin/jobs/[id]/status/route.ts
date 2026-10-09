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
        select: {
          id: true,
          jobCode: true,
          assignedTutorId: true,
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
    // NEVER REOPEN HERE
    // =====================================================
    //
    // Flipping status alone is never a complete re-open. An
    // assigned job would keep `assignedTutorId`, so it could
    // take new applications that the assign route and the
    // application status route both refuse to touch. A failed
    // job would keep every applicant rejected by the close
    // below, and `@@unique([tutorId, jobId])` stops them from
    // applying again.
    //
    // Re-opening is `POST .../reopen`, which unassigns and
    // puts the whole pool back to pending.
    //
    // =====================================================

    if (status === "OPEN") {
      return NextResponse.json(
        {
          success: false,
          message: job.assignedTutorId
            ? "This job still has an assigned tutor. Use Re-open job to clear the assignment and start a new application round."
            : "Use Re-open job, which also puts this job's applicants back to pending.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // CLOSE WITHOUT A TUTOR = FAILED
    // =====================================================
    //
    // An assigned job is already closed (the assign
    // transaction closes it), so this only ever closes a
    // job nobody was assigned to. That job failed — see
    // `getJobOutcome` — and the same transaction rejects
    // every application still pending or reviewed, so no
    // tutor is left waiting on a job that is gone.
    //
    // `assignedTutorId: null` in the `where` is the guard,
    // as in the assign route's claim: an assignment that
    // commits first makes this match nothing, and its
    // accepted application is never rejected. A job closed
    // before this rule existed can be closed again to
    // reject the applicants it left pending.
    //
    // Rejected tutors get no email, the same as the ones
    // the assign transaction rejects.
    //
    // =====================================================

    const result = await prisma.$transaction(
      async (tx) => {
        const closed = await tx.job.updateMany({
          where: {
            id,

            assignedTutorId: null,
          },

          data: {
            status: "CLOSED",
          },
        });

        if (closed.count === 0) {
          return {
            failed: false,
            rejectedCount: 0,
          };
        }

        const rejected =
          await tx.application.updateMany({
            where: {
              jobId: id,

              status: {
                in: ["PENDING", "REVIEWED"],
              },
            },

            data: {
              status: "REJECTED",
            },
          });

        return {
          failed: true,
          rejectedCount: rejected.count,
        };
      }
    );

    // Closing appends the CLOSED marker to the channel post and drops
    // its apply button; re-opening restores both, because the post is
    // re-rendered from the row rather than patched. The channel only
    // ever says "Closed" — whether the job failed is for admins.

    refreshPublicJobPages(job.jobCode);

    const telegram =
      await safeSyncJobTelegramPost(
        job.id
      );

    const messages = [
      result.failed
        ? `Job ${job.jobCode} closed without a tutor and marked as failed.`
        : `Job ${job.jobCode} is closed.`,
    ];

    if (result.rejectedCount > 0) {
      messages.push(
        result.rejectedCount === 1
          ? "1 application was rejected."
          : `${result.rejectedCount} applications were rejected.`
      );
    }

    if (telegram.status === "FAILED") {
      messages.push(
        "The Telegram post could not be updated."
      );
    }

    return NextResponse.json({
      success: true,

      message: messages.join(" "),

      job: {
        id: job.id,
        jobCode: job.jobCode,
        status: "CLOSED",
      },

      rejectedCount: result.rejectedCount,
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