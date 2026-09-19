import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
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
    // =====================================================

    const result = await prisma.$transaction(
      async (tx) => {
        // -------------------------------------------------
        // 1. Accept selected application
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
        // 2. Reject all other applications for this job
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

        // -------------------------------------------------
        // 3. Assign tutor to job and close job
        // -------------------------------------------------

        const updatedJob =
          await tx.job.update({
            where: {
              id: application.jobId,
            },

            data: {
              assignedTutorId:
                application.tutorId,

              status: "CLOSED",
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
      },
      { status: 200 }
    );
  } catch (error) {
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

