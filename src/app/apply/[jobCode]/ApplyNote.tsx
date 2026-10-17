import Link from "next/link";
import {
  CalendarCheck,
  ClipboardCheck,
  Handshake,
  Info,
  Percent,
  RotateCcw,
  ShieldCheck,
  Undo2,
} from "lucide-react";

import { formatSalary } from "@/lib/format";

/** The agency's one-time commission, as a share of the job's monthly salary. */
const COMMISSION_RATE = 0.45;

/**
 * The agency's terms, shown above the apply button. `JobApplyView` renders it
 * only for a signed-in tutor who can apply, so it never reaches the cached
 * guest copy of the page. `ApplicationForm` won't submit until its checkbox,
 * which refers to this note, is ticked.
 *
 * The wording is the agency's own. Keep it in step with what tutors are
 * told elsewhere, and with the checkbox label in `ApplicationForm`.
 */
function termsFor(salary: number) {
  return [
    {
      icon: ClipboardCheck,
      title: "Check job details",
      body: <>Confirm the location, schedule, salary and requirements before applying.</>,
    },
    {
      icon: Percent,
      title: "Commission",
      body: (
        <>
          Note that you will pay a one-time commission of{" "}
          <strong>45% of the monthly salary</strong> (
          <strong>{formatSalary(Math.round(salary * COMMISSION_RATE))}</strong>{" "}
          for this job) after passing all screening stages to get the job. It
          is paid once, in advance: <strong>there is no monthly commission</strong>.
        </>
      ),
    },
    {
      icon: RotateCcw,
      title: "Parent cancels",
      body: (
        <>
          Receive a <strong>100% refund</strong> if the parent cancels within 30
          days of payment.
        </>
      ),
    },
    {
      icon: CalendarCheck,
      title: "First-day trial",
      body: (
        <>
          If you decide not to continue after visiting on the first day, notify
          us before the second working day for a <strong>100% refund</strong>.
        </>
      ),
    },
    {
      icon: Undo2,
      title: "Tutor cancels",
      body: (
        <>
          Receive an <strong>85% refund within 15 days of payment</strong>;
          afterward, payments are non-refundable, except as stated above.
        </>
      ),
    },
    {
      icon: ShieldCheck,
      title: "Verify legitimacy",
      body: (
        <>
          Check our{" "}
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
          before payment.
        </>
      ),
    },
    {
      icon: Handshake,
      title: "Commitment",
      body: <>Apply only if you are qualified and ready to fulfill the job responsibly.</>,
    },
  ];
}

/** `salary` is the job's monthly salary in ETB, which the commission is worked out from. */
export function ApplyNote({ salary }: { salary: number }) {
  return (
    <section
      aria-labelledby="apply-note-title"
      className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-2.5 border-b bg-highlight/10 px-4 py-3">
        <Info aria-hidden="true" className="size-4 shrink-0 text-highlight-strong" />
        <h2 id="apply-note-title" className="font-heading text-sm font-semibold">
          Important note before applying
        </h2>
      </div>

      <ul className="divide-y px-4">
        {termsFor(salary).map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 py-3">
            <Icon
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-muted-foreground"
            />
            <p className="text-sm leading-6 text-pretty text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
              <span className="font-medium text-foreground">{title}:</span>{" "}
              {body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
