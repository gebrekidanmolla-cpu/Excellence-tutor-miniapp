import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { generateNextJobCode } from "@/lib/job-code";

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
      gender,
      grade,
      subject,
      place,
      salary,
      daysPerWeek,
      hoursPerDay,
      additionalDetails,
      status,
    } = body;

    // Required fields

    if (
      !gender ||
      !grade ||
      !subject ||
      !place ||
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

    // Place validation

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

    // Create job
    //
    // The job code is assigned automatically (E1000, E1001, ...).
    // Retry a few times in the rare case two admins create a job
    // at the same moment and race for the same code.

    const MAX_JOB_CODE_ATTEMPTS = 5;

    let job = null;

    for (
      let attempt = 1;
      attempt <= MAX_JOB_CODE_ATTEMPTS && !job;
      attempt++
    ) {
      const nextJobCode = await generateNextJobCode();

      try {
        job = await prisma.job.create({
          data: {
            jobCode: nextJobCode,
            gender: gender as AllowedGender,
            grade: normalizedGrade,
            subject: normalizedSubject,
            place: normalizedPlace,
            salary: parsedSalary,
            daysPerWeek: parsedDaysPerWeek,
            hoursPerDay: parsedHoursPerDay,
            additionalDetails:
              normalizedAdditionalDetails || null,
            status: normalizedStatus,
          },
        });
      } catch (error) {
        const isJobCodeConflict =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002";

        if (
          !isJobCodeConflict ||
          attempt >= MAX_JOB_CODE_ATTEMPTS
        ) {
          throw error;
        }
      }
    }

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Failed to assign a job code. Please try again.",
        },
        { status: 500 }
      );
    }

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