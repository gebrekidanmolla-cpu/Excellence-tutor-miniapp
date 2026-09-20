import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";

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

    if (!gender || !grade || !subject || !place) {
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
          salary: parsedSalary,
          status,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Job updated successfully.",
      job: updatedJob,
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