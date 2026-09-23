import { cn } from "@/lib/utils";

/**
 * Label/value pairs for detail pages. `InfoItem` was duplicated in
 * `jobs/[id]`, `applications/[id]` and `tutors/[id]` with slightly different
 * markup each time.
 */
export function InfoGrid({
  columns = 2,
  className,
  children,
}: {
  columns?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-5",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </dl>
  );
}

export function InfoItem({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  /** Falls back to an em dash when empty, so rows never collapse. */
  value?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const isEmpty =
    value === null || value === undefined || value === "" || value === "—";

  return (
    <div className={cn("min-w-0", className)}>
      <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {icon ? (
          <span className="[&>svg]:size-3.5" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {label}
      </dt>

      <dd
        className={cn(
          "mt-1 text-sm font-medium break-words",
          isEmpty && "text-muted-foreground"
        )}
      >
        {isEmpty ? "—" : value}
      </dd>
    </div>
  );
}
