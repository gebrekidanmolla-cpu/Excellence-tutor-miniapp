import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusLabel, type Status } from "@/lib/format";

/**
 * The single source of truth for application and job status.
 *
 * Status is carried by a dot *and* a label, never by color alone, so it stays
 * readable for color-blind users and in high-contrast mode. The label uses a
 * darkened mix of the tone so it clears AA against the tinted surface — the
 * raw `--success` / `--warning` tokens are too light for small text.
 */

type Tone = "success" | "warning" | "info" | "destructive" | "neutral";

const STATUS_TONES: Record<Status, Tone> = {
  PENDING: "warning",
  REVIEWED: "info",
  ACCEPTED: "success",
  REJECTED: "destructive",
  OPEN: "success",
  CLOSED: "neutral",
};

const TONE_SURFACE: Record<Tone, string> = {
  success:
    "bg-success/10 text-[color-mix(in_oklch,var(--success),var(--foreground)_35%)]",
  warning:
    "bg-warning/15 text-[color-mix(in_oklch,var(--warning),var(--foreground)_40%)]",
  info: "bg-info/10 text-[color-mix(in_oklch,var(--info),var(--foreground)_35%)]",
  destructive:
    "bg-destructive/10 text-[color-mix(in_oklch,var(--destructive),var(--foreground)_30%)]",
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
  size = "default",
  className,
}: {
  status: Status | string;
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
      {getStatusLabel(status)}
    </Badge>
  );
}
