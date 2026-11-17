/**
 * Shared display formatters.
 *
 * These were previously re-declared in six-plus page files, which is how
 * `tutor/page.tsx` ended up rendering the raw enum `PENDING` while its sibling
 * page rendered "Pending Review". Import from here instead of re-writing them.
 */

export type ApplicationStatus =
  | "PENDING"
  | "REVIEWED"
  | "ACCEPTED"
  | "REJECTED";

export type JobStatus = "OPEN" | "CLOSED";

/**
 * How a closed job ended: `SUCCESSFUL` when it closed with a tutor
 * assigned, `FAILED` when it closed without one. Derived, never stored —
 * the assign transaction is the only way a job closes with a tutor, and
 * closing without one rejects its applicants (`PATCH .../status`). An open
 * job has no outcome yet. Admin-only: tutors and the channel see "Closed".
 *
 * Deleting a tutor unassigns them and leaves the job closed, so a job they
 * had filled reads as failed from then on.
 */
export type JobOutcome = "SUCCESSFUL" | "FAILED";

export function getJobOutcome(
  status: JobStatus,
  hasAssignedTutor: boolean
): JobOutcome | null {
  if (status !== "CLOSED") {
    return null;
  }

  return hasAssignedTutor ? "SUCCESSFUL" : "FAILED";
}

/**
 * Whether a job's Telegram channel post is live. `PENDING` is shared
 * with `ApplicationStatus` and reads correctly for both: the post has
 * not gone out yet.
 */
export type TelegramPostStatus =
  | "PENDING"
  | "POSTED"
  | "FAILED"
  | "DISABLED";

/**
 * Whether a job's row in the Google Sheet mirror is current. Shares
 * `PENDING`, `FAILED` and `DISABLED` with `TelegramPostStatus`, but
 * reads them differently — see `getSheetSyncLabel`.
 */
export type SheetSyncStatus =
  | "PENDING"
  | "SYNCED"
  | "FAILED"
  | "DISABLED";

export type Status =
  | ApplicationStatus
  | JobStatus
  | TelegramPostStatus
  | SheetSyncStatus;

const EM_DASH = "—";

/** `SELF_EMPLOYED` -> `Self Employed`. Nullish values render as an em dash. */
export function formatEnum(value: string | null | undefined): string {
  if (!value) {
    return EM_DASH;
  }

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** `Mar 4, 2026` — the compact form, for tables and cards. */
export function formatDate(value: Date | string | null | undefined): string {
  const date = toDate(value);

  if (!date) {
    return EM_DASH;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** `March 4, 2026` — the roomier form, for detail pages. */
export function formatDateLong(value: Date | string | null | undefined): string {
  const date = toDate(value);

  if (!date) {
    return EM_DASH;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** `March 4, 2026 at 2:05 PM` — where the exact moment matters. */
export function formatDateTime(value: Date | string | null | undefined): string {
  const date = toDate(value);

  if (!date) {
    return EM_DASH;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Salaries are always stored and displayed in ETB. */
export function formatSalary(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return EM_DASH;
  }

  return `${value.toLocaleString("en-US")} ETB`;
}

/** Compact labels, for badges and dense table cells. */
const STATUS_LABELS: Record<Status, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  OPEN: "Open",
  CLOSED: "Closed",
  POSTED: "Posted",
  FAILED: "Post failed",
  DISABLED: "Not configured",
  SYNCED: "Synced",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as Status] ?? formatEnum(status);
}

/** "Post failed" and "Pending" describe a Telegram post, not a sheet row. */
const SHEET_SYNC_LABELS: Record<SheetSyncStatus, string> = {
  PENDING: "Not synced",
  SYNCED: "Synced",
  FAILED: "Sync failed",
  DISABLED: "Not configured",
};

export function getSheetSyncLabel(status: SheetSyncStatus): string {
  return SHEET_SYNC_LABELS[status];
}

/**
 * What a tutor is shown for their own application.
 *
 * Tutors never see "Rejected". The word read as a verdict on them, and
 * tutors who saw it stopped applying. A `REJECTED` application is shown by
 * what happened to the job instead. Like `getJobOutcome`, this is derived and
 * never stored, so the enum keeps its name:
 *
 * - `TAKEN`: the job went to another tutor (the assign transaction).
 * - `JOB_CLOSED`: the job closed with nobody assigned. That is a failed job,
 *   or one whose tutor was deleted.
 * - `NOT_SELECTED`: an admin turned this one application down while the job
 *   stayed open. `PATCH /api/admin/applications/[id]` allows that only on an
 *   open, unassigned job, so an open job means this case.
 *
 * Admin views keep "Rejected", which is the accurate word for the team.
 */
export type TutorApplicationState =
  | Exclude<ApplicationStatus, "REJECTED">
  | "TAKEN"
  | "JOB_CLOSED"
  | "NOT_SELECTED";

export function getTutorApplicationState(
  status: ApplicationStatus,
  job: { status: JobStatus; assignedTutorId: string | null }
): TutorApplicationState {
  if (status !== "REJECTED") {
    return status;
  }

  if (job.status === "OPEN") {
    return "NOT_SELECTED";
  }

  return job.assignedTutorId ? "TAKEN" : "JOB_CLOSED";
}

/** Whether the state is one of the three a `REJECTED` application shows. */
export function isNotChosenState(
  state: TutorApplicationState
): state is "TAKEN" | "JOB_CLOSED" | "NOT_SELECTED" {
  return (
    state === "TAKEN" || state === "JOB_CLOSED" || state === "NOT_SELECTED"
  );
}

/** The tutor-facing label, which reads as a state rather than a keyword. */
const TUTOR_APPLICATION_LABELS: Record<TutorApplicationState, string> = {
  PENDING: "Pending Review",
  REVIEWED: "Reviewed",
  ACCEPTED: "Accepted",
  TAKEN: "Taken",
  JOB_CLOSED: "Job closed",
  NOT_SELECTED: "Not selected",
};

export function getTutorApplicationLabel(state: TutorApplicationState): string {
  return TUTOR_APPLICATION_LABELS[state];
}

/** The "not this time" lines stay short, and each ends by pointing at the next job. */
const TUTOR_APPLICATION_DESCRIPTIONS: Record<TutorApplicationState, string> = {
  PENDING:
    "Your application has been submitted and is waiting for review by the Excellence Tutor team.",
  REVIEWED: "Your application has been reviewed by the Excellence Tutor team.",
  ACCEPTED: "Congratulations! Your application has been accepted.",
  TAKEN: "Another tutor got this one. Keep applying!",
  JOB_CLOSED: "This job is closed. Keep applying!",
  NOT_SELECTED: "Not this time. Keep applying!",
};

export function getTutorApplicationDescription(
  state: TutorApplicationState
): string {
  return TUTOR_APPLICATION_DESCRIPTIONS[state];
}
