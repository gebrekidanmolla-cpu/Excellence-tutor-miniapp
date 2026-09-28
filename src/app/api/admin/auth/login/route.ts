import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { createAdminSession } from "@/lib/admin-session";
import {
  LOGIN_RATE_LIMITED_MESSAGE,
  LOGIN_RETRY_AFTER_SECONDS,
  clearLoginFailures,
  compareAgainstDummyHash,
  isLoginRateLimited,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    if (await isLoginRateLimited("ADMIN", email, request)) {
      return NextResponse.json(
        { success: false, message: LOGIN_RATE_LIMITED_MESSAGE },
        {
          status: 429,
          headers: { "Retry-After": String(LOGIN_RETRY_AFTER_SECONDS) },
        }
      );
    }

    const admin = await prisma.admin.findUnique({
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

    let passwordMatches = false;

    if (admin) {
      passwordMatches = await comparePassword(password, admin.passwordHash);
    } else {
      await compareAgainstDummyHash(password);
    }

    // Same message and the same bcrypt time whether or not the email exists.
    if (!admin || !passwordMatches) {
      await recordLoginFailure("ADMIN", email, request);

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    await clearLoginFailures("ADMIN", email);

    await createAdminSession(admin.id);

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Admin login failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
