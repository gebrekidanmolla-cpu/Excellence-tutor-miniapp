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
  UserRound,
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
import { ParentLinkButton } from "@/components/admin/ParentLinkButton";
import { TutorDocumentsMenu } from "@/components/admin/TutorDocumentsMenu";
import type { TutorDocumentKind } from "@/lib/admin-documents";
import { cn } from "@/lib/utils";

type ApplicationStatus = "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";

type Props = {
  applicationId: string;
  status: ApplicationStatus;
  tutor: {
    id: string;
    fullName: string;
    phone: string;
    documents: readonly TutorDocumentKind[];
    shareToken: string | null;
  };
  jobCode: string;
  /** From `getProfileShareLinkBase()`, for the parent-link button. */
  linkBase: string;
  canAssign: boolean;
  /**
   * Whether `PATCH /api/admin/applications/[id]` will accept a change at all.
   * It 400s once the job is closed or has an assigned tutor, so the review
   * and reject items are hidden rather than shown as buttons that only ever
   * produce an error toast.
   */
  canChangeStatus: boolean;
  /** Icon buttons sized for a table row, rather than a phone card's. */
  compact?: boolean;
};

/**
 * Everything an admin does to an application, on the row itself: assign,
 * copy the tutor's profile link for the parent, open their documents, and a
 * `⋯` menu for review / reject / pending and the less frequent links.
 *
 * The fetch payloads are unchanged from the `ApplicationStatusSelect` and
 * `AssignTutorButton` this replaced, as is the `router.refresh()` that keeps
 * the server-rendered rows in step.
 *
 * `ACCEPTED` stays unreachable here by design: the API 400s on it, because
 * accepting is only valid as part of the assign transaction. `canAssign` and
 * `canChangeStatus` are computed by the caller from the job's state, so the
 * row offers only what the API will actually accept.
 */
export default function ApplicationRowActions({
  applicationId,
  status,
  tutor,
  jobCode,
  linkBase,
  canAssign,
  canChangeStatus,
  compact = false,
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

    toast.success(`${tutor.fullName} assigned to ${jobCode}.`);

    startRefresh(() => router.refresh());
  }

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(tutor.phone);

      toast.success("Phone number copied");
    } catch {
      toast.error("Could not copy the phone number.");
    }
  }

  const showStatusItems = canChangeStatus && status !== "ACCEPTED";

  /* A phone card gets 40px controls; a table row keeps them small. */
  const cardControl = compact ? undefined : "h-10";

  /*
   * In a card, Assign takes the first row and the rest share the second
   * evenly — until the card is wide enough (a container query, since the
   * same card sits in a phone column and a two-up tablet grid) for one row.
   * Below 19rem the two labelled buttons cannot both fit, so "Docs" drops to
   * its icon and the link button takes the slack; below 14rem (a 320px phone
   * inside the job page's card) the link button sheds its icon too.
   */
  return (
    <div className={compact ? undefined : "@container"}>
      <div
        className={
          compact
            ? "flex items-center justify-end gap-1.5"
            : "grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 @[19rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] @[26rem]:flex @[26rem]:items-center"
        }
      >
        {/* The assign dialog sits outside the menu: a Base UI menu closes on
            item click, which would unmount a dialog rendered inside it. */}
        {canAssign ? (
          <ConfirmDialog
            trigger={
              <Button
                size={compact ? "sm" : "lg"}
                disabled={busy}
                aria-label={`Assign ${tutor.fullName} to ${jobCode}`}
                className={cn(
                  cardControl,
                  !compact && "col-span-3 @[26rem]:min-w-28"
                )}
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
            title={`Assign ${tutor.fullName} to ${jobCode}?`}
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

        <ParentLinkButton
          tutorId={tutor.id}
          tutorName={tutor.fullName}
          token={tutor.shareToken}
          linkBase={linkBase}
          compact={compact}
          className={cardControl}
          iconClassName={compact ? undefined : "@max-[14rem]:hidden"}
        />

        <TutorDocumentsMenu
          tutorId={tutor.id}
          tutorName={tutor.fullName}
          documents={tutor.documents}
          compact={compact}
          className={cardControl}
          labelClassName={compact ? undefined : "@max-[19rem]:hidden"}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size={compact ? "icon-sm" : "icon-lg"}
                aria-label={`More actions for ${tutor.fullName}`}
                className={compact ? undefined : "size-10"}
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              render={
                <Link
                  href={`/admin/applications/${applicationId}`}
                  prefetch={false}
                />
              }
            >
              <Eye aria-hidden="true" />
              View application
            </DropdownMenuItem>

            <DropdownMenuItem
              render={
                <Link href={`/admin/tutors/${tutor.id}`} prefetch={false} />
              }
            >
              <UserRound aria-hidden="true" />
              Tutor profile
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
    </div>
  );
}
