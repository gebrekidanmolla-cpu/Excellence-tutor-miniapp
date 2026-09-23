import { AlertCircle, AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * A failed load. Distinct from `EmptyState`: "nothing here yet" and "we could
 * not fetch this" previously looked identical, and several pages rendered a
 * zero count on failure instead of saying anything went wrong.
 *
 * `action` is a slot so a client retry button can be passed in without making
 * this component client-side.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this right now. Please try again.",
  action,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <AlertTriangle className="size-6" />
      </span>

      <h2 className="font-heading text-base font-medium text-balance">
        {title}
      </h2>

      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground text-pretty">
        {description}
      </p>

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * The inline form-level error that ~8 files hand-rolled as a red div.
 * Renders nothing when there is no message, so callers can pass state directly.
 */
export function FormError({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <Alert
      variant="destructive"
      className={cn("border-destructive/30 bg-destructive/5", className)}
    >
      <AlertCircle aria-hidden="true" />
      <AlertTitle className="sr-only">Error</AlertTitle>
      <AlertDescription className="text-destructive">
        {message}
      </AlertDescription>
    </Alert>
  );
}
