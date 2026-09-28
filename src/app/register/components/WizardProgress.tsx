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
  return (
    <aside className="relative hidden overflow-hidden text-primary-foreground lg:block">
      <BrandBackdrop />

      <div className="relative flex h-svh flex-col gap-10 overflow-y-auto p-10 lg:sticky lg:top-0 xl:p-12">
        <BrandPanelWordmark />

        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide text-primary-foreground/85 ring-1 ring-primary-foreground/15">
            <span className="size-1.5 rounded-full bg-highlight" />
            Tutor application
          </p>
          <h2 className="mt-5 font-heading text-3xl leading-[1.15] font-semibold tracking-tight text-balance">
            Share what you know. Get matched with families.
          </h2>
        </div>

        <nav aria-label="Registration steps">
          <ol className="space-y-1">
            {STEPS.map((item, index) => {
              const done = item.id < step;
              const current = item.id === step;
              const last = index === STEPS.length - 1;
              const Icon = STEP_ICONS[item.id];

              const marker = (
                <span
                  className={cn(
                    "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                    done && "bg-highlight text-highlight-foreground",
                    current &&
                      "bg-primary-foreground text-primary shadow-lg shadow-black/20",
                    !done &&
                      !current &&
                      "bg-primary-foreground/5 text-primary-foreground/55 ring-1 ring-primary-foreground/20"
                  )}
                >
                  {done ? (
                    <Check className="size-4.5" strokeWidth={3} />
                  ) : (
                    <Icon className="size-4.5" />
                  )}
                </span>
              );

              const text = (
                <span className="min-w-0 py-0.5">
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      !done && !current && "text-primary-foreground/65"
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      current
                        ? "text-primary-foreground/75"
                        : "text-primary-foreground/50"
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              );

              const row = cn(
                "flex w-full items-center gap-3.5 rounded-2xl p-2.5 text-left transition-colors",
                current &&
                  "bg-primary-foreground/10 ring-1 ring-primary-foreground/15"
              );

              return (
                <li
                  key={item.id}
                  className="relative"
                  aria-current={current ? "step" : undefined}
                >
                  {!last ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-[3.25rem] -bottom-2.5 left-[calc(1.875rem-0.5px)] w-px",
                        done ? "bg-highlight/70" : "bg-primary-foreground/15"
                      )}
                    />
                  ) : null}

                  {done ? (
                    <button
                      type="button"
                      onClick={() => onStepClick(item.id)}
                      disabled={disabled}
                      className={cn(
                        row,
                        "group outline-none hover:bg-primary-foreground/5 focus-visible:ring-3 focus-visible:ring-primary-foreground/40"
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
                      {marker}
                      {text}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-2xl bg-primary-foreground/[0.07] p-5 ring-1 ring-primary-foreground/15 backdrop-blur-sm">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <FileCheck2 className="size-4 text-highlight" aria-hidden="true" />
              Have these ready
            </p>
            <ul className="mt-3.5 space-y-2 text-sm text-primary-foreground/80">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <CircleCheck
                    className="size-4 shrink-0 text-primary-foreground/45"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-primary-foreground/60">
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
                    : "bg-muted"
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
