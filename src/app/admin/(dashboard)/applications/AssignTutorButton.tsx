"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface AssignTutorButtonProps {
  applicationId: string;
  tutorName: string;
  jobCode: string;
}

/**
 * Assignment runs a single transaction server-side: accept this application,
 * reject the job's others, and close the job. The consequences are spelled out
 * in the dialog rather than in a `window.confirm` string.
 *
 * Errors surface inside the dialog — the previous absolutely-positioned
 * popover was clipped by the table's `overflow-x-auto` ancestor.
 */
export default function AssignTutorButton({
  applicationId,
  tutorName,
  jobCode,
}: AssignTutorButtonProps) {
  const router = useRouter();

  async function assign() {
    if (!applicationId) {
      throw new Error("Application ID is missing.");
    }

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
      throw new Error(data.message || "Failed to assign tutor.");
    }

    toast.success(`${tutorName} assigned to ${jobCode}.`);
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" aria-label={`Assign ${tutorName} to ${jobCode}`}>
          <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
          Assign
        </Button>
      }
      title={`Assign ${tutorName} to ${jobCode}?`}
      description={
        <>
          This will, in one step:
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Accept this tutor&apos;s application</li>
            <li>Assign the tutor to the job</li>
            <li>Reject all other applicants for this job</li>
            <li>Close the job</li>
          </ul>
        </>
      }
      confirmLabel="Assign tutor"
      onConfirm={assign}
    />
  );
}
