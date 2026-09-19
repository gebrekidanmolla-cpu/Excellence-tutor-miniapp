import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";

    const tutors = await prisma.tutor.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  {
                    fullName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    phone: {
                      contains: search,
                    },
                  },
                  {
                    university: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    department: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {},

          status !== "ALL"
            ? {
                tutorStatus:
                  status === "STUDENT"
                    ? "STUDENT"
                    : status === "GRADUATE"
                      ? "GRADUATE"
                      : undefined,
              }
            : {},
        ],
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        gender: true,

        city: true,
        subcity: true,

        tutorStatus: true,

        university: true,
        department: true,
        currentYear: true,
        currentGPA: true,

        fieldOfGraduation: true,
        universityGraduatedFrom: true,
        CGPA: true,
        employmentStatus: true,

        entrancePercentage: true,

        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      tutors,
    });
  } catch (error) {
    console.error("Failed to fetch tutors:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch tutors.",
      },
      { status: 500 }
    );
  }
}