import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { randomBytes } from "node:crypto";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// =====================================================
// POST — create the public profile link, or replace it
// =====================================================
//
// Always issues a fresh token, so the same call serves "Create link"
// and "Reset link": any link sent out before stops working.
//
// =====================================================

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const tutor = await prisma.tutor.update({
      where: { id },
      data: {
        profileShareToken:
          randomBytes(32).toString("base64url"),
      },
      select: {
        profileShareToken: true,
      },
    });

    return NextResponse.json({
      success: true,
      token: tutor.profileShareToken,
    });
  } catch (error) {
    if (
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Tutor not found." },
        { status: 404 }
      );
    }

    console.error(
      "ADMIN_TUTOR_SHARE_CREATE_ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Failed to create the profile link." },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE — turn the public profile link off
// =====================================================

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const result = await prisma.tutor.updateMany({
      where: { id },
      data: { profileShareToken: null },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Tutor not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "ADMIN_TUTOR_SHARE_DELETE_ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Failed to turn off the profile link." },
      { status: 500 }
    );
  }
}
