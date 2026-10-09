"use client";

import {
  Check,
  ChevronDown,
  CircleCheck,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileText,
  GraduationCap,
  MapPin,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  BrandBackdrop,
  BrandPanelWordmark,
} from "@/components/layout/AuthLayout";
import { STEPS, type Step } from "@/app/register/schema";
import { cn } from "@/lib/utils";

/** One icon per step, shared by the stepper and each step's heading. */
export const STEP_ICONS: Record<Step, LucideIcon> = {
  1: UserRound,
  2: MapPin,
  3: GraduationCap,
  4: FileText,
  5: ClipboardCheck,
};

/** What to have at hand before starting — shown before anything is asked. */
const CHECKLIST = [
  "A government-issued ID",
  "Your latest transcript",
  "Your entrance exam result",
  "Degree certificate (graduates only)",
];

/* =========================================================
   DESKTOP — brand panel with a vertical stepper
========================================================= */

export function WizardAside({
  step,
  onStepClick,
  disabled,
}: {
  step: Step;
  onStepClick: (step: Step) => void;
  disabled?: boolean;
}) {
  const percent = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  return (
    <aside className="relative hidden overflow-hidden text-brand-surface-foreground lg:block">
      <BrandBackdrop />

      {/* A soft light edge where the panel meets the form, instead of a hard seam. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-linear-to-b from-brand-surface-foreground/0 via-brand-surface-foreground/25 to-brand-surface-foreground/0"
      />

      {/* Fixed to the viewport and never scrolls: spacing tightens and the
          checklist drops out on short screens so everything still fits. */}
      <div className="relative flex h-svh flex-col overflow-hidden px-10 py-10 lg:sticky lg:top-0 xl:px-12 xl:py-12 [@media(max-height:50rem)]:py-7 xl:[@media(max-height:50rem)]:py-7">
        <BrandPanelWordmark />

        <div className="mt-12 [@media(max-height:50rem)]:mt-7">
          <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
            Tutor application
          </p>
          <h2 className="mt-3 font-heading text-[1.85rem] leading-[1.15] font-semibold tracking-tight text-balance xl:text-[2.1rem] [@media(max-height:50rem)]:text-[1.6rem] xl:[@media(max-height:50rem)]:text-[1.75rem]">
            Share what you know. Get matched with families.
          </h2>
        </div>

        {/* Overall progress */}
        <div className="mt-9 [@media(max-height:50rem)]:mt-6">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-brand-surface-foreground/80">
              Step {step} of {STEPS.length}
            </span>
            <span className="font-semibold tabular-nums text-brand-surface-foreground">
              {percent}%
            </span>
          </div>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-brand-surface-foreground/12">
            <div
              className="h-full rounded-full bg-linear-to-r from-highlight to-[color-mix(in_oklab,var(--highlight),var(--brand-surface-foreground)_40%)] shadow-[0_0_12px_var(--color-highlight)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${Math.max(percent, 4)}%` }}
            />
          </div>
        </div>

        <nav
          aria-label="Registration steps"
          className="mt-8 [@media(max-height:50rem)]:mt-5"
        >
          <ol className="space-y-1">
            {STEPS.map((item, index) => {
              const done = item.id < step;
              const current = item.id === step;
              const last = index === STEPS.length - 1;
              const Icon = STEP_ICONS[item.id];

              const marker = (
                <span
                  className={cn(
                    "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                    done && "bg-highlight text-highlight-foreground",
                    current &&
                      "bg-brand-surface-foreground text-brand-surface ring-5 ring-brand-surface-foreground/12 shadow-[0_8px_24px_-6px_color-mix(in_oklch,var(--shade)_55%,transparent)]",
                    !done &&
                      !current &&
                      "text-brand-surface-foreground/50 ring-1 ring-brand-surface-foreground/20 ring-inset",
                  )}
                >
                  {done ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
              );

              const text = (
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-semibold transition-colors",
                      done && "text-brand-surface-foreground/85",
                      !done && !current && "text-brand-surface-foreground/55",
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "block text-xs transition-colors",
                      current
                        ? "mt-0.5 text-brand-surface-foreground/70"
                        : "mt-0.5 text-brand-surface-foreground/40",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              );

              const row = cn(
                "relative flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors",
                current &&
                  "bg-linear-to-r from-brand-surface-foreground/12 via-brand-surface-foreground/5 to-transparent",
              );

              return (
                <li
                  key={item.id}
                  className="relative"
                  aria-current={current ? "step" : undefined}
                >
                  {/* Rail between markers; fills in amber once the step is done. */}
                  {!last ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-[2.875rem] -bottom-[0.875rem] left-[calc(1.875rem-1px)] w-0.5 overflow-hidden rounded-full bg-brand-surface-foreground/12"
                    >
                      <span
                        className={cn(
                          "block h-full w-full origin-top bg-highlight transition-transform duration-500 ease-out motion-reduce:transition-none",
                          done ? "scale-y-100" : "scale-y-0",
                        )}
                      />
                    </span>
                  ) : null}

                  {done ? (
                    <button
                      type="button"
                      onClick={() => onStepClick(item.id)}
                      disabled={disabled}
                      className={cn(
                        row,
                        "group outline-none hover:bg-brand-surface-foreground/[0.06] focus-visible:ring-3 focus-visible:ring-brand-surface-foreground/40",
                      )}
                    >
                      {marker}
                      <span className="[&>span>span:first-child]:underline-offset-4 [&>span>span:first-child]:group-hover:underline">
                        {text}
                      </span>
                      <span className="sr-only">(completed, go back)</span>
                    </button>
                  ) : (
                    <div className={row}>
                      {current ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-highlight"
                        />
                      ) : null}
                      {marker}
                      {text}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-auto pt-10 [@media(max-height:50rem)]:pt-6">
          <div className="h-px bg-linear-to-r from-brand-surface-foreground/25 via-brand-surface-foreground/10 to-transparent" />

          <div className="[@media(max-height:45rem)]:hidden">
            <p className="mt-6 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-brand-surface-foreground/70 uppercase [@media(max-height:50rem)]:mt-5">
              <FileCheck2
                className="size-3.5 text-highlight"
                aria-hidden="true"
              />
              Have these ready
            </p>
            <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[0.8125rem] leading-snug text-brand-surface-foreground/80">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex gap-2">
                  <CircleCheck
                    className="mt-px size-3.5 shrink-0 text-brand-surface-foreground/40"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-brand-surface-foreground/55">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              About 10 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Progress saved in this browser
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* =========================================================
   MOBILE / TABLET — compact segmented progress
========================================================= */

export function MobileProgress({
  step,
  onStepClick,
  disabled,
}: {
  step: Step;
  onStepClick: (step: Step) => void;
  disabled?: boolean;
}) {
  const current = STEPS[step - 1];
  const next = STEPS.find((item) => item.id === step + 1);

  return (
    <div className="lg:hidden">
      <div className="mb-2.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold text-primary">
          Step {step} of {STEPS.length}
        </span>
        {next ? (
          <span className="truncate text-muted-foreground">
            Next: {next.label}
          </span>
        ) : null}
      </div>

      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-label="Registration progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step}
        aria-valuetext={`Step ${step} of ${STEPS.length}: ${current.label}`}
      >
        {STEPS.map((item) => {
          const bar = (
            <span
              className={cn(
                "block h-1.5 w-full rounded-full transition-colors",
                item.id < step
                  ? "bg-primary"
                  : item.id === step
                    ? "bg-primary/60"
                    : "bg-muted",
              )}
            />
          );

          /* Completed steps are shortcuts back; later ones are not. */
          return item.id < step ? (
            <button
              key={item.id}
              type="button"
              onClick={() => onStepClick(item.id)}
              disabled={disabled}
              aria-label={`Back to step ${item.id}: ${item.label}`}
              className="-my-2.5 flex-1 cursor-pointer rounded-full py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {bar}
            </button>
          ) : (
            <span key={item.id} className="flex-1">
              {bar}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Mobile counterpart of the aside's checklist, collapsed by default. */
export function MobileChecklist() {
  return (
    <details className="group rounded-2xl border border-primary/15 bg-primary/[0.03] lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-2xl p-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <FileCheck2 className="size-4 text-primary" aria-hidden="true" />
        Before you start: have these ready
        <ChevronDown
          className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="px-4 pb-4">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-primary">
                •
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          About 10 minutes. Your progress is saved in this browser.
        </p>
      </div>
    </details>
  );
}
