import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Lock,
  MapPin,
  Megaphone,
  Users,
  Wallet,
} from "lucide-react";
import type { ApplicationStatus, Gender } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { IntentLink } from "@/components/shared/IntentLink";
import { JsonLd } from "@/components/shared/JsonLd";
import ApplicationForm from "@/components/forms/ApplicationForm";
import { formatDate, formatSalary } from "@/lib/format";
import { jobPostingJsonLd, type ApplyJob } from "./apply-job";

/** `ANY` reads as "Male/Female Tutor" rather than the raw enum. */
function formatTutorRequirement(gender: Gender): string {
  if (gender === "MALE") return "Male Tutor";
  if (gender === "FEMALE") return "Female Tutor";
  return "Male/Female Tutor";
}

/**
 * The job page behind every Telegram post's button, rendered two ways:
 * `page.tsx` for a request carrying a tutor session, and `guest/page.tsx`
 * (cached, no session read) for one without — `next.config.ts` routes
 * between them on the cookie. Both pass through here so the signed-out
 * markup cannot drift between the two.
 *
 * It stays readable when signed out — the job details are already public in
 * the Telegram post — and swaps the apply button for a sign-in prompt.
 */
export function JobApplyView({
  job,
  tutor,
  existingApplication,
}: {
  job: ApplyJob;
  tutor: { fullName: string; gender: Gender } | null;
  existingApplication: { status: ApplicationStatus } | null;
}) {
  const isOpen = job.status === "OPEN";

  /* `POST /api/applications` enforces this too. Checking it here as well keeps
     the button from appearing for someone who can only ever get a 403 from it. */
  const meetsGenderRequirement =
    !tutor || job.gender === "ANY" || job.gender === tutor.gender;

  /* Signing in or registering from here comes back to this job. */
  const returnTo = encodeURIComponent(`/apply/${job.jobCode}`);

  return (
    <>
      {isOpen ? <JsonLd data={jobPostingJsonLd(job)} /> : null}

      <PublicHeader tutor={tutor ? { fullName: tutor.fullName } : null} />

      <main className="flex-1 bg-muted/30 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          {tutor ? (
            <Link
              href="/jobs" prefetch={false}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to available jobs
            </Link>
          ) : null}

          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Tutor application
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Review the job details before you apply.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <BookOpen className="size-5" />
                </span>

                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Job code
                  </p>
                  <p className="font-heading text-lg font-semibold">
                    {job.jobCode}
                  </p>
                </div>
              </div>

              <StatusBadge status={job.status} size="lg" />
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {job.additionalDetails ? (
                <div className="flex items-start gap-3 rounded-lg bg-highlight/10 p-3 ring-1 ring-highlight/25">
                  <Megaphone
                    className="mt-0.5 size-4 shrink-0 text-highlight-foreground"
                    aria-hidden="true"
                  />

                  <p className="flex-1 text-sm font-semibold text-pretty whitespace-pre-line text-highlight-foreground">
                    {job.additionalDetails}
                  </p>

                  <ArrowRight
                    className="mt-0.5 size-4 shrink-0 text-highlight-foreground"
                    aria-hidden="true"
                  />
                </div>
              ) : null}

              <InfoGrid>
                <InfoItem
                  label="Grade"
                  value={job.grade}
                  icon={<GraduationCap />}
                />
                <InfoItem
                  label="Subject"
                  value={job.subject}
                  icon={<BookOpen />}
                />
                <InfoItem label="Place" value={job.place} icon={<MapPin />} />
                <InfoItem
                  label="Tutor requirement"
                  value={formatTutorRequirement(job.gender)}
                  icon={<Users />}
                />
                <InfoItem
                  label="Monthly salary"
                  value={formatSalary(job.salary)}
                  icon={<Wallet />}
                />
                <InfoItem
                  label="Posted"
                  value={formatDate(job.createdAt)}
                  icon={<CalendarDays />}
                />
              </InfoGrid>
            </div>

            <Separator />

            <div className="bg-muted/40 p-5 sm:p-6">
              {/* A tutor who applied sees their status even once the job
                  closes — the assigned tutor following the Telegram link
                  would otherwise hit a dead end. */}
              {!isOpen && !existingApplication ? (
                <div className="text-center">
                  <h2 className="font-heading font-medium">
                    Applications closed
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">
                    This tutoring job is no longer accepting applications.
                  </p>
                </div>
              ) : !tutor ? (
                <div className="space-y-4 text-center">
                  <span
                    aria-hidden="true"
                    className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  >
                    <Lock className="size-5" />
                  </span>

                  <div>
                    <h2 className="font-heading font-medium">
                      Sign in to apply
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">
                      Applying uses your saved tutor profile, so you only enter
                      your details once.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button
                      render={<Link href={`/login?next=${returnTo}`} />}
                      size="xl"
                    >
                      Log in
                    </Button>

                    <Button
                      render={<IntentLink href={`/register?next=${returnTo}`} />}
                      variant="outline"
                      size="xl"
                    >
                      Create an account
                    </Button>
                  </div>
                </div>
              ) : existingApplication ? (
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"
                  >
                    <CheckCircle2 className="size-5" />
                  </span>

                  <div className="min-w-0 space-y-2">
                    <h2 className="font-heading font-medium">
                      You already applied for this job
                    </h2>

                    <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      Your application is currently
                      <StatusBadge status={existingApplication.status} />
                    </p>

                    <Button
                      render={<Link href="/tutor/applications" prefetch={false} />}
                      variant="outline"
                      size="lg"
                    >
                      View my applications
                    </Button>
                  </div>
                </div>
              ) : !meetsGenderRequirement ? (
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                  >
                    <Users className="size-5" />
                  </span>

                  <div className="min-w-0 space-y-2">
                    <h2 className="font-heading font-medium">
                      This job asks for a different tutor
                    </h2>

                    <p className="text-sm text-muted-foreground text-pretty">
                      {formatTutorRequirement(job.gender)} is required for this
                      job, so you are not eligible to apply. Other jobs may
                      still be open to you.
                    </p>

                    <Button
                      render={<Link href="/jobs" prefetch={false} />}
                      variant="outline"
                      size="lg"
                    >
                      Browse available jobs
                    </Button>
                  </div>
                </div>
              ) : (
                <ApplicationForm jobCode={job.jobCode} />
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
