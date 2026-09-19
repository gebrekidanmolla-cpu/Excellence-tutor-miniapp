import { NextResponse } from "next/server";
import { randomInt, createHash } from "crypto";

import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

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

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    /*
     * Check whether this email is already registered.
     */
    const existingTutor =
      await prisma.tutor.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

    if (existingTutor) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    /*
     * Prevent repeatedly requesting codes.
     */
    const recentVerification =
      await prisma.emailVerification.findFirst({
        where: {
          email,
          createdAt: {
            gt: new Date(
              Date.now() - 60 * 1000
            ),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (recentVerification) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please wait 60 seconds before requesting another code.",
        },
        { status: 429 }
      );
    }

    /*
     * Remove old verification records.
     */
    await prisma.emailVerification.deleteMany({
      where: {
        email,
      },
    });

    /*
     * Generate 6-digit code.
     */
    const code = randomInt(
      100000,
      1000000
    ).toString();

    const codeHash = hashCode(code);

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await prisma.emailVerification.create({
      data: {
        email,
        codeHash,
        expiresAt,
      },
    });

    /*
     * Send email.
     */
    await sendVerificationEmail(
      email,
      code
    );

    return NextResponse.json({
      success: true,
      message:
        "Verification code sent successfully.",
    });
  } catch (error) {
    console.error(
      "Send email verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to send verification code. Please try again.",
      },
      { status: 500 }
    );
  }
}