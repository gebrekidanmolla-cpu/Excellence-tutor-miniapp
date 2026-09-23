"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type ApplicationStatus = "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";

interface StatusActionsProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
  tutorName: string;
  jobCode: string;
}

/**
 * The actions on the application detail page.
 *
 * Assigning used to live only on the applications list, so reading a full
 * application and then choosing that tutor meant navigating back and finding
 * the row again. It runs the same `POST .../assign` transaction as the list
 * and the job page — accept, assign, reject the rest, close the job — which
 * is why it is a confirm dialog spelling out all four effects and not a bare
 * button.
 *
 * The caller only renders this when the job is open and unassigned, so no
 * state is guarded here beyond the application's own status.
 */
export default function StatusActions({
  applicationId,
  currentStatus,
  tutorName,
  jobCode,
}: StatusActionsProps) {
  const router = useRouter();

  /** Throws so `ConfirmDialog` keeps itself open and shows the message. */
  async function updateStatus(status: ApplicationStatus) {
    /* No trailing slash: the previous URL ended in `/`, which the router
       redirects, and a redirected PATCH does not carry its method. */
    const response = await fetch(
      `/api/admin/applications/${applicationId}`,
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

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to update application status."
      );
    }

    toast.success("Application status updated.");
    router.refresh();
  }

  async function assign() {
    const response = await fetch(
      `/api/admin/applications/${applicationId}/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to assign tutor.");
    }

    toast.success(`${tutorName} assigned to ${jobCode}.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        trigger={
          <Button size="xl">
            <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
            Assign tutor
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
            <p className="mt-3">
              Re-opening the job later undoes all of it: the tutor is
              unassigned and every application goes back to pending.
            </p>
          </>
        }
        confirmLabel="Assign tutor"
        onConfirm={assign}
      />

      <ConfirmDialog
        trigger={
          <Button
            variant="outline"
            size="xl"
            disabled={currentStatus === "REVIEWED"}
          >
            <Eye data-icon="inline-start" aria-hidden="true" />
            Mark reviewed
          </Button>
        }
        title="Mark this application as reviewed?"
        description="This records that the application has been looked at. It does not accept or reject the tutor."
        confirmLabel="Mark reviewed"
        onConfirm={() => updateStatus("REVIEWED")}
      />

      <ConfirmDialog
        trigger={
          <Button
            variant="destructive"
            size="xl"
            disabled={currentStatus === "REJECTED"}
          >
            <XCircle data-icon="inline-start" aria-hidden="true" />
            Reject
          </Button>
        }
        title="Reject this application?"
        description="The tutor will see this application as rejected. Other applications for this job are unaffected, and re-opening the job puts this one back to pending."
        confirmLabel="Reject application"
        variant="destructive"
        onConfirm={() => updateStatus("REJECTED")}
      />
    </div>
  );
}
