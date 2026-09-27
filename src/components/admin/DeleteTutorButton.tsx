"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface DeleteTutorButtonProps {
  tutorId: string;
  tutorName: string;
  /** Named in the dialog, so the admin knows how much history goes. */
  applicationCount: number;
  /** Codes of the jobs this tutor is assigned to; each is unassigned. */
  assignedJobCodes: string[];
}

/**
 * Deletes the tutor's account, their applications and their uploaded
 * documents. Throws on failure so `ConfirmDialog` keeps itself open and
 * shows the message.
 */
export default function DeleteTutorButton({
  tutorId,
  tutorName,
  applicationCount,
  assignedJobCodes,
}: DeleteTutorButtonProps) {
  const router = useRouter();

  async function remove() {
    const response = await fetch(`/api/admin/tutors/${tutorId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to delete tutor.");
    }

    toast.success(result.message);

    /* The tutor page this renders on is about to 404. */
    router.push("/admin/tutors");
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="xl">
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          Delete tutor
        </Button>
      }
      title={`Delete ${tutorName}?`}
      description={
        <>
          This removes the tutor&apos;s account and uploaded documents
          permanently and cannot be undone. They will no longer be able to
          sign in.
          {applicationCount > 0 ? (
            <>
              {" "}
              <strong>
                {applicationCount === 1
                  ? "Their 1 application is"
                  : `All ${applicationCount} of their applications are`}{" "}
                deleted too.
              </strong>
            </>
          ) : null}
          {assignedJobCodes.length > 0 ? (
            <p className="mt-3">
              They are assigned to{" "}
              <strong className="font-mono">
                {assignedJobCodes.join(", ")}
              </strong>
              . {assignedJobCodes.length === 1 ? "That job is" : "Those jobs are"}{" "}
              left closed with no assigned tutor — re-open{" "}
              {assignedJobCodes.length === 1 ? "it" : "them"} if the vacancy
              is still live.
            </p>
          ) : null}
        </>
      }
      confirmLabel="Delete tutor"
      variant="destructive"
      onConfirm={remove}
    />
  );
}
