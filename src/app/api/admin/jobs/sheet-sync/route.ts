import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-session";
import { isSheetSyncConfigured } from "@/lib/google-sheets";
import { syncAllJobSheetRows } from "@/lib/job-sheet-sync";

/**
 * Writes every job into the Google Sheet — the backfill for jobs that
 * predate sheet mirroring, and the repair for any that failed since.
 * Safe to run repeatedly: existing rows are rewritten in place, never
 * duplicated.
 */
export async function POST() {
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

  if (!isSheetSyncConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: "Google Sheets sync is not configured.",
      },
      { status: 409 }
    );
  }

  try {
    const sheet = await syncAllJobSheetRows();

    if (sheet.status === "FAILED" || sheet.status === "PARTIAL") {
      return NextResponse.json(
        {
          success: false,
          message: sheet.message,
          sheet,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: sheet.message,
      sheet,
    });
  } catch (error) {
    console.error("Failed to sync all jobs to the Google Sheet:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync jobs to the Google Sheet.",
      },
      { status: 500 }
    );
  }
}
