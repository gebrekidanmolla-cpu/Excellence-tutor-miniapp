import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";

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

    const body = await request.json();

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

    const updatedJob =
      await prisma.job.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Job status updated successfully.",
      job: updatedJob,
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