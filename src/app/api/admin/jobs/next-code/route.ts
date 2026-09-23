import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-session";
import { generateNextJobCode } from "@/lib/job-code";

/**
 * A preview only — the code actually assigned on submit is decided
 * inside `POST /api/admin/jobs`'s own retry loop, which re-derives it
 * right before the insert. Two admins opening the create form at once
 * can see the same preview; only one of them will get it.
 */
export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const jobCode = await generateNextJobCode();

    return NextResponse.json({
      success: true,
      jobCode,
    });
  } catch (error) {
    console.error("Failed to preview next job code:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to preview next job code.",
      },
      { status: 500 }
    );
  }
}
