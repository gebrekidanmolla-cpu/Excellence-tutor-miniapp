"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  Clock,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";

import { STEPS, type Step } from "@/app/register/schema";
import { cn } from "@/lib/utils";

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
    <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_10%_0%,color-mix(in_oklch,var(--color-highlight)_24%,transparent),transparent_70%)]"
      />

      <div className="relative flex h-svh flex-col gap-10 overflow-y-auto p-10 xl:p-12 lg:sticky lg:top-0">
        <Link
          href="/"
          className="w-fit rounded-md font-heading text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/40"
        >
          Excellence Tutor
        </Link>

        <div>
          <p className="text-xs font-medium tracking-widest text-primary-foreground/60 uppercase">
            Tutor application
          </p>
          <h2 className="mt-3 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance">
            Share what you know. Get matched with families.
          </h2>
        </div>

        <nav aria-label="Registration steps">
          <ol>
            {STEPS.map((item, index) => {
              const done = item.id < step;
              const current = item.id === step;
              const last = index === STEPS.length - 1;

              const marker = (
                <span
                  className={cn(
                    "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    done && "bg-highlight text-highlight-foreground",
                    current &&
                      "bg-primary-foreground text-primary ring-4 ring-primary-foreground/20",
                    !done &&
                      !current &&
                      "border border-primary-foreground/30 text-primary-foreground/60"
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : item.id}
                </span>
              );

              const text = (
                <span className="min-w-0 pt-1.5 pb-7">
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      !done && !current && "text-primary-foreground/70"
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-primary-foreground/60">
                    {item.description}
                  </span>
                </span>
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
                        "absolute top-9 bottom-0 left-[1.0625rem] w-0.5",
                        done ? "bg-highlight" : "bg-primary-foreground/20"
                      )}
                    />
                  ) : null}

                  {done ? (
                    <button
                      type="button"
                      onClick={() => onStepClick(item.id)}
                      disabled={disabled}
                      className="group flex w-full gap-4 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/40"
                    >
                      {marker}
                      <span className="[&>span>span:first-child]:group-hover:underline [&>span>span:first-child]:underline-offset-4">
                        {text}
                      </span>
                      <span className="sr-only">(completed, go back)</span>
                    </button>
                  ) : (
                    <div className="flex gap-4">
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
          <div className="rounded-xl bg-primary-foreground/10 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <FileCheck2 className="size-4" aria-hidden="true" />
              Have these ready
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-primary-foreground/80">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-highlight">
                    •
                  </span>
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
    <details className="group rounded-xl border bg-muted/40 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl p-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
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
