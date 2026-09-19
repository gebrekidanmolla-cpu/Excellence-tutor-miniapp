"use client";

import { useState } from "react";

type ApplicationStatus =
  | "PENDING"
  | "REVIEWED"
  | "ACCEPTED"
  | "REJECTED";

type Props = {
  applicationId: string;
  initialStatus: ApplicationStatus;
};

const statuses: ApplicationStatus[] = [
  "PENDING",
  "REVIEWED",
  "REJECTED",
];

const labels: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export default function ApplicationStatusSelect({
  applicationId,
  initialStatus,
}: Props) {
  const [status, setStatus] =
    useState<ApplicationStatus>(initialStatus);

  const [saving, setSaving] = useState(false);

  async function handleChange(
    nextStatus: ApplicationStatus
  ) {
    // ACCEPTED must only happen through the Assign Tutor workflow.
    if (nextStatus === "ACCEPTED") {
      return;
    }

    const previousStatus = status;

    setStatus(nextStatus);
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to update application status."
        );
      }
    } catch (error) {
      console.error(
        "Failed to update application status:",
        error
      );

      setStatus(previousStatus);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update application status."
      );
    } finally {
      setSaving(false);
    }
  }

  // Once accepted, it should be displayed as read-only.
  if (status === "ACCEPTED") {
    return (
      <span className="inline-flex h-8 items-center rounded-lg border border-gray-400 bg-gray-200 px-2.5 text-xs font-semibold text-gray-900 dark:border-gray-500 dark:bg-gray-600 dark:text-white">
        {labels.ACCEPTED}
      </span>
    );
  }

  return (
    <div className="relative inline-flex">
      <select
        value={status}
        disabled={saving}
        onChange={(event) =>
          handleChange(
            event.target.value as ApplicationStatus
          )
        }
        className={`h-8 rounded-lg border px-2.5 pr-7 text-xs font-medium outline-none transition disabled:cursor-wait disabled:opacity-60 ${
          status === "PENDING"
            ? "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            : status === "REVIEWED"
              ? "border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              : "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        }`}
      >
        {statuses.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </select>

      {saving && (
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
          …
        </span>
      )}
    </div>
  );
}
