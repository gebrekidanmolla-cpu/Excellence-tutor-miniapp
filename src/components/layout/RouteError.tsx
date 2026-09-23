"use client";

import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";

/**
 * The body shared by every `error.tsx`. Error boundaries must be client
 * components, so this is the one client piece; `ErrorState` itself stays
 * server-safe for use elsewhere.
 *
 * Next 16 passes `unstable_retry`, which re-fetches and re-renders the
 * segment. (`reset` still exists but only clears the boundary without
 * re-fetching, which is rarely what a failed load needs.)
 */
export function RouteError({
  error,
  retry,
  title,
  description,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <ErrorState
      title={title ?? "Something went wrong"}
      description={
        <>
          {description ??
            "We could not load this page. This is usually temporary."}

          {error.digest ? (
            <span className="mt-2 block font-mono text-xs text-muted-foreground/80">
              Reference: {error.digest}
            </span>
          ) : null}
        </>
      }
      action={
        <Button onClick={retry} size="lg">
          <RotateCw data-icon="inline-start" aria-hidden="true" />
          Try again
        </Button>
      }
    />
  );
}
