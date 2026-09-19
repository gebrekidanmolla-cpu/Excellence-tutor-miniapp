import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";

const allowedGenders = [
  "MALE",
  "FEMALE",
  "ANY",
] as const;

type AllowedGender = (typeof allowedGenders)[number];

export async function GET() {
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
    const body = await request.json();

    const {
      jobCode,
      gender,
      grade,
      subject,
      salary,
      daysPerWeek,
      hoursPerDay,
      additionalDetails,
      status,
    } = body;

    // Required fields

    if (
      !jobCode ||
      !gender ||
      !grade ||
      !subject ||
      salary === undefined ||
      salary === null ||
      daysPerWeek === undefined ||
      daysPerWeek === null ||
      hoursPerDay === undefined ||
      hoursPerDay === null
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

    // Schedule validation

    const parsedDaysPerWeek =
      Number(daysPerWeek);

    if (
      !Number.isFinite(parsedDaysPerWeek) ||
      !Number.isInteger(parsedDaysPerWeek) ||
      parsedDaysPerWeek < 1 ||
      parsedDaysPerWeek > 7
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Days per week must be a whole number between 1 and 7.",
        },
        { status: 400 }
      );
    }

    const parsedHoursPerDay =
      Number(hoursPerDay);

    if (
      !Number.isFinite(parsedHoursPerDay) ||
      parsedHoursPerDay < 0.5 ||
      parsedHoursPerDay > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hours per day must be between 0.5 and 12.",
        },
        { status: 400 }
      );
    }

    // Additional details

    const normalizedAdditionalDetails =
      typeof additionalDetails === "string"
        ? additionalDetails.trim()
        : "";

    if (normalizedAdditionalDetails.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Additional details must be 5000 characters or fewer.",
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
        daysPerWeek: parsedDaysPerWeek,
        hoursPerDay: parsedHoursPerDay,
        additionalDetails:
          normalizedAdditionalDetails || null,
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