import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createTutorSession } from "@/lib/session";
import { findTutorByResetToken } from "@/lib/password-reset";
import { passwordSchema } from "@/app/register/schema";

const LINK_EXPIRED =
  "This reset link has expired or has already been used. Please request a new one.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

    const parsed = passwordSchema.safeParse(password);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          field: "password",
          message: parsed.error.issues[0]?.message ?? "Invalid password.",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          field: "confirmPassword",
          message: "Passwords do not match.",
        },
        { status: 400 }
      );
    }

    const tutor = token ? await findTutorByResetToken(token) : null;

    if (!tutor) {
      return NextResponse.json(
        { success: false, code: "TOKEN_INVALID", message: LINK_EXPIRED },
        { status: 400 }
      );
    }

    /*
     * Conditional on the hash the token was checked against, so two requests
     * racing with the same link can't both succeed: whichever lands second
     * matches no row.
     */
    const { count } = await prisma.tutor.updateMany({
      where: { id: tutor.id, passwordHash: tutor.passwordHash },
      data: {
        passwordHash: await hashPassword(password),
        // Signs the tutor out everywhere else: every existing cookie carries
        // the old version. This device gets a fresh session just below.
        sessionVersion: { increment: 1 },
      },
    });

    if (count === 0) {
      return NextResponse.json(
        { success: false, code: "TOKEN_INVALID", message: LINK_EXPIRED },
        { status: 400 }
      );
    }

    // The row above only matched the hash this token was checked against,
    // so nothing else bumped the version in between.
    await createTutorSession({
      id: tutor.id,
      sessionVersion: tutor.sessionVersion + 1,
    });

    return NextResponse.json({
      success: true,
      signedIn: true,
      message: "Your password has been updated.",
    });
  } catch (error) {
    console.error("Reset password API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while resetting your password.",
      },
      { status: 500 }
    );
  }
}
