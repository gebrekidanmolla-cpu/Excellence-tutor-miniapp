import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";

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
    const applications = await prisma.application.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        // IMPORTANT: never `include: { tutor: true }` here —
        // that would also return passwordHash and other
        // sensitive tutor columns. Select only what admins need.
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            gender: true,

            university: true,
            department: true,

            currentGPA: true,
            CGPA: true,

            tutorStatus: true,

            entranceScore: true,
            entranceTotal: true,
            entrancePercentage: true,

            createdAt: true,
          },
        },

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