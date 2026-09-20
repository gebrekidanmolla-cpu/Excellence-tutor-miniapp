import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");

    const jobs = await prisma.job.findMany({
      where:
        status === "OPEN" || status === "CLOSED"
          ? {
              status,
            }
          : undefined,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        jobCode: true,
        gender: true,
        grade: true,
        subject: true,
        place: true,
        salary: true,
        status: true,
        createdAt: true,
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
        message: "Failed to load jobs.",
      },
      { status: 500 }
    );
  }
}