import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-session";

export async function POST() {
  try {
    await destroyAdminSession();

    return NextResponse.redirect(
      new URL("/admin/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
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