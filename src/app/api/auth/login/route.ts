import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { createTutorSession } from "@/lib/session";

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

    /*
     * Use the same generic message for both
     * cases so we don't reveal whether
     * an email exists.
     */
    if (!tutor) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const passwordValid =
      await comparePassword(
        password,
        tutor.passwordHash
      );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

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