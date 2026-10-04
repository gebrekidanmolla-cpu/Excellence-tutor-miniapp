"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormError } from "@/components/shared/ErrorState";

type JobStatus = "OPEN" | "CLOSED";

interface JobActionsProps {
  jobId: string;
  jobCode: string;
  currentStatus: JobStatus;
  /** Named in the re-open dialog, so the admin knows what returns to the pool. */
  applicationCount: number;
  assignedTutorName: string | null;
  /** Whether a channel post will be removed along with the job. */
  hasChannelPost: boolean;
}

/**
 * Two actions: close, and re-open.
 *
 * Re-opening never goes through `PATCH .../status`. That only flips `status`
 * and leaves `assignedTutorId` set — the job would take new applications that
 * could never be assigned, because both the assign route and the application
 * status route refuse a job with an assigned tutor. The API rejects that
 * transition outright, so re-opening is always `POST .../reopen`, which
 * unassigns, resets the whole pool to pending and opens the job in one
 * transaction.
 */
export default function JobActions({
  jobId,
  jobCode,
  currentStatus,
  applicationCount,
  assignedTutorName,
  hasChannelPost,
}: JobActionsProps) {
  const router = useRouter();

  const [error, setError] = useState("");

  /**
   * Throws on failure so `ConfirmDialog` can keep itself open and show the
   * message, instead of the old `window.confirm` + inline-div pairing.
   */
  async function close() {
    setError("");

    await closeJob(jobId);

    toast.success("Job closed.");

    router.refresh();
  }

  async function reopen() {
    setError("");

    toast.success(await reopenJob(jobId));

    router.refresh();
  }

  /**
   * Deletes the job and every application to it. Offered whatever the
   * job's state; the dialog names how many applications go with it.
   */
  async function remove() {
    setError("");

    const response = await fetch(`/api/admin/jobs/${jobId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to delete job.");
    }

    toast.success(result.message);

    /* The job page this renders on is about to 404. */
    router.push("/admin/jobs");
    router.refresh();
  }

  const deleteAction = (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="xl">
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          Delete job
        </Button>
      }
      title={`Delete job ${jobCode}?`}
      description={
        <>
          This removes the job permanently and cannot be undone.
          {applicationCount > 0 ? (
            <>
              {" "}
              <strong>
                {applicationCount === 1
                  ? "Its 1 application is"
                  : `All ${applicationCount} of its applications are`}{" "}
                deleted too
              </strong>
              , and those tutors will no longer see it in their
              applications.
            </>
          ) : null}
          {hasChannelPost ? (
            <> Its Telegram channel post is deleted too.</>
          ) : null}
          <p className="mt-3">
            To end a live vacancy instead, close it — that stops new
            applications while keeping the record and the channel post.
          </p>
        </>
      }
      confirmLabel="Delete job"
      variant="destructive"
      onConfirm={remove}
    />
  );

  // -------------------------------------------------------
  // OPEN -> close
  // -------------------------------------------------------

  if (currentStatus === "OPEN" && !assignedTutorName) {
    return (
      <div className="space-y-4">
        <FormError message={error} />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="xl">
                <Lock data-icon="inline-start" aria-hidden="true" />
                Close job
              </Button>
            }
            title="Close this job?"
            description="The job will stop accepting new applications. Existing applications are not changed."
            confirmLabel="Close job"
            variant="destructive"
            onConfirm={close}
          />

          {deleteAction}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // CLOSED (or assigned) -> re-open
  // -------------------------------------------------------

  return (
    <div className="space-y-4">
      <FormError message={error} />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <ConfirmDialog
          trigger={
            <Button size="xl">
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Re-open job
            </Button>
          }
          title="Re-open this job?"
          description={
            <ReopenJobDescription
              applicationCount={applicationCount}
              assignedTutorName={assignedTutorName}
            />
          }
          confirmLabel="Re-open job"
          onConfirm={reopen}
        />

        {deleteAction}
      </div>
    </div>
  );
}

// =========================================================
// SHARED WITH THE JOBS LIST
// =========================================================
//
// The jobs list offers the same close / re-open on each row, so the requests
// and the re-open explanation live here once rather than in two copies.

/** Throws with the API's message, so `ConfirmDialog` can show it in place. */
export async function closeJob(jobId: string) {
  const response = await fetch(`/api/admin/jobs/${jobId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "CLOSED",
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update job status.");
  }
}

/** Resolves to the API's confirmation message. */
export async function reopenJob(jobId: string): Promise<string> {
  const response = await fetch(`/api/admin/jobs/${jobId}/reopen`, {
    method: "POST",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to reopen job.");
  }

  return result.message;
}

export function ReopenJobDescription({
  applicationCount,
  assignedTutorName,
}: {
  applicationCount: number;
  assignedTutorName: string | null;
}) {
  const applicationLabel =
    applicationCount === 1
      ? "application"
      : `all ${applicationCount} applications`;

  return (
    <>
      This will, in one step:
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {assignedTutorName ? (
          <li>
            Unassign <strong>{assignedTutorName}</strong> from this job
          </li>
        ) : null}

        {applicationCount > 0 ? (
          <li>
            Put {applicationLabel} back to <strong>pending</strong>,
            including accepted and rejected ones
          </li>
        ) : null}

        <li>Re-open the job so more tutors can apply</li>
      </ul>
      {applicationCount > 0 ? (
        <p className="mt-3">
          Nothing is deleted — everyone who already applied stays in the
          pool, so you can assign one of them straight away or wait for
          new applicants. Tutors who applied before will see their
          application as pending again.
        </p>
      ) : null}
    </>
  );
}
