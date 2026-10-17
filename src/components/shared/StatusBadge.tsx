import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getJobOutcome,
  getStatusLabel,
  type JobStatus,
  type Status,
} from "@/lib/format";

/**
 * The single source of truth for application and job status.
 *
 * Status is carried by a dot *and* a label, never by color alone, so it stays
 * readable for color-blind users and in high-contrast mode. The label uses
 * the tone's `*-strong` shade, which clears AA against the tinted surface in
 * both themes; the raw tones are too light for small text on white.
 */

type Tone = "success" | "warning" | "info" | "destructive" | "neutral";

const STATUS_TONES: Record<Status, Tone> = {
  PENDING: "warning",
  REVIEWED: "info",
  ACCEPTED: "success",
  REJECTED: "destructive",
  OPEN: "success",
  CLOSED: "neutral",
  POSTED: "success",
  FAILED: "destructive",
  DISABLED: "neutral",
  SYNCED: "success",
};

const TONE_SURFACE: Record<Tone, string> = {
  success: "bg-success/10 text-success-strong",
  warning: "bg-warning/15 text-warning-strong",
  info: "bg-info/10 text-info-strong",
  destructive: "bg-destructive/10 text-destructive-strong",
  neutral: "bg-muted text-muted-foreground",
};

const TONE_DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/60",
};

export function StatusBadge({
  status,
  label,
  size = "default",
  className,
}: {
  status: Status | string;
  /** Overrides the shared label where the same status reads differently. */
  label?: string;
  size?: "default" | "lg";
  className?: string;
}) {
  const tone = STATUS_TONES[status as Status] ?? "neutral";

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-transparent font-medium",
        TONE_SURFACE[tone],
        size === "lg" && "h-7 px-3 text-sm",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])}
      />
      {label ?? getStatusLabel(status)}
    </Badge>
  );
}

/**
 * A job's status for admins: a closed job shows how it ended — Successful
 * or Failed (see `getJobOutcome`) — instead of a bare "Closed". The tones
 * borrow the application statuses that mean the same thing.
 */
export function JobStatusBadge({
  status,
  hasAssignedTutor,
  size,
  className,
}: {
  status: JobStatus;
  hasAssignedTutor: boolean;
  size?: "default" | "lg";
  className?: string;
}) {
  const outcome = getJobOutcome(status, hasAssignedTutor);

  if (outcome === "SUCCESSFUL") {
    return (
      <StatusBadge
        status="ACCEPTED"
        label="Successful"
        size={size}
        className={className}
      />
    );
  }

  if (outcome === "FAILED") {
    return (
      <StatusBadge
        status="REJECTED"
        label="Failed"
        size={size}
        className={className}
      />
    );
  }

  return <StatusBadge status={status} size={size} className={className} />;
}
