import { prisma } from "@/lib/prisma";
import {
  appendSheetRows,
  batchUpdateSheetRows,
  deleteSheetRowByCode,
  findRowNumberByCode,
  isSheetSyncConfigured,
  readRowNumbersByCode,
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
// successful admin action into a 500. Also like the Telegram sync,
// every outcome is recorded on the `Job` row (`sheetSyncStatus`,
// `sheetSyncError`, `sheetSyncedAt`), so a failure shows up in the
// admin UI with a retry button instead of only in the server log.
//
// ==========================================

/** `sheetSyncError` is rendered in the admin UI; keep it readable. */
const ERROR_MAX_LENGTH = 500;

export type SheetSyncOutcome =
  | { status: "SKIPPED"; reason: "NOT_CONFIGURED" | "JOB_NOT_FOUND"; message: string }
  | { status: "CREATED"; message: string }
  | { status: "UPDATED"; message: string }
  | { status: "FAILED"; message: string };

export type SheetSyncAllOutcome =
  | { status: "SKIPPED"; reason: "NOT_CONFIGURED"; message: string }
  | {
      status: "DONE" | "PARTIAL" | "FAILED";
      created: number;
      updated: number;
      failed: number;
      message: string;
    };

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

type SheetJob = {
  jobCode: string;
  parentName: string;
  parentPhone: string;
  assignedTutor: { fullName: string; phone: string } | null;
};

function toSheetRow(job: SheetJob): SheetRow {
  return [
    job.jobCode,
    job.parentName,
    job.parentPhone,
    job.assignedTutor?.fullName ?? "",
    job.assignedTutor?.phone ?? "",
  ];
}

function describe(cause: unknown): string {
  if (cause instanceof SheetsApiError) {
    return cause.message.slice(0, ERROR_MAX_LENGTH);
  }

  if (cause instanceof SheetsNotConfiguredError) {
    return cause.message;
  }

  return "Google Sheets sync failed.";
}

async function recordSynced(jobIds: string[]): Promise<void> {
  await prisma.job.updateMany({
    where: { id: { in: jobIds } },
    data: {
      sheetSyncStatus: "SYNCED",
      sheetSyncError: null,
      sheetSyncedAt: new Date(),
    },
  });
}

async function recordFailed(jobIds: string[], description: string): Promise<void> {
  await prisma.job
    .updateMany({
      where: { id: { in: jobIds } },
      data: {
        sheetSyncStatus: "FAILED",
        sheetSyncError: description,
      },
    })
    .catch((writeError) => {
      console.error("Failed to record the Google Sheets error:", writeError);
    });
}

/**
 * Not an error: nobody asked for sheet mirroring. Marks the row so the
 * UI can say so, but only a job that never reached a sheet — one that
 * did stays `SYNCED`, since the row it wrote is still there.
 */
async function recordDisabled(where: { id?: string }): Promise<void> {
  await prisma.job
    .updateMany({
      where: { ...where, sheetSyncStatus: "PENDING" },
      data: { sheetSyncStatus: "DISABLED" },
    })
    .catch(() => undefined);
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
    await recordDisabled({ id: jobId });

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

  const values = toSheetRow(job);

  try {
    const rowNumber = await findRowNumberByCode(job.jobCode);

    if (rowNumber === null) {
      await appendSheetRows([values]);
    } else {
      await updateSheetRow(rowNumber, values);
    }

    await recordSynced([job.id]);

    return rowNumber === null
      ? { status: "CREATED", message: "Row added to the Google Sheet." }
      : { status: "UPDATED", message: "The Google Sheet row was updated." };
  } catch (cause) {
    const description = describe(cause);

    console.error(`Google Sheets sync failed for job ${job.jobCode}:`, description);

    await recordFailed([job.id], description);

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

export type SheetRemoveOutcome =
  | { status: "SKIPPED"; message: string }
  | { status: "REMOVED" | "NOT_FOUND"; message: string }
  | { status: "FAILED"; message: string };

/**
 * Removes a deleted job's row from the sheet. Takes the code rather
 * than an id because the `Job` row is already gone by the time this
 * runs — which is also why, unlike the sync, there is nowhere to
 * record the outcome: the caller reports it in its response instead.
 * Never throws.
 */
export async function safeRemoveJobSheetRow(
  jobCode: string
): Promise<SheetRemoveOutcome> {
  if (!isSheetSyncConfigured()) {
    return {
      status: "SKIPPED",
      message: "Google Sheets sync is not configured.",
    };
  }

  try {
    const removed = await deleteSheetRowByCode(jobCode);

    return removed
      ? { status: "REMOVED", message: "Row removed from the Google Sheet." }
      : { status: "NOT_FOUND", message: "The job had no row in the Google Sheet." };
  } catch (cause) {
    const description = describe(cause);

    console.error(
      `Failed to remove the Google Sheet row for job ${jobCode}:`,
      description
    );

    return { status: "FAILED", message: description };
  }
}

/**
 * Writes every job into the sheet: rewrites the rows that already
 * exist and appends the rest, oldest job first. Costs three API calls
 * however many jobs there are — one read of column A, one batch
 * update, one append — which is what keeps it inside the Sheets API's
 * 60-requests-a-minute quota.
 *
 * The update and the append succeed or fail independently, and each
 * job's recorded status reflects the call that carried it.
 */
export async function syncAllJobSheetRows(): Promise<SheetSyncAllOutcome> {
  if (!isSheetSyncConfigured()) {
    await recordDisabled({});

    return {
      status: "SKIPPED",
      reason: "NOT_CONFIGURED",
      message: "Google Sheets sync is not configured.",
    };
  }

  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "asc" },
    select: JOB_SELECT,
  });

  const allIds = jobs.map((job) => job.id);

  let rowNumbers: Map<string, number>;

  try {
    rowNumbers = await readRowNumbersByCode();
  } catch (cause) {
    const description = describe(cause);

    console.error("Google Sheets sync-all failed reading the sheet:", description);

    await recordFailed(allIds, description);

    return {
      status: "FAILED",
      created: 0,
      updated: 0,
      failed: jobs.length,
      message: description,
    };
  }

  const toUpdate = jobs.filter((job) => rowNumbers.has(job.jobCode));
  const toAppend = jobs.filter((job) => !rowNumbers.has(job.jobCode));

  const errors: string[] = [];
  let updated = 0;
  let created = 0;

  try {
    await batchUpdateSheetRows(
      toUpdate.map((job) => ({
        rowNumber: rowNumbers.get(job.jobCode)!,
        values: toSheetRow(job),
      }))
    );

    await recordSynced(toUpdate.map((job) => job.id));

    updated = toUpdate.length;
  } catch (cause) {
    const description = describe(cause);

    console.error("Google Sheets sync-all failed updating rows:", description);

    await recordFailed(toUpdate.map((job) => job.id), description);

    errors.push(description);
  }

  try {
    await appendSheetRows(toAppend.map(toSheetRow));

    await recordSynced(toAppend.map((job) => job.id));

    created = toAppend.length;
  } catch (cause) {
    const description = describe(cause);

    console.error("Google Sheets sync-all failed appending rows:", description);

    await recordFailed(toAppend.map((job) => job.id), description);

    errors.push(description);
  }

  const failed = jobs.length - created - updated;
  const summary = `${created} added, ${updated} updated`;

  if (errors.length === 0) {
    return {
      status: "DONE",
      created,
      updated,
      failed,
      message: `Google Sheet synced: ${summary}.`,
    };
  }

  return {
    status: created + updated > 0 ? "PARTIAL" : "FAILED",
    created,
    updated,
    failed,
    message: `${summary}, ${failed} failed: ${errors[0]}`,
  };
}
