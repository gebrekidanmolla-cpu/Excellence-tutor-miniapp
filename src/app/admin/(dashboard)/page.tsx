import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AdminDashboard() {
  const [
    totalTutors,
    totalJobs,
    openJobs,
    closedJobs,
    totalApplications,
    pendingApplications,
    reviewedApplications,
    acceptedApplications,
    rejectedApplications,
    recentApplications,
  ] = await Promise.all([
    prisma.tutor.count(),

    prisma.job.count(),

    prisma.job.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.job.count({
      where: {
        status: "CLOSED",
      },
    }),

    prisma.application.count(),

    prisma.application.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.application.count({
      where: {
        status: "REVIEWED",
      },
    }),

    prisma.application.count({
      where: {
        status: "ACCEPTED",
      },
    }),

    prisma.application.count({
      where: {
        status: "REJECTED",
      },
    }),

    prisma.application.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        status: true,
        createdAt: true,
        tutor: {
          select: {
            fullName: true,
          },
        },
        job: {
          select: {
            jobCode: true,
            subject: true,
          },
        },
      },
    }),
  ]);

  const acceptanceRate =
    totalApplications > 0
      ? Math.round((acceptedApplications / totalApplications) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="An overview of tutors, jobs and applications."
        actions={
          <>
            <Button render={<Link href="/admin/jobs/new" prefetch={false} />} size="xl">
              <Plus data-icon="inline-start" aria-hidden="true" />
              New job
            </Button>

            <Button
              render={<Link href="/admin/tutors" prefetch={false} />}
              variant="outline"
              size="xl"
            >
              View tutors
            </Button>
          </>
        }
      />

      {/* -----------------------------------------------------
          HEADLINE NUMBERS
      ----------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registered tutors"
          value={totalTutors}
          icon={<Users />}
          href="/admin/tutors"
        />

        <StatCard
          label="Total jobs"
          value={totalJobs}
          hint={`${openJobs} open · ${closedJobs} closed`}
          icon={<BriefcaseBusiness />}
          href="/admin/jobs"
        />

        <StatCard
          label="Applications"
          value={totalApplications}
          hint={`${pendingApplications} awaiting review`}
          icon={<FileText />}
          href="/admin/applications"
        />

        <StatCard
          label="Accepted"
          value={acceptedApplications}
          hint={`${acceptanceRate}% acceptance rate`}
          icon={<CheckCircle2 />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------------------------------------------
            RECENT APPLICATIONS
        --------------------------------------------------- */}
        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="font-heading font-medium">
                Recent applications
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The latest submissions across all jobs.
              </p>
            </div>

            {recentApplications.length > 0 ? (
              <Button
                render={<Link href="/admin/applications" prefetch={false} />}
                variant="ghost"
                size="sm"
              >
                View all
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          {recentApplications.length === 0 ? (
            <EmptyState
              className="rounded-none border-0"
              icon={<FileText />}
              title="No applications yet"
              description="Applications will appear here as tutors apply to open jobs."
            />
          ) : (
            <ul className="divide-y">
              {recentApplications.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/admin/applications/${application.id}`} prefetch={false}
                    className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {application.tutor.fullName}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {application.job.jobCode} ·{" "}
                        {application.job.subject} ·{" "}
                        {formatDate(application.createdAt)}
                      </p>
                    </div>

                    <StatusBadge status={application.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------------------------------
            BREAKDOWNS
        --------------------------------------------------- */}
        <div className="space-y-6">
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h2 className="font-heading font-medium">Applications</h2>

            <div className="mt-4 space-y-3">
              <Breakdown
                label="Pending"
                value={pendingApplications}
                total={totalApplications}
                tone="bg-warning"
              />
              <Breakdown
                label="Reviewed"
                value={reviewedApplications}
                total={totalApplications}
                tone="bg-info"
              />
              <Breakdown
                label="Accepted"
                value={acceptedApplications}
                total={totalApplications}
                tone="bg-success"
              />
              <Breakdown
                label="Rejected"
                value={rejectedApplications}
                total={totalApplications}
                tone="bg-destructive"
              />
            </div>
          </section>

          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h2 className="font-heading font-medium">Jobs</h2>

            <div className="mt-4 space-y-3">
              <Breakdown
                label="Open"
                value={openJobs}
                total={totalJobs}
                tone="bg-success"
              />
              <Breakdown
                label="Closed"
                value={closedJobs}
                total={totalJobs}
                tone="bg-muted-foreground"
              />
            </div>

            <Button
              render={<Link href="/admin/jobs" prefetch={false} />}
              variant="outline"
              size="lg"
              className="mt-5 w-full"
            >
              <BriefcaseBusiness data-icon="inline-start" aria-hidden="true" />
              Manage jobs
            </Button>
          </section>

          {pendingApplications > 0 ? (
            <section className="rounded-xl border border-warning/30 bg-warning/5 p-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-[color-mix(in_oklch,var(--warning),var(--foreground)_40%)]"
                >
                  <Clock3 className="size-4.5" />
                </span>

                <div className="min-w-0">
                  <h2 className="font-heading font-medium">
                    {pendingApplications} awaiting review
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                    Applications that have not been triaged yet.
                  </p>

                  <Button
                    render={<Link href="/admin/applications" prefetch={false} />}
                    size="lg"
                    className="mt-3"
                  >
                    Review now
                  </Button>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A labelled proportion bar. Width falls back to 0 when the total is 0. */
function Breakdown({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value}
          <span className="ml-1.5 text-xs text-muted-foreground">
            {percent}%
          </span>
        </span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
