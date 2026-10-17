import Link from "next/link";
import {
  ClipboardCheck,
  Handshake,
  Info,
  Percent,
  RotateCcw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { formatSalary } from "@/lib/format";

/**
 * The most the agency's one-time commission can be, as a share of one
 * month's salary. The note quotes the resulting amount for each job.
 */
const MAX_COMMISSION_RATE = 0.45;

/**
 * The agency's terms, shown above the apply button. `JobApplyView` renders it
 * only for a signed-in tutor who can apply, so it never reaches the cached
 * guest copy of the page. `ApplicationForm` won't submit until its checkbox,
 * which refers to this note, is ticked.
 *
 * The terms are the agency's own. Keep them in step with what tutors are
 * told elsewhere, and with the checkbox label in `ApplicationForm`.
 */
const REFUNDS = [
  {
    percent: "100%",
    condition: "The parent cancels within 30 days of your payment.",
  },
  {
    percent: "100%",
    condition:
      "You decide not to continue after the first day, and tell us before the second working day.",
  },
  {
    percent: "85%",
    condition: "You cancel within 15 days of your payment.",
  },
];

/** `salary` is the job's monthly salary in ETB, which the commission is worked out from. */
export function ApplyNote({ salary }: { salary: number }) {
  const maxCommission = formatSalary(Math.round(salary * MAX_COMMISSION_RATE));

  return (
    <section
      aria-labelledby="apply-note-title"
      className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-2.5 border-b bg-highlight/10 px-4 py-3">
        <Info aria-hidden="true" className="size-4 shrink-0 text-highlight-strong" />
        <h2 id="apply-note-title" className="font-heading text-sm font-semibold">
          Important information before you apply
        </h2>
      </div>

      <ul className="divide-y px-4">
        <Term icon={ClipboardCheck} title="Check the job details">
          Make sure the location, schedule, salary and requirements suit you
          before you apply.
        </Term>

        <Term icon={Percent} title="One-time commission">
          Once you pass every screening stage and get the job, you pay a
          commission of <strong>up to 45% of one month&rsquo;s salary</strong>{" "}
          (at most <strong>{maxCommission}</strong> for this job). It is paid
          once, in advance. <strong>There is no monthly commission.</strong>
        </Term>

        <Term icon={RotateCcw} title="Refunds">
          <ul className="mt-2 space-y-2">
            {REFUNDS.map((refund) => (
              <li key={refund.condition} className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-12 shrink-0 items-center justify-center rounded-full bg-success/10 text-xs font-semibold text-success-strong tabular-nums">
                  {refund.percent}
                  <span className="sr-only"> refund:</span>
                </span>
                <span>{refund.condition}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            After 15 days, payments are non-refundable, except in the cases
            above.
          </p>
        </Term>

        <Term icon={ShieldCheck} title="Verify us first">
          We are a registered, licensed business. Check our{" "}
          {/* A new tab keeps the tutor's place on the job they are applying to. */}
          <Link
            href="/legal"
            prefetch={false}
            target="_blank"
            className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
          >
            business license
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>{" "}
          before you make any payment.
        </Term>

        <Term icon={Handshake} title="Your commitment">
          Apply only if you are qualified and ready to take on the job
          responsibly.
        </Term>
      </ul>
    </section>
  );
}

function Term({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 py-3.5">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-sm leading-6 text-pretty text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
        <h3 className="font-medium text-foreground">{title}</h3>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}
