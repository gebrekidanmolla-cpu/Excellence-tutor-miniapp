"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Eye,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Users,
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
import { cn } from "@/lib/utils";
import {
  ReopenJobDescription,
  closeJob,
  reopenJob,
} from "@/components/admin/JobActions";

/**
 * Close or re-open a job from its row in the jobs list, plus a menu of the
 * job's other destinations. Same requests and dialogs as `JobActions` on the
 * job page — and the same rule: a job with an assigned tutor is only ever
 * re-opened, never closed or flipped back with `PATCH .../status`.
 */
export function JobRowActions({
  jobId,
  jobCode,
  status,
  assignedTutorName,
  applicationCount,
  parentPhone,
  compact = false,
}: {
  jobId: string;
  jobCode: string;
  status: "OPEN" | "CLOSED";
  assignedTutorName: string | null;
  applicationCount: number;
  parentPhone: string;
  /** Smaller controls, for table rows. */
  compact?: boolean;
}) {
  const router = useRouter();

  /* The API has answered but the list hasn't re-rendered yet: without this
     the row would keep offering "Close" on a job that is already closed. */
  const [refreshing, startRefresh] = useTransition();

  const closable = status === "OPEN" && !assignedTutorName;

  async function close() {
    await closeJob(jobId);

    toast.success(`${jobCode} closed.`);

    startRefresh(() => router.refresh());
  }

  async function reopen() {
    toast.success(await reopenJob(jobId));

    startRefresh(() => router.refresh());
  }

  async function copyParentPhone() {
    try {
      await navigator.clipboard.writeText(parentPhone);

      toast.success("Parent phone copied");
    } catch {
      toast.error("Could not copy the phone number.");
    }
  }

  const size = compact ? "sm" : "lg";

  /* A phone card gets a 40px, full-width button; a table row a small one. */
  const statusButtonClass = compact ? undefined : "h-10 flex-1";

  const statusIcon = refreshing ? (
    <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden="true" />
  ) : closable ? (
    <Lock data-icon="inline-start" aria-hidden="true" />
  ) : (
    <RotateCcw data-icon="inline-start" aria-hidden="true" />
  );

  return (
    <div
      className={cn("flex items-center gap-1.5", compact ? "justify-end" : "gap-2")}
    >
      {closable ? (
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              size={size}
              disabled={refreshing}
              aria-label={`Close job ${jobCode}`}
              className={statusButtonClass}
            >
              {statusIcon}
              {refreshing ? "Updating…" : "Close"}
            </Button>
          }
          title={`Close ${jobCode}?`}
          description="The job will stop accepting new applications. Existing applications are not changed."
          confirmLabel="Close job"
          variant="destructive"
          onConfirm={close}
        />
      ) : (
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              size={size}
              disabled={refreshing}
              aria-label={`Re-open job ${jobCode}`}
              className={statusButtonClass}
            >
              {statusIcon}
              {refreshing ? "Updating…" : "Re-open"}
            </Button>
          }
          title={`Re-open ${jobCode}?`}
          description={
            <ReopenJobDescription
              applicationCount={applicationCount}
              assignedTutorName={assignedTutorName}
            />
          }
          confirmLabel="Re-open job"
          onConfirm={reopen}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size={compact ? "icon-sm" : "icon-lg"}
              aria-label={`More actions for ${jobCode}`}
              className={compact ? undefined : "size-10"}
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            render={<Link href={`/admin/jobs/${jobId}`} prefetch={false} />}
          >
            <Eye aria-hidden="true" />
            View job
          </DropdownMenuItem>

          <DropdownMenuItem
            render={
              <Link href={`/admin/jobs/${jobId}#applicants`} prefetch={false} />
            }
          >
            <Users aria-hidden="true" />
            Applicants
          </DropdownMenuItem>

          <DropdownMenuItem
            render={
              <Link href={`/admin/jobs/${jobId}/edit`} prefetch={false} />
            }
          >
            <Pencil aria-hidden="true" />
            Edit job
          </DropdownMenuItem>

          {parentPhone ? (
            <>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={copyParentPhone}>
                <Copy aria-hidden="true" />
                Copy parent phone
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
