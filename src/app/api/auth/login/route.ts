import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { createTutorSession } from "@/lib/session";
import {
  LOGIN_RATE_LIMITED_MESSAGE,
  LOGIN_RETRY_AFTER_SECONDS,
  clearLoginFailures,
  compareAgainstDummyHash,
  isLoginRateLimited,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email and password are required.",
        },
        { status: 400 }
      );
    }

    if (await isLoginRateLimited("TUTOR", email, request)) {
      return NextResponse.json(
        { success: false, message: LOGIN_RATE_LIMITED_MESSAGE },
        {
          status: 429,
          headers: { "Retry-After": String(LOGIN_RETRY_AFTER_SECONDS) },
        }
      );
    }

    const tutor =
      await prisma.tutor.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          passwordHash: true,
        },
      });

    let passwordValid = false;

    if (tutor) {
      passwordValid = await comparePassword(password, tutor.passwordHash);
    } else {
      await compareAgainstDummyHash(password);
    }

    /*
     * Same generic message for both cases so we don't reveal whether an
     * email exists — and the same bcrypt time, via the dummy hash.
     */
    if (!tutor || !passwordValid) {
      await recordLoginFailure("TUTOR", email, request);

      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    await clearLoginFailures("TUTOR", email);

    await createTutorSession(
      tutor.id
    );

    return NextResponse.json({
      success: true,
      message:
        "Login successful.",
      tutor: {
        id: tutor.id,
        fullName:
          tutor.fullName,
        email: tutor.email,
      },
    });
  } catch (error) {
    console.error(
      "Login API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while logging in.",
      },
      { status: 500 }
    );
  }
}