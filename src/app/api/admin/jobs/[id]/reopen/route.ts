import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { refreshPublicJobPages } from "@/lib/public-job-pages";
import { sendJobReopenedEmail } from "@/lib/email";
import { safeSyncJobTelegramPost } from "@/lib/telegram-job-post";
import { safeSyncJobSheetRow } from "@/lib/job-sheet-sync";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Re-open a job for a fresh round.
 *
 * `PATCH /api/admin/jobs/[id]/status` only flips `status`, which leaves
 * `assignedTutorId` set — and both the assign route and the application
 * status route refuse to touch a job that has an assigned tutor. A job
 * reopened that way could take new applications but could never be assigned
 * again. Those two routes reject that transition and point here.
 *
 * Re-opening does three things in one step:
 *
 *   1. Unassigns the tutor.
 *   2. Resets EVERY application on the job back to `PENDING`, including the
 *      accepted one and the ones the assign transaction rejected — so the
 *      whole previous pool is selectable again and the admin can assign one
 *      of those tutors without waiting for anybody new.
 *   3. Sets the job back to `OPEN`, so additional tutors can also apply.
 *
 * Nothing is deleted. The rows are kept precisely because `Application` has
 * `@@unique([tutorId, jobId])`: a tutor who already applied cannot create a
 * second row, so their existing one IS their candidacy in the new round.
 */
export async function POST(
  _request: Request,
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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Job ID is required.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // FIND JOB
    // =====================================================

    const job = await prisma.job.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        jobCode: true,
        status: true,
        assignedTutorId: true,
        subject: true,
        grade: true,
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
    // NOTHING TO RE-OPEN
    // =====================================================
    //
    // Counted rather than derived from the total application
    // count: a job that is open, unassigned and whose whole
    // pool is already pending is exactly the state this route
    // produces, so running it would change nothing.
    //
    // =====================================================

    const resettableApplications =
      await prisma.application.count({
        where: {
          jobId: job.id,

          status: {
            not: "PENDING",
          },
        },
      });

    if (
      job.status === "OPEN" &&
      !job.assignedTutorId &&
      resettableApplications === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This job is already open with no assigned tutor and every application pending.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // RE-OPEN
    // =====================================================
    //
    // One transaction: reset the pool, then clear the
    // assignment and reopen. If either fails, neither is
    // applied — the job never lands in the half-reopened
    // state this route exists to prevent.
    //
    // =====================================================

    const result = await prisma.$transaction(
      async (tx) => {
        // -------------------------------------------------
        // 1. Reset every application back to pending
        // -------------------------------------------------
        //
        // No status filter: the accepted application and the
        // ones rejected by the assign transaction are the
        // ones that most need resetting, since they are the
        // tutors the admin is re-choosing between.
        //
        // Read before the write, same reason as the assign route: the
        // reopen emails sent after commit need each tutor's *previous*
        // status (accepted vs. rejected changes the wording), and
        // `updateMany` returns only a count.
        //
        // -------------------------------------------------

        const resetWhere = {
          jobId: job.id,

          status: {
            not: "PENDING" as const,
          },
        };

        const applicantsToNotify = await tx.application.findMany({
          where: resetWhere,
          select: {
            status: true,
            tutor: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        });

        const reset =
          await tx.application.updateMany({
            where: resetWhere,

            data: {
              status: "PENDING",
            },
          });

        // -------------------------------------------------
        // 2. Clear the assignment and reopen the job
        // -------------------------------------------------

        const updatedJob = await tx.job.update({
          where: {
            id: job.id,
          },

          data: {
            assignedTutorId: null,

            status: "OPEN",
          },

          select: {
            id: true,
            jobCode: true,
            status: true,
            assignedTutorId: true,
            _count: {
              select: {
                applications: true,
              },
            },
          },
        });

        return {
          resetCount: reset.count,
          applicantsToNotify,
          updatedJob,
        };
      }
    );

    // =====================================================
    // NOTIFY
    // =====================================================
    //
    // Best-effort, after the transaction has already committed, and
    // awaited (via `allSettled`) rather than fired-and-forgotten so a
    // serverless freeze right after the response can't drop a send.
    // Only the applicants this reopen actually changed get emailed —
    // anyone who was already `PENDING` sees no change, so no email.
    //
    // =====================================================

    const jobSummary = {
      jobCode: result.updatedJob.jobCode,
      subject: job.subject,
      grade: job.grade,
    };

    await Promise.allSettled(
      result.applicantsToNotify.map((applicant) =>
        sendJobReopenedEmail({
          to: applicant.tutor.email,
          tutorName: applicant.tutor.fullName,
          job: jobSummary,
          previousStatus: applicant.status as
            | "ACCEPTED"
            | "REVIEWED"
            | "REJECTED",
        }).catch((emailError) => {
          console.error(
            `Failed to send reopen email to ${applicant.tutor.email}:`,
            emailError
          );
        })
      )
    );

    // The post is re-rendered from the row, so re-opening removes the
    // CLOSED marker and brings the apply button back on its own.

    refreshPublicJobPages(result.updatedJob.jobCode);

    const telegram =
      await safeSyncJobTelegramPost(
        result.updatedJob.id
      );

    await safeSyncJobSheetRow(result.updatedJob.id);

    // =====================================================
    // SUCCESS
    // =====================================================

    const poolCount =
      result.updatedJob._count.applications;

    const poolLabel =
      poolCount === 1
        ? "1 previous applicant is"
        : `${poolCount} previous applicants are`;

    return NextResponse.json(
      {
        success: true,

        message:
          poolCount > 0
            ? `Job ${result.updatedJob.jobCode} is open again. ` +
              `${poolLabel} pending and can still be assigned.`
            : `Job ${result.updatedJob.jobCode} is open again.`,

        resetCount: result.resetCount,

        applicationCount: poolCount,

        job: {
          id: result.updatedJob.id,
          jobCode: result.updatedJob.jobCode,
          status: result.updatedJob.status,
          assignedTutorId:
            result.updatedJob.assignedTutorId,
        },

        telegram,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Failed to reopen job:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to reopen job. Please try again.",
      },
      { status: 500 }
    );
  }
}
