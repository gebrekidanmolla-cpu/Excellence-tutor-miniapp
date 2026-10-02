import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProfileStrength } from "@/lib/profile-strength";

/** The bar itself, shared by the full card and the dashboard's compact one. */
export function StrengthBar({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label="Profile strength"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-2.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          percent >= 100
            ? "bg-success"
            : "bg-linear-to-r from-primary to-[color-mix(in_oklch,var(--primary),var(--highlight)_55%)]"
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * The full checklist: every item with its weight, unfinished ones linking to
 * where they get done. Renders nothing extra once the profile is complete
 * beyond a short confirmation, so it stops nagging.
 */
export function ProfileStrengthCard({
  strength,
  className,
}: {
  strength: ProfileStrength;
  className?: string;
}) {
  const complete = strength.percent >= 100;

  return (
    <section
      aria-labelledby="profile-strength-heading"
      className={cn(
        "rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="profile-strength-heading"
            className="font-heading font-medium"
          >
            Profile strength
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            {complete
              ? "Your profile is complete — admins and families see everything they need."
              : "Complete profiles stand out when admins pick tutors for families."}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
            {strength.percent}%
          </p>
          <p
            className={cn(
              "text-xs font-medium",
              complete ? "text-success" : "text-muted-foreground"
            )}
          >
            {strength.level}
          </p>
        </div>
      </div>

      <StrengthBar percent={strength.percent} className="mt-4" />

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {strength.items.map((item) => (
          <li key={item.id}>
            {item.done ? (
              <div className="flex h-full items-start gap-3 rounded-lg border border-transparent bg-muted/40 p-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="sr-only"> — done</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  +{item.weight}%
                </span>
              </div>
            ) : (
              <Link
                href={item.href}
                prefetch={false}
                className="group flex h-full items-start gap-3 rounded-lg border border-dashed p-3 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-muted-foreground/30 transition-colors group-hover:border-primary"
                />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-medium">
                    Add {item.label.toLowerCase()}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">
                    {item.description}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary tabular-nums">
                  +{item.weight}%
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One-line version for the dashboard: bar plus the single next step. */
export function ProfileStrengthNudge({
  strength,
  className,
}: {
  strength: ProfileStrength;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Profile strength</span>
        <span className="font-semibold tabular-nums">{strength.percent}%</span>
      </div>

      <StrengthBar percent={strength.percent} />

      {strength.next ? (
        <Link
          href={strength.next.href}
          prefetch={false}
          className="group flex items-center gap-2 rounded-lg bg-highlight/10 px-3 py-2 text-xs font-medium transition-colors hover:bg-highlight/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Sparkles
            className="size-3.5 shrink-0 text-[color-mix(in_oklch,var(--highlight),var(--foreground)_30%)]"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">
            Add your {strength.next.label.toLowerCase()} · +{strength.next.weight}%
          </span>
          <ArrowRight
            className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      ) : (
        <p className="text-xs text-success">Your profile is complete.</p>
      )}
    </div>
  );
}
