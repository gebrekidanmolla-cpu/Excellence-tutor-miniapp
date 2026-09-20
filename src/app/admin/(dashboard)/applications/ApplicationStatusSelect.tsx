"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";

type ApplicationStatus = "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";

type Props = {
  applicationId: string;
  initialStatus: ApplicationStatus;
};

/* ACCEPTED is deliberately absent: it must go through the Assign Tutor
   workflow, and `PATCH /api/admin/applications/[id]` rejects it with a 400. */
const OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "REJECTED", label: "Rejected" },
];

export default function ApplicationStatusSelect({
  applicationId,
  initialStatus,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [saving, setSaving] = useState(false);

  async function handleChange(nextStatus: ApplicationStatus) {
    if (nextStatus === "ACCEPTED" || nextStatus === status) {
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
          data.message || "Failed to update application status."
        );
      }

      toast.success("Application status updated.");

      /* The surrounding row is server-rendered; without this the Assigned /
         Closed cells next to this control keep showing stale values. */
      router.refresh();
    } catch (error) {
      setStatus(previousStatus);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update application status."
      );
    } finally {
      setSaving(false);
    }
  }

  // Once accepted it is read-only.
  if (status === "ACCEPTED") {
    return <StatusBadge status="ACCEPTED" />;
  }

  return (
    <Select
      items={OPTIONS}
      value={status}
      disabled={saving}
      onValueChange={(value) =>
        handleChange(value as ApplicationStatus)
      }
    >
      <SelectTrigger
        size="sm"
        className="w-32"
        aria-label="Application status"
      >
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
