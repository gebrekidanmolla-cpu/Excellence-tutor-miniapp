import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// ACCEPTED is intentionally NOT included here.
// An application can only become ACCEPTED through the Assign Tutor workflow.
const allowedStatuses = [
  "PENDING",
  "REVIEWED",
  "REJECTED",
] as const;

type AllowedStatus = (typeof allowedStatuses)[number];

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    // --------------------------------------------------
    // 1. Verify admin
    // --------------------------------------------------
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

    // --------------------------------------------------
    // 2. Get application ID
    // --------------------------------------------------
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Application ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. Read request body
    // --------------------------------------------------
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("status" in body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Status is required.",
        },
        { status: 400 }
      );
    }

    const requestedStatus = (body as { status?: unknown }).status;

    // --------------------------------------------------
    // 4. Validate status
    // --------------------------------------------------
    if (
      typeof requestedStatus !== "string" ||
      !allowedStatuses.includes(
        requestedStatus as AllowedStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid status. Accepted applications must be assigned through the Assign Tutor action.",
        },
        { status: 400 }
      );
    }

    const status = requestedStatus as AllowedStatus;

    // --------------------------------------------------
    // 5. Find application
    // --------------------------------------------------
    const application =
      await prisma.application.findUnique({
        where: {
          id,
        },
        include: {
          job: true,
          tutor: true,
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

    // --------------------------------------------------
    // 6. Don't allow changes after tutor assignment
    // --------------------------------------------------
    if (
      application.status === "ACCEPTED" ||
      application.job.assignedTutorId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This application cannot be changed because a tutor has already been assigned to the job.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 7. Don't modify applications after job is closed
    // --------------------------------------------------
    if (application.job.status === "CLOSED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Applications for a closed job cannot be changed.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 8. Update status
    // --------------------------------------------------
    const updatedApplication =
      await prisma.application.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });

    // --------------------------------------------------
    // 9. Return success
    // --------------------------------------------------
    return NextResponse.json({
      success: true,
      message: "Application status updated successfully.",
      application: updatedApplication,
    });
  } catch (error) {
    console.error(
      "Failed to update application status:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update application status.",
      },
      { status: 500 }
    );
  }
}
