import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { profileStrength } from "@/lib/profile-strength";
import { tutorFileHref } from "@/lib/tutor-files";
import { ProfileStrengthNudge } from "@/app/tutor/profile/components/ProfileStrengthCard";
import {
  formatDate,
  formatEnum,
  formatSalary,
  getStatusLabel,
  type ApplicationStatus,
} from "@/lib/format";

/** Pipeline order and colors, shared by the segmented bar and its legend. */
const PIPELINE: { status: ApplicationStatus; bar: string }[] = [
  { status: "PENDING", bar: "bg-warning" },
  { status: "REVIEWED", bar: "bg-info" },
  { status: "ACCEPTED", bar: "bg-success" },
  { status: "REJECTED", bar: "bg-muted-foreground/40" },
];

export default async function TutorDashboard() {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const [availableJobs, statusGroups, recentApplications, freshJobs] =
    await Promise.all([
      prisma.job.count({ where: { status: "OPEN" } }),

      prisma.application.groupBy({
        by: ["status"],
        where: { tutorId: tutor.id },
        _count: { _all: true },
      }),

      prisma.application.findMany({
        where: { tutorId: tutor.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
          job: {
            select: {
              jobCode: true,
              grade: true,
              subject: true,
              salary: true,
            },
          },
        },
      }),

      // Open jobs this tutor has not applied to yet.
      prisma.job.findMany({
        where: {
          status: "OPEN",
          applications: { none: { tutorId: tutor.id } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          jobCode: true,
          subject: true,
          grade: true,
          place: true,
          salary: true,
          daysPerWeek: true,
          hoursPerDay: true,
        },
      }),
    ]);

  const counts = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all])
  ) as Partial<Record<ApplicationStatus, number>>;

  const countOf = (status: ApplicationStatus) => counts[status] ?? 0;

  const totalApplications = PIPELINE.reduce(
    (sum, { status }) => sum + countOf(status),
    0
  );

  const isStudent = tutor.tutorStatus === "STUDENT";

  const affiliation = isStudent
    ? [tutor.university, tutor.department].filter(Boolean).join(" · ")
    : [tutor.fieldOfGraduation, tutor.universityGraduatedFrom]
        .filter(Boolean)
        .join(" · ");

  const firstName = tutor.fullName.split(" ")[0];

  const strength = profileStrength(tutor);
  const photoHref = tutorFileHref("photo", tutor.profilePhotoUrl);

  const initials = tutor.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* -----------------------------------------------------
          HERO + PIPELINE
      ----------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[color-mix(in_oklch,var(--primary),black_22%)] p-6 text-primary-foreground shadow-xl shadow-primary/20 sm:p-8 lg:col-span-2">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 -z-10 size-80 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--highlight)_45%,transparent),transparent)] blur-2xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-20 -z-10 size-96 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--primary)_90%,white_10%),transparent)] blur-2xl"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] bg-size-[2.5rem_2.5rem] mask-[linear-gradient(to_left,black,transparent_70%)]"
          />

          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="size-3.5 text-highlight" aria-hidden="true" />
            Tutor workspace
          </p>

          <h1 className="mt-5 font-heading text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
            Welcome back,{" "}
            <span className="font-serif font-normal text-highlight italic">
              {firstName}.
            </span>
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-6 text-primary-foreground/75 sm:text-base sm:leading-7">
            {availableJobs > 0 ? (
              <>
                There {availableJobs === 1 ? "is" : "are"}{" "}
                <span className="font-semibold text-primary-foreground">
                  {availableJobs} open {availableJobs === 1 ? "job" : "jobs"}
                </span>{" "}
                right now. Find one that fits your subjects and schedule.
              </>
            ) : (
              "No open jobs right now — new ones are posted regularly, so check back soon."
            )}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button
              render={<Link href="/jobs" />}
              size="xl"
              className="group rounded-full bg-background px-5 text-foreground shadow-lg hover:bg-background/90"
            >
              <BriefcaseBusiness data-icon="inline-start" aria-hidden="true" />
              Explore jobs
              <ArrowRight
                data-icon="inline-end"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              />
            </Button>

            <Button
              render={<Link href="/tutor/profile" />}
              variant="outline"
              size="xl"
              className="rounded-full border-white/25 bg-white/5 px-5 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            >
              <UserRound data-icon="inline-start" aria-hidden="true" />
              View profile
            </Button>
          </div>
        </section>

        <section
          aria-labelledby="pipeline-heading"
          className="flex flex-col rounded-[1.75rem] border bg-card p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="pipeline-heading"
                className="text-sm font-medium text-muted-foreground"
              >
                Application pipeline
              </h2>
              <p className="mt-1 font-heading text-4xl font-semibold tracking-tight tabular-nums">
                {totalApplications}
              </p>
              <p className="text-xs text-muted-foreground">
                total {totalApplications === 1 ? "application" : "applications"}
              </p>
            </div>

            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="size-5" aria-hidden="true" />
            </span>
          </div>

          <div
            aria-hidden="true"
            className="mt-6 flex h-2.5 gap-1 overflow-hidden rounded-full bg-muted"
          >
            {totalApplications > 0
              ? PIPELINE.map(({ status, bar }) =>
                  countOf(status) > 0 ? (
                    <span
                      key={status}
                      className={cn("h-full rounded-full", bar)}
                      style={{ flexGrow: countOf(status) }}
                    />
                  ) : null
                )
              : null}
          </div>

          <dl className="mt-5 grid flex-1 grid-cols-2 content-end gap-x-4 gap-y-3">
            {PIPELINE.map(({ status, bar }) => (
              <div key={status} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", bar)}
                />
                <dt className="truncate text-muted-foreground">
                  {getStatusLabel(status)}
                </dt>
                <dd className="ml-auto font-semibold tabular-nums">
                  {countOf(status)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* -----------------------------------------------------
          STATS
      ----------------------------------------------------- */}
      <section aria-label="Your activity" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric
          label="Open jobs"
          value={availableJobs}
          hint="Available now"
          icon={<BriefcaseBusiness />}
          tone="primary"
          href="/jobs"
        />
        <Metric
          label="Applications"
          value={totalApplications}
          hint="Submitted so far"
          icon={<FileText />}
          tone="info"
          href="/tutor/applications"
        />
        <Metric
          label="In review"
          value={countOf("PENDING") + countOf("REVIEWED")}
          hint="Awaiting a decision"
          icon={<Clock />}
          tone="warning"
        />
        <Metric
          label="Accepted"
          value={countOf("ACCEPTED")}
          hint="Jobs you've landed"
          icon={<CheckCircle2 />}
          tone="success"
        />
      </section>

      {/* -----------------------------------------------------
          RECENT APPLICATIONS + PROFILE
      ----------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <section className="overflow-hidden rounded-[1.75rem] border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                Recent applications
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your latest activity at a glance.
              </p>
            </div>

            {recentApplications.length > 0 ? (
              <Button
                render={<Link href="/tutor/applications" />}
                variant="ghost"
                size="sm"
                className="group shrink-0 rounded-full"
              >
                View all
                <ArrowRight
                  data-icon="inline-end"
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Button>
            ) : null}
          </div>

          {recentApplications.length === 0 ? (
            <EmptyState
              className="m-5 mt-2 sm:m-6 sm:mt-2"
              icon={<FileText />}
              title="No applications yet"
              description="When you apply for a job, it will show up here with its current status."
              action={
                <Button render={<Link href="/jobs" />} size="lg" className="rounded-full px-4">
                  Find your first job
                </Button>
              }
            />
          ) : (
            <ul className="px-2 pb-2 sm:px-3 sm:pb-3">
              {recentApplications.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/tutor/applications/${application.id}`}
                    className="group flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:gap-4"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <BookOpen className="size-5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {application.job.subject}
                        <span className="text-muted-foreground">
                          {" "}
                          · Grade {application.job.grade}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className="font-mono">{application.job.jobCode}</span>
                        <span className="mx-1.5">·</span>
                        Applied {formatDate(application.createdAt)}
                        <span className="hidden sm:inline">
                          <span className="mx-1.5">·</span>
                          {formatSalary(application.job.salary)}
                        </span>
                      </p>
                    </div>

                    <StatusBadge status={application.status} className="shrink-0" />

                    <ArrowRight
                      aria-hidden="true"
                      className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="relative overflow-hidden rounded-[1.75rem] border bg-card shadow-sm">
          <div
            aria-hidden="true"
            className="h-20 bg-linear-to-br from-primary/20 via-primary/5 to-highlight/15"
          />

          <div className="-mt-10 px-6 pb-6">
            <div className="relative w-fit">
              {photoHref ? (
                // eslint-disable-next-line @next/next/no-img-element -- a 302 to a presigned R2 URL
                <img
                  src={photoHref}
                  alt=""
                  className="size-20 rounded-3xl border-4 border-card object-cover shadow-lg shadow-primary/20"
                />
              ) : (
                <span className="flex size-20 items-center justify-center rounded-3xl border-4 border-card bg-linear-to-br from-primary to-[color-mix(in_oklch,var(--primary),var(--highlight)_40%)] font-heading text-2xl font-semibold text-primary-foreground shadow-lg shadow-primary/20">
                  {initials}
                </span>
              )}
            </div>

            <h2 className="mt-4 truncate font-heading text-lg font-semibold tracking-tight">
              {tutor.fullName}
            </h2>
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <GraduationCap className="size-4" aria-hidden="true" />
              {isStudent ? "Student tutor" : "Graduate tutor"}
            </p>

            <dl className="mt-6 space-y-3.5 text-sm">
              <ProfileLine icon={<Mail />} label="Email">
                {tutor.email}
              </ProfileLine>
              <ProfileLine icon={<MapPin />} label="Location">
                {[tutor.subcity, tutor.city].filter(Boolean).join(", ")}
              </ProfileLine>
              <ProfileLine
                icon={<GraduationCap />}
                label={isStudent ? "University" : "Field"}
              >
                {affiliation || formatEnum(tutor.tutorStatus)}
              </ProfileLine>
            </dl>

            <ProfileStrengthNudge strength={strength} className="mt-6" />

            <Button
              render={<Link href="/tutor/profile" />}
              variant="outline"
              size="xl"
              className="mt-5 w-full rounded-full"
            >
              <Eye data-icon="inline-start" aria-hidden="true" />
              View full profile
            </Button>
          </div>
        </section>
      </div>

      {/* -----------------------------------------------------
          FRESH OPPORTUNITIES
      ----------------------------------------------------- */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Fresh opportunities
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              The newest open jobs you haven&apos;t applied to yet.
            </p>
          </div>

          <Link
            href="/jobs"
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
          >
            All jobs
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        {freshJobs.length === 0 ? (
          <EmptyState
            className="rounded-[1.75rem] bg-card"
            icon={<BriefcaseBusiness />}
            title="You're all caught up"
            description="You've applied to every open job. New ones are posted regularly — check back soon."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freshJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/apply/${job.jobCode}`}
                  className="group flex h-full flex-col rounded-[1.5rem] border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[0.7rem] text-muted-foreground">
                      {job.jobCode}
                    </span>
                    <span className="flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>

                  <p className="mt-4 font-heading text-base font-semibold">
                    {job.subject}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Grade {job.grade}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {job.place || "Flexible"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {job.daysPerWeek} days/wk · {job.hoursPerDay} h
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <Wallet className="size-3.5 text-highlight" aria-hidden="true" />
                      {formatSalary(job.salary)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const METRIC_TONES = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  warning:
    "bg-warning/15 text-[color-mix(in_oklch,var(--warning),var(--foreground)_35%)]",
  success: "bg-success/10 text-success",
} as const;

function Metric({
  label,
  value,
  hint,
  icon,
  tone,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  tone: keyof typeof METRIC_TONES;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 items-center justify-center rounded-2xl [&>svg]:size-5",
            METRIC_TONES[tone]
          )}
        >
          {icon}
        </span>
        {href ? (
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
          />
        ) : null}
      </div>
      <p className="mt-4 font-heading text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
      <p className="hidden text-xs text-muted-foreground sm:block">{hint}</p>
    </>
  );

  const className =
    "group block h-full rounded-[1.5rem] border bg-card p-4 shadow-sm sm:p-5";

  if (!href) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        className,
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      )}
    >
      {body}
    </Link>
  );
}

function ProfileLine({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground [&>svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate font-medium">{children}</dd>
      </div>
    </div>
  );
}
