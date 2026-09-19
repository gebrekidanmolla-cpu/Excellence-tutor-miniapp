import { NextResponse } from "next/server";
import { destroyTutorSession } from "@/lib/session";

export async function POST() {
  try {
    await destroyTutorSession();

    return NextResponse.json({
      success: true,
      message:
        "Logged out successfully.",
    });
  } catch (error) {
    console.error(
      "Logout API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to log out.",
      },
      { status: 500 }
    );
  }
}