import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatEnum, formatSalary } from "@/lib/format";

export default async function TutorDashboard() {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const [
    availableJobs,
    totalApplications,
    pendingApplications,
    acceptedApplications,
  ] = await Promise.all([
    prisma.job.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
        status: "PENDING",
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
        status: "ACCEPTED",
      },
    }),
  ]);

  const recentApplications = await prisma.application.findMany({
    where: {
      tutorId: tutor.id,
    },
    orderBy: {
      createdAt: "desc",
    },
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
  });

  const isStudent = tutor.tutorStatus === "STUDENT";

  const affiliation = isStudent
    ? [tutor.university, tutor.department].filter(Boolean).join(" · ")
    : (tutor.fieldOfGraduation ?? "");

  const firstName = tutor.fullName.split(" ")[0];

  const applicationSuccessRate =
    totalApplications > 0
      ? Math.round((acceptedApplications / totalApplications) * 100)
      : 0;

  return (
    <div className="relative space-y-8 pb-10">
      {/* Ambient dashboard background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-105 overflow-hidden"
      >
        <div className="absolute -left-24 top-0 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-16 size-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-40 w-lg -translate-x-1/2 rounded-full bg-linear-to-r from-primary/5 via-primary/10 to-transparent blur-3xl" />
      </div>

      {/* -----------------------------------------------------
          PREMIUM WELCOME HERO
      ----------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[0_20px_70px_-35px_rgba(0,0,0,0.35)]">
        {/* Decorative layers */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_30%),radial-gradient(circle_at_15%_100%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_30%)]"
        />

        <div
          aria-hidden="true"
          className="absolute -right-32 -top-32 size-64 rounded-full border border-primary/10 bg-primary/5 blur-[1px]"
        />

        <div
          aria-hidden="true"
          className="absolute -bottom-20 right-1/3 size-40 rounded-full border border-primary/10"
        />

        <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Tutor workspace
            </div>

            <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Welcome back,{" "}
              <span className="bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                {firstName}.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Your tutoring opportunities, applications, and profile—all in
              one place.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                render={<Link href="/jobs" />}
                size="xl"
                className="group shadow-lg shadow-primary/15"
              >
                <BriefcaseBusiness
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Explore opportunities
                <ArrowRight
                  className="transition-transform group-hover:translate-x-1"
                  data-icon="inline-end"
                  aria-hidden="true"
                />
              </Button>

              <Button
                render={<Link href="/tutor/profile" />}
                variant="outline"
                size="xl"
                className="bg-background/60 backdrop-blur"
              >
                <UserRound data-icon="inline-start" aria-hidden="true" />
                View profile
              </Button>
            </div>
          </div>

          {/* Compact application overview */}
          <div className="relative w-full max-w-sm shrink-0 lg:max-w-70">
            <div className="rounded-3xl border border-border/60 bg-background/70 p-5 shadow-xl shadow-black/5 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Application overview
                  </p>
                  <p className="mt-2 font-heading text-3xl font-semibold tracking-tight">
                    {totalApplications}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    total applications
                  </p>
                </div>

                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="size-5" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Accepted applications
                  </span>
                  <span className="font-semibold">
                    {applicationSuccessRate}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-primary to-primary/60 transition-all"
                    style={{
                      width: `${Math.min(applicationSuccessRate, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Open jobs</p>
                  <p className="mt-1 text-lg font-semibold">{availableJobs}</p>
                </div>

                <div className="rounded-2xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">In review</p>
                  <p className="mt-1 text-lg font-semibold">
                    {pendingApplications}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -----------------------------------------------------
          STATISTICS
      ----------------------------------------------------- */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Your activity
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight">
              At a glance
            </h2>
          </div>

          <Link
            href="/tutor/applications"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex sm:items-center sm:gap-1.5"
          >
            Application history
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Available jobs"
            value={availableJobs}
            hint="Currently open opportunities"
            icon={<BriefcaseBusiness />}
            href="/jobs"
          />

          <StatCard
            label="My applications"
            value={totalApplications}
            hint="Applications submitted"
            icon={<FileText />}
            href="/tutor/applications"
          />

          <StatCard
            label="Under review"
            value={pendingApplications}
            hint="Awaiting a decision"
            icon={<Clock />}
          />

          <StatCard
            label="Accepted"
            value={acceptedApplications}
            hint="Successful applications"
            icon={<CheckCircle2 />}
          />
        </div>
      </section>

      {/* -----------------------------------------------------
          MAIN CONTENT
      ----------------------------------------------------- */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
        {/* ---------------------------------------------------
            RECENT APPLICATIONS
        --------------------------------------------------- */}
        <section className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_80%,transparent)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Activity
                </p>
              </div>

              <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">
                Recent applications
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Keep track of your latest tutoring opportunities.
              </p>
            </div>

            {recentApplications.length > 0 ? (
              <Button
                render={<Link href="/tutor/applications" />}
                variant="ghost"
                size="sm"
                className="group"
              >
                View all
                <ArrowRight
                  className="transition-transform group-hover:translate-x-1"
                  data-icon="inline-end"
                  aria-hidden="true"
                />
              </Button>
            ) : null}
          </div>

          {recentApplications.length === 0 ? (
            <EmptyState
              className="rounded-none border-0 py-16"
              icon={<FileText />}
              title="No applications yet"
              description="Explore available jobs and submit your first application."
              action={
                <Button render={<Link href="/jobs" />} size="lg">
                  Explore jobs
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {recentApplications.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/tutor/applications/${application.id}`}
                    className="group relative flex flex-col gap-4 p-5 transition-all duration-300 hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    {/* Timeline accent */}
                    <div className="absolute bottom-0 left-0 top-0 w-0.5 origin-top scale-y-0 bg-primary transition-transform duration-300 group-hover:scale-y-100" />

                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-primary transition-all duration-300 group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:shadow-lg group-hover:shadow-primary/10">
                        <FileText className="size-5" aria-hidden="true" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">
                             {application.job.jobCode}
                          </p>

                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Subject: {application.job.subject}
                          </span>
                        </div>

                        <p className="mt-1.5 truncate text-sm text-muted-foreground">
                          Grade {application.job.grade}{" "}
                          <span className="mx-1">·</span>{" "}
                          {formatDate(application.createdAt)}
                        </p>

                        {application.job.salary ? (
                          <p className="mt-2 text-xs font-medium text-foreground/70">
                            {formatSalary(application.job.salary)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <StatusBadge status={application.status} />

                      <span className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background transition-all duration-300 group-hover:border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowRight
                          className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------------------------------
            PREMIUM PROFILE
        --------------------------------------------------- */}
        <section className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-sm">
          {/* Decorative profile background */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-32 bg-linear-to-br from-primary/15 via-primary/5 to-transparent"
          />

          <div
            aria-hidden="true"
            className="absolute -right-12 -top-12 size-32 rounded-full border border-primary/10"
          />

          <div className="relative p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary via-primary/80 to-primary/50 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {tutor.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((name) => name[0])
                      .join("")
                      .toUpperCase()}
                  </div>

                  <span
                    className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-card bg-success"
                    aria-label="Profile active"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    My profile
                  </p>

                  <h2 className="mt-1 truncate font-heading text-lg font-semibold">
                    {tutor.fullName}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {isStudent ? "Student Tutor" : "Graduate Tutor"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Email
                </p>
                <p className="mt-1.5 truncate text-sm font-medium">
                  {tutor.email}
                </p>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  Location
                </p>
                <p className="mt-1.5 text-sm font-medium">
                  {tutor.city}, {tutor.subcity}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {isStudent ? "Academic affiliation" : "Professional field"}
                </p>

                <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-6">
                  {affiliation || formatEnum(tutor.tutorStatus)}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserRound className="size-4" aria-hidden="true" />
                </div>

                <div>
                  <p className="text-sm font-semibold">Thanks for being our community member</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Your profile helps you stay prepared
                    for new opportunities.
                  </p>
                </div>
              </div>
            </div>

            <Button
              render={<Link href="/tutor/profile" />}
              variant="outline"
              size="xl"
              className="mt-5 w-full bg-background/70 transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              View my profile
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}