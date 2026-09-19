import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        tutor: true,
        job: true,
      },
    });

    return NextResponse.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error(
      "Failed to fetch applications:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch applications.",
      },
      {
        status: 500,
      }
    );
  }
}