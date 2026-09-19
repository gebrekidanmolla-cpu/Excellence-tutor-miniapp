"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type JobStatus = "OPEN" | "CLOSED";

interface JobActionsProps {
  jobId: string;
  currentStatus: JobStatus;
}

export default function JobActions({
  jobId,
  currentStatus,
}: JobActionsProps) {
  const router = useRouter();

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [error, setError] =
    useState("");

  async function updateStatus(
    status: JobStatus
  ) {
    if (status === currentStatus) {
      return;
    }

    const action =
      status === "CLOSED"
        ? "close"
        : "reopen";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${action} this job?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setIsUpdating(true);

    try {
      const response = await fetch(
        `/api/admin/jobs/${jobId}/status`,
        {
            method: "PATCH",
            headers: {
            "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
            status,
            }),
        }
     );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to update job status."
        );

        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-4">

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {currentStatus === "OPEN" ? (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() =>
            updateStatus("CLOSED")
          }
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating
            ? "Closing Job..."
            : "Close Job"}
        </button>
      ) : (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() =>
            updateStatus("OPEN")
          }
          className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating
            ? "Opening Job..."
            : "Reopen Job"}
        </button>
      )}

    </div>
  );
}