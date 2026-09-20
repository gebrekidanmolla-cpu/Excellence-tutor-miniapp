import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic streaming fallback: a page heading plus a few content blocks.
 * Shaped to roughly match the real layout so the swap is not a jolt.
 */
export function PageSkeleton({
  stats = 0,
  rows = 3,
}: {
  /** Number of stat tiles to outline above the content. */
  stats?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {stats > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: stats }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>

      <span className="sr-only" aria-live="polite">
        Loading…
      </span>
    </div>
  );
}
