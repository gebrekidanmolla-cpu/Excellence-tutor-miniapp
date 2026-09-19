import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const tutor = await getCurrentTutor();

    if (!tutor) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in to apply.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const jobCode =
      typeof body.jobCode === "string"
        ? body.jobCode.trim()
        : "";

    if (!jobCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Job code is required.",
        },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({
      where: {
        jobCode,
      },
      select: {
        id: true,
        jobCode: true,
        gender: true,
        status: true,
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

    if (job.status !== "OPEN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This job is no longer accepting applications.",
        },
        { status: 400 }
      );
    }

    // Check gender requirement
    if (
      job.gender !== "ANY" &&
      job.gender !== tutor.gender
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not meet the gender requirement for this job.",
        },
        { status: 403 }
      );
    }

    // Prevent duplicate applications
    const existingApplication =
      await prisma.application.findUnique({
        where: {
          tutorId_jobId: {
            tutorId: tutor.id,
            jobId: job.id,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingApplication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have already applied for this job.",
        },
        { status: 409 }
      );
    }

    // Create application
    const application =
      await prisma.application.create({
        data: {
          tutorId: tutor.id,
          jobId: job.id,
          status: "PENDING",
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          job: {
            select: {
              jobCode: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully.",
      application,
    });
  } catch (error) {
    console.error(
      "Create application error:",
      error
    );

    // Handle duplicate application race condition
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have already applied for this job.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while submitting your application.",
      },
      { status: 500 }
    );
  }
}