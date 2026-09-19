import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  try {
    const { id } = await params;

    const body = await request.json();

    const {
      jobCode,
      gender,
      grade,
      subject,
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

    if (!jobCode || !gender || !grade || !subject) {
      return NextResponse.json(
        {
          success: false,
          message:
            "All required fields must be provided.",
        },
        { status: 400 }
      );
    }

    const normalizedJobCode =
      String(jobCode)
        .trim()
        .toUpperCase();

    if (
      !/^[A-Z][A-Z0-9-]*$/.test(
        normalizedJobCode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid job code format.",
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

    const duplicateJob =
      await prisma.job.findFirst({
        where: {
          jobCode: normalizedJobCode,
          NOT: {
            id,
          },
        },
      });

    if (duplicateJob) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Job code ${normalizedJobCode} already exists.`,
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
          jobCode:
            normalizedJobCode,
          gender,
          grade:
            String(grade).trim(),
          subject:
            String(subject).trim(),
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