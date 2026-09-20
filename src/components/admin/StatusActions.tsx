"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Info, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type ApplicationStatus = "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";

interface StatusActionsProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
}

export default function StatusActions({
  applicationId,
  currentStatus,
}: StatusActionsProps) {
  const router = useRouter();

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ConfirmDialog
          trigger={
            <Button size="xl" disabled={currentStatus === "REVIEWED"}>
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
          description="The tutor will see this application as rejected. Other applications for this job are unaffected."
          confirmLabel="Reject application"
          variant="destructive"
          onConfirm={() => updateStatus("REJECTED")}
        />

        {/* Accepting is not a status change: it runs a transaction that also
            assigns the tutor, rejects the other applicants and closes the job.
            The API rejects `status: "ACCEPTED"` here with a 400, so this is
            shown as unavailable rather than as a button that always fails. */}
        <Button
          size="xl"
          variant="outline"
          disabled
          title="Accepting happens through Assign Tutor"
        >
          <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
          Accept
        </Button>
      </div>

      <Alert>
        <Info aria-hidden="true" />
        <AlertDescription>
          Accepting a tutor is done with <strong>Assign Tutor</strong> on the
          applications list. That runs a single transaction: it accepts this
          tutor, rejects the other applicants and closes the job.
        </AlertDescription>
      </Alert>
    </div>
  );
}
