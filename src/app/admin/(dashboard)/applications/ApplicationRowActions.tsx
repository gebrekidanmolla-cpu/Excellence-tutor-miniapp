"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Eye,
  MoreHorizontal,
  RotateCcw,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type ApplicationStatus = "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";

type Props = {
  applicationId: string;
  status: ApplicationStatus;
  tutorName: string;
  tutorPhone: string;
  jobCode: string;
  canAssign: boolean;
  /**
   * Whether `PATCH /api/admin/applications/[id]` will accept a change at all.
   * It 400s once the job is closed or has an assigned tutor, so the review
   * and reject items are hidden rather than shown as buttons that only ever
   * produce an error toast.
   */
  canChangeStatus: boolean;
};

/**
 * One `⋯` menu per row, replacing the old inline status `<Select>` plus a
 * View button plus an Assign button. Eleven columns of controls made the
 * table unscannable; the row now carries a read-only `StatusBadge` and every
 * action lives here.
 *
 * The fetch payloads are unchanged from the `ApplicationStatusSelect` and
 * `AssignTutorButton` this replaces, as is the `router.refresh()` that keeps
 * the server-rendered cells in step. The old optimistic-then-rollback state
 * is gone with the `<Select>`: the badge is server-rendered now, so there is
 * no local value to keep in sync — the menu just disables while in flight.
 *
 * `ACCEPTED` stays unreachable here by design: the API 400s on it, because
 * accepting is only valid as part of the assign transaction. `canAssign` and
 * `canChangeStatus` are computed by the caller from the job's state, so the
 * menu offers only what the API will actually accept.
 */
export default function ApplicationRowActions({
  applicationId,
  status,
  tutorName,
  tutorPhone,
  jobCode,
  canAssign,
  canChangeStatus,
}: Props) {
  const router = useRouter();

  const [pending, setPending] = useState(false);

  /* The API has answered but the server-rendered page hasn't caught up —
     for an assignment that can take seconds, during which the row would
     otherwise still offer "Assign" on a job that is already closed. */
  const [refreshing, startRefresh] = useTransition();

  const busy = pending || refreshing;

  async function changeStatus(nextStatus: "PENDING" | "REVIEWED" | "REJECTED") {
    if (nextStatus === status || busy) {
      return;
    }

    setPending(true);

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

      startRefresh(() => router.refresh());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update application status."
      );
    } finally {
      setPending(false);
    }
  }

  /** Throws so `ConfirmDialog` keeps itself open and shows the message. */
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

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to assign tutor.");
    }

    toast.success(`${tutorName} assigned to ${jobCode}.`);

    startRefresh(() => router.refresh());
  }

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(tutorPhone);

      toast.success("Phone number copied");
    } catch {
      toast.error("Could not copy the phone number.");
    }
  }

  const showStatusItems = canChangeStatus && status !== "ACCEPTED";

  return (
    <div className="flex items-center justify-end gap-1">
      {/* The assign dialog sits outside the menu: a Base UI menu closes on
          item click, which would unmount a dialog rendered inside it. */}
      {canAssign ? (
        <ConfirmDialog
          trigger={
            <Button
              size="sm"
              disabled={busy}
              aria-label={`Assign ${tutorName} to ${jobCode}`}
            >
              {refreshing ? (
                <Loader2
                  className="animate-spin"
                  data-icon="inline-start"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
              )}
              {refreshing ? "Updating…" : "Assign"}
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
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${tutorName}`}
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            render={<Link href={`/admin/applications/${applicationId}`} prefetch={false} />}
          >
            <Eye aria-hidden="true" />
            View details
          </DropdownMenuItem>

          <DropdownMenuItem onClick={copyPhone}>
            <Copy aria-hidden="true" />
            Copy phone
          </DropdownMenuItem>

          {showStatusItems ? (
            <>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                disabled={busy || status === "REVIEWED"}
                onClick={() => changeStatus("REVIEWED")}
              >
                <UserCheck aria-hidden="true" />
                Mark reviewed
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={busy || status === "PENDING"}
                onClick={() => changeStatus("PENDING")}
              >
                <RotateCcw aria-hidden="true" />
                Reset to pending
              </DropdownMenuItem>

              <DropdownMenuItem
                variant="destructive"
                disabled={busy || status === "REJECTED"}
                onClick={() => changeStatus("REJECTED")}
              >
                <XCircle aria-hidden="true" />
                Reject
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
