import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { isSheetSyncConfigured } from "@/lib/google-sheets";
import { syncJobSheetRow } from "@/lib/job-sheet-sync";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Manual re-sync of one job's sheet row.
 *
 * Every other sheet write is a side effect of a job change and is
 * silent about failure. This route exists only for the sheet call, so
 * here a failure *is* the result: it answers 502 with the Sheets API's
 * own wording, which the admin UI shows inline.
 */
export async function POST(
  _request: Request,
  { params }: RouteContext
) {
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
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found.",
        },
        { status: 404 }
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

    const sheet = await syncJobSheetRow(job.id);

    if (sheet.status === "FAILED") {
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
    console.error("Failed to sync the Google Sheet row:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync the Google Sheet row.",
      },
      { status: 500 }
    );
  }
}
