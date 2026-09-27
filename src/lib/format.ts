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

/** The tutor-facing label, which reads as a state rather than a keyword. */
const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pending Review",
  REVIEWED: "Reviewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export function getApplicationStatusLabel(status: string): string {
  return (
    APPLICATION_STATUS_LABELS[status as ApplicationStatus] ??
    formatEnum(status)
  );
}

const APPLICATION_STATUS_DESCRIPTIONS: Record<ApplicationStatus, string> = {
  PENDING:
    "Your application has been submitted and is waiting for review by the Excellence Tutor team.",
  REVIEWED: "Your application has been reviewed by the Excellence Tutor team.",
  ACCEPTED: "Congratulations! Your application has been accepted.",
  REJECTED: "Your application was not selected for this tutoring job.",
};

export function getApplicationStatusDescription(status: string): string {
  return (
    APPLICATION_STATUS_DESCRIPTIONS[status as ApplicationStatus] ??
    "Your application status has been updated."
  );
}
