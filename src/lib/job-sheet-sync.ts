import { prisma } from "@/lib/prisma";
import {
  appendSheetRow,
  findRowNumberByCode,
  isSheetSyncConfigured,
  SheetsApiError,
  SheetsNotConfiguredError,
  updateSheetRow,
  type SheetRow,
} from "@/lib/google-sheets";

// ==========================================
// JOB ↔ SHEET ROW SYNC
// ==========================================
//
// The single entry point every route calls. Mirrors a job's Code,
// Parent's Name, Parent's Phone, Tutor's Name and Tutor's Phone into
// a Google Sheet the admin uses as a read-only backup — never a
// trigger for anything. The sheet is written to; it is never read for
// business logic.
//
// SERVER ONLY.
//
// Same containment contract as `telegram-job-post.ts`: called after
// the database write that prompted it has already committed, always
// awaited, and it never throws — a Sheets outage can never turn a
// successful admin action into a 500. Unlike the Telegram sync, there
// is no `Job` column recording the outcome and no admin-facing retry
// UI; a failure is `console.error`'d and otherwise silent, matching
// this feature's "just a mirror or backup" scope.
//
// ==========================================

export type SheetSyncOutcome =
  | { status: "SKIPPED"; reason: "NOT_CONFIGURED" | "JOB_NOT_FOUND"; message: string }
  | { status: "CREATED"; message: string }
  | { status: "UPDATED"; message: string }
  | { status: "FAILED"; message: string };

const JOB_SELECT = {
  id: true,
  jobCode: true,
  parentName: true,
  parentPhone: true,
  assignedTutor: {
    select: {
      fullName: true,
      phone: true,
    },
  },
} as const;

function describe(cause: unknown): string {
  if (cause instanceof SheetsApiError) {
    return cause.message;
  }

  if (cause instanceof SheetsNotConfiguredError) {
    return cause.message;
  }

  return "Google Sheets sync failed.";
}

/**
 * Re-reads the job fresh from the database and writes it into its
 * sheet row, creating one if none exists yet. A fresh read — rather
 * than data threaded through from the caller — is what lets every
 * call site use this one function unbranched: whatever the
 * just-committed write left behind (new parent info, a newly assigned
 * tutor, a newly cleared assignment) is exactly what gets written out.
 */
export async function syncJobSheetRow(jobId: string): Promise<SheetSyncOutcome> {
  if (!isSheetSyncConfigured()) {
    return {
      status: "SKIPPED",
      reason: "NOT_CONFIGURED",
      message: "Google Sheets sync is not configured.",
    };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: JOB_SELECT,
  });

  if (!job) {
    return {
      status: "SKIPPED",
      reason: "JOB_NOT_FOUND",
      message: "Job not found.",
    };
  }

  const values: SheetRow = [
    job.jobCode,
    job.parentName,
    job.parentPhone,
    job.assignedTutor?.fullName ?? "",
    job.assignedTutor?.phone ?? "",
  ];

  try {
    const rowNumber = await findRowNumberByCode(job.jobCode);

    if (rowNumber === null) {
      await appendSheetRow(values);

      return { status: "CREATED", message: "Row added to the Google Sheet." };
    }

    await updateSheetRow(rowNumber, values);

    return { status: "UPDATED", message: "The Google Sheet row was updated." };
  } catch (cause) {
    const description = describe(cause);

    console.error(`Google Sheets sync failed for job ${job.jobCode}:`, description);

    return { status: "FAILED", message: description };
  }
}

/** What the API routes call. Never throws under any circumstance. */
export async function safeSyncJobSheetRow(jobId: string): Promise<SheetSyncOutcome> {
  try {
    return await syncJobSheetRow(jobId);
  } catch (error) {
    console.error("Google Sheets sync crashed:", error);

    return { status: "FAILED", message: "Google Sheets sync failed." };
  }
}
