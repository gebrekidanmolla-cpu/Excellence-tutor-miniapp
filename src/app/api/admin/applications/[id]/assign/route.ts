import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { refreshPublicJobPages } from "@/lib/public-job-pages";
import { sendApplicationAcceptedEmail } from "@/lib/email";
import { safeSyncJobTelegramPost } from "@/lib/telegram-job-post";
import { safeSyncJobSheetRow } from "@/lib/job-sheet-sync";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Thrown when the conditional claim inside the transaction matches no row —
 * i.e. another request assigned this job first. Distinguishing it from a real
 * failure is what keeps that case a 409 instead of a generic 500.
 */
class JobAlreadyAssignedError extends Error {
  constructor() {
    super("A tutor has already been assigned to this job.");

    this.name = "JobAlreadyAssignedError";
  }
}


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

    // =====================================================
    // VALIDATE APPLICATION ID
    // =====================================================

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Application ID is required.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // FIND APPLICATION
    // =====================================================

    const application =
      await prisma.application.findUnique({
        where: {
          id,
        },
        include: {
          tutor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          job: {
            select: {
              id: true,
              jobCode: true,
              status: true,
              assignedTutorId: true,
              subject: true,
              grade: true,
              place: true,
              salary: true,
              parentName: true,
              parentPhone: true,
            },
          },
        },
      });

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          message: "Application not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // PREVENT ASSIGNING A CLOSED JOB
    // =====================================================

    if (application.job.status === "CLOSED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This job is already closed and has an assigned tutor.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // PREVENT DUPLICATE ASSIGNMENT
    // =====================================================

    if (application.job.assignedTutorId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A tutor has already been assigned to this job.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // ASSIGN TUTOR
    // =====================================================
    //
    // Everything below happens inside ONE transaction.
    //
    // If any operation fails, the entire assignment is
    // rolled back.
    //
    // The checks above are read outside the transaction, so
    // they are advisory only — they exist to return a good
    // message in the common case. The claim in step 1 is
    // the real guard.
    //
    // =====================================================

    const result = await prisma.$transaction(
      async (tx) => {
        // -------------------------------------------------
        // 1. Claim the job
        // -------------------------------------------------
        //
        // A conditional write, not a read-then-write: the
        // `where` re-states the preconditions, so only one
        // of two concurrent requests can match. Without it
        // both would pass the checks above and the second
        // would overwrite `assignedTutorId` while step 2
        // (which skips `ACCEPTED` rows) left the first
        // tutor accepted — two winners on one job.
        //
        // -------------------------------------------------

        const claimed = await tx.job.updateMany({
          where: {
            id: application.jobId,

            status: "OPEN",

            assignedTutorId: null,
          },

          data: {
            assignedTutorId:
              application.tutorId,

            status: "CLOSED",
          },
        });

        if (claimed.count === 0) {
          throw new JobAlreadyAssignedError();
        }

        // -------------------------------------------------
        // 2. Accept selected application
        // -------------------------------------------------

        const acceptedApplication =
          await tx.application.update({
            where: {
              id: application.id,
            },
            data: {
              status: "ACCEPTED",
            },
            include: {
              tutor: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },
              job: {
                select: {
                  id: true,
                  jobCode: true,
                  status: true,
                },
              },
            },
          });

        // -------------------------------------------------
        // 3. Reject all other applications for this job
        // -------------------------------------------------

        await tx.application.updateMany({
          where: {
            jobId: application.jobId,

            NOT: {
              id: application.id,
            },

            status: {
              not: "ACCEPTED",
            },
          },

          data: {
            status: "REJECTED",
          },
        });

        const updatedJob =
          await tx.job.findUniqueOrThrow({
            where: {
              id: application.jobId,
            },

            select: {
              id: true,
              jobCode: true,
              status: true,
              assignedTutorId: true,
            },
          });

        return {
          acceptedApplication,
          updatedJob,
        };
      }
    );

    // =====================================================
    // NOTIFY
    // =====================================================
    //
    // Best-effort, after the transaction has already committed: the
    // assignment is real whether or not the mail server is reachable, so a
    // failed send is logged and swallowed rather than turning a successful
    // assignment into a 500. Still *awaited*, not fired-and-forgotten —
    // this runs in a serverless function that can freeze the moment the
    // response is sent, which would silently drop an un-awaited send.
    //
    // Only the accepted tutor is emailed. The applicants this same
    // transaction rejects are not — see `sendApplicationAcceptedEmail`'s
    // former sibling, removed on request.
    //
    // =====================================================

    try {
      await sendApplicationAcceptedEmail({
        to: result.acceptedApplication.tutor.email,
        tutorName: result.acceptedApplication.tutor.fullName,
        job: {
          jobCode: result.updatedJob.jobCode,
          subject: application.job.subject,
          grade: application.job.grade,
        },
        place: application.job.place,
        salary: application.job.salary,
        // Only the assigned tutor ever receives these — the applicants
        // rejected in the same transaction get no email at all.
        parentName: application.job.parentName,
        parentPhone: application.job.parentPhone,
      });
    } catch (emailError) {
      console.error(
        "Failed to send assignment email:",
        emailError
      );
    }

    // The transaction above closed the job, so the channel post needs
    // its CLOSED marker. Same containment as the email: recorded on
    // the row, logged, never fatal.

    refreshPublicJobPages(result.updatedJob.jobCode);

    const telegram =
      await safeSyncJobTelegramPost(
        result.updatedJob.id
      );

    await safeSyncJobSheetRow(result.updatedJob.id);

    // =====================================================
    // SUCCESS
    // =====================================================

    return NextResponse.json(
      {
        success: true,

        message:
          `Tutor ${result.acceptedApplication.tutor.fullName} ` +
          `has been assigned to job ${result.updatedJob.jobCode}.`,

        application: result.acceptedApplication,

        job: result.updatedJob,

        telegram,
      },
      { status: 200 }
    );
  } catch (error) {
    // Lost the race rather than failed — report the conflict, not a 500.
    if (error instanceof JobAlreadyAssignedError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 409 }
      );
    }

    console.error(
      "Failed to assign tutor:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to assign tutor. Please try again.",
      },
      { status: 500 }
    );
  }
}

