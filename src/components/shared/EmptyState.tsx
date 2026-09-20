import { cn } from "@/lib/utils";

/**
 * Replaces the per-page empty markup, including the emoji placeholders.
 * Pass a lucide icon; the wrapper sizes and tints it.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center",
        className
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-6"
        >
          {icon}
        </span>
      ) : null}

      <h2 className="font-heading text-base font-medium text-balance">
        {title}
      </h2>

      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
