import { NextResponse } from "next/server";
import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashCode(code: string) {
  return createHash("sha256")
    .update(code)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = normalizeEmail(
      String(body.email ?? "")
    );

    const code = String(
      body.code ?? ""
    ).trim();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter the 6-digit verification code.",
        },
        { status: 400 }
      );
    }

    const verification =
      await prisma.emailVerification.findFirst({
        where: {
          email,
          verifiedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active verification code found. Please request a new code.",
        },
        { status: 400 }
      );
    }

    if (
      verification.expiresAt.getTime() <
      Date.now()
    ) {
      await prisma.emailVerification.delete({
        where: {
          id: verification.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "This verification code has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    /*
     * Maximum 5 attempts.
     */
    if (verification.attempts >= 5) {
      await prisma.emailVerification.delete({
        where: {
          id: verification.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Too many incorrect attempts. Please request a new code.",
        },
        { status: 429 }
      );
    }

    const submittedHash =
      hashCode(code);

    if (
      submittedHash !==
      verification.codeHash
    ) {
      await prisma.emailVerification.update({
        where: {
          id: verification.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Incorrect verification code.",
        },
        { status: 400 }
      );
    }

    await prisma.emailVerification.update({
      where: {
        id: verification.id,
      },
      data: {
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Email verified successfully.",
    });
  } catch (error) {
    console.error(
      "Verify email error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to verify email. Please try again.",
      },
      { status: 500 }
    );
  }
}