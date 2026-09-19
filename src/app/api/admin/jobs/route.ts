import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const allowedGenders = [
  "MALE",
  "FEMALE",
  "ANY",
] as const;

type AllowedGender = (typeof allowedGenders)[number];

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch jobs.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      jobCode,
      gender,
      grade,
      subject,
      salary,
      status,
    } = body;

    // Required fields

    if (
      !jobCode ||
      !gender ||
      !grade ||
      !subject ||
      salary === undefined ||
      salary === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All required fields must be provided.",
        },
        { status: 400 }
      );
    }

    // Job code validation

    const normalizedJobCode =
      String(jobCode).trim().toUpperCase();

    if (!/^[A-Z][A-Z0-9-]*$/.test(normalizedJobCode)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Job code must start with a letter and contain only letters, numbers, or hyphens.",
        },
        { status: 400 }
      );
    }

    // Gender validation

    if (
      !allowedGenders.includes(
        gender as AllowedGender
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid gender selection.",
        },
        { status: 400 }
      );
    }

    // Grade validation

    const normalizedGrade =
      String(grade).trim();

    if (!normalizedGrade) {
      return NextResponse.json(
        {
          success: false,
          message: "Grade is required.",
        },
        { status: 400 }
      );
    }

    // Subject validation

    const normalizedSubject =
      String(subject).trim();

    if (!normalizedSubject) {
      return NextResponse.json(
        {
          success: false,
          message: "Subject is required.",
        },
        { status: 400 }
      );
    }

    // Salary validation

    const parsedSalary =
      Number(salary);

    if (
      !Number.isFinite(parsedSalary) ||
      parsedSalary <= 0 ||
      !Number.isInteger(parsedSalary)
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

    // Status

    const normalizedStatus =
      status === "CLOSED"
        ? "CLOSED"
        : "OPEN";

    // Duplicate job code

    const existingJob =
      await prisma.job.findUnique({
        where: {
          jobCode: normalizedJobCode,
        },
      });

    if (existingJob) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Job code ${normalizedJobCode} already exists.`,
        },
        { status: 409 }
      );
    }

    // Create job

    const job = await prisma.job.create({
      data: {
        jobCode: normalizedJobCode,
        gender: gender as AllowedGender,
        grade: normalizedGrade,
        subject: normalizedSubject,
        salary: parsedSalary,
        status: normalizedStatus,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Job created successfully.",
        job,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create job:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create job.",
      },
      { status: 500 }
    );
  }
}