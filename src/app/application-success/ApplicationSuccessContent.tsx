"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * `useSearchParams` keeps this component out of the static render, which is
 * why it is split from `page.tsx` and wrapped in a Suspense boundary there.
 */
export default function ApplicationSuccessContent() {
  const jobCode = useSearchParams().get("jobCode");

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10 sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success"
        >
          <CheckCircle2 className="size-8" />
        </span>

        <h1 className="mt-6 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Application submitted
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          Thank you for applying to Excellence Tutor. We have received your
          application and will contact you if you are selected.
        </p>

        {jobCode ? (
          <div className="mt-6 rounded-xl bg-muted/60 p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Job code
            </p>
            <p className="mt-0.5 font-heading text-xl font-semibold">
              {jobCode}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button render={<Link href="/tutor/applications" prefetch={false} />} size="xl">
            <FileText data-icon="inline-start" aria-hidden="true" />
            Track my applications
          </Button>

          <Button
            render={<Link href="/jobs" prefetch={false} />}
            variant="outline"
            size="xl"
          >
            Explore more jobs
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
