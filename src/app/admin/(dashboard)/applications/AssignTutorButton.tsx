"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface AssignTutorButtonProps {
  applicationId: string;
  tutorName: string;
  jobCode: string;
}

export default function AssignTutorButton({
  applicationId,
  tutorName,
  jobCode,
}: AssignTutorButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  async function handleAssignTutor() {
    if (!applicationId) {
      setError("Application ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Assign ${tutorName} to job ${jobCode}?\n\n` +
        `This will:\n` +
        `• Accept this tutor\n` +
        `• Assign the tutor to the job\n` +
        `• Reject all other applicants\n` +
        `• Close the job`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/applications/${applicationId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to assign tutor."
        );
      }

      router.refresh();
    } catch (error) {
      console.error("Assignment error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to assign tutor."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleAssignTutor}
        disabled={isLoading}
        title={`Assign ${tutorName} to ${jobCode}`}
        className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-green-600 px-2.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2
              size={13}
              className="animate-spin"
            />
            ...
          </>
        ) : (
          <>
            <CheckCircle2 size={13} />
            Assign
          </>
        )}
      </button>

      {error && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

