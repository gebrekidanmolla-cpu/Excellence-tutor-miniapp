"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormError } from "@/components/shared/ErrorState";

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

  const [error, setError] = useState("");

  /**
   * Throws on failure so `ConfirmDialog` can keep itself open and show the
   * message, instead of the old `window.confirm` + inline-div pairing.
   */
  async function updateStatus(status: JobStatus) {
    setError("");

    const response = await fetch(`/api/admin/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to update job status.");
    }

    toast.success(
      status === "CLOSED" ? "Job closed." : "Job reopened."
    );

    router.refresh();
  }

  const closing = currentStatus === "OPEN";

  return (
    <div className="space-y-4">
      <FormError message={error} />

      <ConfirmDialog
        trigger={
          <Button variant={closing ? "destructive" : "default"} size="xl">
            {closing ? (
              <Lock data-icon="inline-start" aria-hidden="true" />
            ) : (
              <LockOpen data-icon="inline-start" aria-hidden="true" />
            )}
            {closing ? "Close job" : "Reopen job"}
          </Button>
        }
        title={closing ? "Close this job?" : "Reopen this job?"}
        description={
          closing
            ? "The job will stop accepting new applications. Existing applications are not changed."
            : "The job will start accepting new applications again."
        }
        confirmLabel={closing ? "Close job" : "Reopen job"}
        variant={closing ? "destructive" : "default"}
        onConfirm={() => updateStatus(closing ? "CLOSED" : "OPEN")}
      />
    </div>
  );
}
