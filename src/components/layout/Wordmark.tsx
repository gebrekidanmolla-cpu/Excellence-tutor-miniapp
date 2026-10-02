import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * There is no logo asset in `public/`, so the brand is typographic.
 * `subtitle` names the surface ("Tutor Portal", "Admin") rather than inventing
 * a tagline.
 *
 * `href={null}` renders it as plain branding, for pages that must not lead
 * anywhere else on the site (the public tutor profile).
 */
export function Wordmark({
  href = "/",
  subtitle,
  className,
}: {
  href?: string | null;
  subtitle?: string;
  className?: string;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <GraduationCap className="size-5" />
      </span>

      <span className="min-w-0">
        <span className="block font-heading text-[0.9375rem] leading-tight font-semibold tracking-tight">
          Excellence Tutor
        </span>

        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </>
  );

  if (href === null) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      // `/` is prerendered, so prefetching it is a CDN hit; the portal and
      // admin homes are dynamic, where each prefetch is two invocations.
      prefetch={href === "/" ? undefined : false}
      className={cn(
        "flex items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      {content}
    </Link>
  );
}
