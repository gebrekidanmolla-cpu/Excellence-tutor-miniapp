import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobCode: string }> }
) {
  try {
    const { jobCode } = await params;

    const job = await prisma.job.findUnique({
      where: {
        jobCode,
      },
      select: {
        jobCode: true,
        gender: true,
        grade: true,
        subject: true,
        place: true,
        salary: true,
        status: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found",
        },
        { status: 404 }
      );
    }

    if (job.status !== "OPEN") {
      return NextResponse.json(
        {
          success: false,
          message: "This job is no longer accepting applications",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Get job error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load job",
      },
      { status: 500 }
    );
  }
}