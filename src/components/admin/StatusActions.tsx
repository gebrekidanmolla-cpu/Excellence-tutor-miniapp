"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApplicationStatus =
  | "PENDING"
  | "REVIEWED"
  | "ACCEPTED"
  | "REJECTED";

interface StatusActionsProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
}

export default function StatusActions({
  applicationId,
  currentStatus,
}: StatusActionsProps) {
  const router = useRouter();

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [error, setError] =
    useState("");

  async function updateStatus(
    status: ApplicationStatus
  ) {
    if (status === currentStatus) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change the application status to ${status}?`
    );

    if (!confirmed) {
      return;
    }

    setIsUpdating(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/applications/${applicationId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to update application status."
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

      <div className="flex flex-wrap gap-3">

        <button
          type="button"
          disabled={
            isUpdating ||
            currentStatus === "REVIEWED"
          }
          onClick={() =>
            updateStatus("REVIEWED")
          }
          className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating
            ? "Updating..."
            : "Mark Reviewed"}
        </button>

        <button
          type="button"
          disabled={
            isUpdating ||
            currentStatus === "ACCEPTED"
          }
          onClick={() =>
            updateStatus("ACCEPTED")
          }
          className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Accept
        </button>

        <button
          type="button"
          disabled={
            isUpdating ||
            currentStatus === "REJECTED"
          }
          onClick={() =>
            updateStatus("REJECTED")
          }
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>

      </div>

      {isUpdating && (
        <p className="text-sm text-gray-500">
          Updating application status...
        </p>
      )}

    </div>
  );
}