import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    await destroyAdminSession();

    // Same host the form was posted from (never a localhost fallback), and
    // 303 so the browser follows with a GET rather than re-POSTing.
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  } catch (error) {
    console.error("Admin logout failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to logout.",
      },
      { status: 500 }
    );
  }
}
