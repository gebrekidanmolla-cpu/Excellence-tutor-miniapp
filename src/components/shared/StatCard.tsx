import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A single dashboard metric. Renders as a link when `href` is given, so the
 * whole tile is one large touch target rather than a card with a small link.
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <CardContent className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>

        <p className="font-heading text-2xl leading-tight font-semibold tabular-nums">
          {value}
        </p>

        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>

      {icon ? (
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-4.5"
        >
          {icon}
        </span>
      ) : null}
    </CardContent>
  );

  if (!href) {
    return <Card className={className}>{body}</Card>;
  }

  return (
    <Card
      className={cn(
        "transition-shadow hover:ring-primary/30 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50",
        className
      )}
    >
      <Link href={href} prefetch={false} className="outline-none">
        {body}
      </Link>
    </Card>
  );
}
