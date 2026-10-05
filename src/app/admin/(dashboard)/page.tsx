import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleCheck,
  FileText,
  Inbox,
  Plus,
  UserPlus,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-context";
import { APPLICATION_ROW_SELECT, toApplicationRow } from "@/lib/admin-rows";
import { getProfileShareLinkBase } from "@/lib/tutor-profile-server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { plural } from "@/lib/admin-list";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import ApplicationRowActions from "./applications/ApplicationRowActions";

/** How many pending applications the overview lets you act on directly. */
const QUEUE_SIZE = 8;

export default async function AdminDashboard() {
  // The counts come with the admin lookup the layout already made; the
  // review queue is this page's one query.
  const { counts } = await requireAdmin();

  const [pending, linkBase] = await Promise.all([
    prisma.application.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: QUEUE_SIZE,
      select: APPLICATION_ROW_SELECT,
    }),
    getProfileShareLinkBase(),
  ]);

  const queue = pending.map(toApplicationRow);

  const acceptanceRate =
    counts.applications > 0
      ? Math.round((counts.acceptedApplications / counts.applications) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="What needs your attention, one tap from each list."
        actions={
          <Button
            render={<Link href="/admin/jobs/new" prefetch={false} />}
            size="xl"
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            New job
          </Button>
        }
      />

      {/* -----------------------------------------------------
          NEEDS ATTENTION — each tile opens the list already filtered
      ----------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="New applications"
          value={counts.pendingApplications}
          hint={`${counts.applicationsToday} in the last 24 hours`}
          icon={<Inbox />}
          href="/admin/applications?status=pending"
        />

        <StatCard
          label="Open jobs"
          value={counts.openJobs}
          hint={`${counts.openJobsWithNew} with new applicants`}
          icon={<BriefcaseBusiness />}
          href="/admin/jobs?status=open"
        />

        <StatCard
          label="No applicants yet"
          value={counts.openJobsWithoutApplicants}
          hint="Open jobs nobody has applied to"
          icon={<FileText />}
          href="/admin/jobs?status=open&applicants=none"
        />

        <StatCard
          label="New tutors"
          value={counts.tutorsThisWeek}
          hint={`This week · ${counts.tutors} registered`}
          icon={<UserPlus />}
          href="/admin/tutors?date=7d"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------------------------------------------
            REVIEW QUEUE
        --------------------------------------------------- */}
        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="font-heading font-medium">Waiting for review</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {counts.pendingApplications > 0
                  ? `The newest of ${plural(counts.pendingApplications, "pending application")}.`
                  : "Nothing is waiting."}
              </p>
            </div>

            {counts.pendingApplications > 0 ? (
              <Button
                render={
                  <Link
                    href="/admin/applications?status=pending"
                    prefetch={false}
                  />
                }
                variant="ghost"
                size="lg"
              >
                Review all
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          {queue.length === 0 ? (
            <EmptyState
              className="rounded-none border-0"
              icon={<CircleCheck />}
              title="You're all caught up"
              description="New applications will appear here as tutors apply to open jobs."
            />
          ) : (
            <ul className="divide-y">
              {queue.map((application) => {
                const jobIsActionable =
                  application.job.status !== "CLOSED" &&
                  !application.job.assignedTutorId;

                return (
                  <li
                    key={application.id}
                    className="flex flex-col gap-3 p-4 2xl:flex-row 2xl:items-center 2xl:justify-between"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/applications/${application.id}`}
                        prefetch={false}
                        className="font-medium text-primary tap-target underline-offset-4 hover:underline"
                      >
                        {application.tutor.fullName}
                      </Link>

                      <p className="mt-0.5 text-sm text-muted-foreground">
                        <Link
                          href={`/admin/jobs/${application.job.id}`}
                          prefetch={false}
                          className="font-mono font-medium text-foreground tap-target underline-offset-4 hover:underline"
                        >
                          {application.job.jobCode}
                        </Link>
                        {" · "}
                        {application.job.subject}
                        {" · "}
                        <span className="tabular-nums">
                          {application.tutor.entrancePercentage.toFixed(1)}%
                        </span>
                        {" · "}
                        {formatDate(application.createdAt)}
                      </p>
                    </div>

                    <div className="2xl:shrink-0">
                      <ApplicationRowActions
                        applicationId={application.id}
                        status={application.status}
                        tutor={application.tutor}
                        jobCode={application.job.jobCode}
                        linkBase={linkBase}
                        canAssign={jobIsActionable}
                        canChangeStatus={jobIsActionable}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------------------------------------------------
            AT A GLANCE — every row opens that slice of the list
        --------------------------------------------------- */}
        <div className="space-y-6">
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading font-medium">Applications</h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {counts.applications} · {acceptanceRate}% accepted
              </span>
            </div>

            <div className="mt-3 space-y-1">
              <Breakdown
                label="Pending"
                value={counts.pendingApplications}
                total={counts.applications}
                tone="bg-warning"
                href="/admin/applications?status=pending"
              />
              <Breakdown
                label="Reviewed"
                value={counts.reviewedApplications}
                total={counts.applications}
                tone="bg-info"
                href="/admin/applications?status=reviewed"
              />
              <Breakdown
                label="Accepted"
                value={counts.acceptedApplications}
                total={counts.applications}
                tone="bg-success"
                href="/admin/applications?status=accepted"
              />
              <Breakdown
                label="Rejected"
                value={counts.rejectedApplications}
                total={counts.applications}
                tone="bg-destructive"
                href="/admin/applications?status=rejected"
              />
            </div>
          </section>

          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading font-medium">Jobs</h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {counts.jobs}
              </span>
            </div>

            <div className="mt-3 space-y-1">
              <Breakdown
                label="Open"
                value={counts.openJobs}
                total={counts.jobs}
                tone="bg-success"
                href="/admin/jobs?status=open"
              />
              <Breakdown
                label="Closed"
                value={counts.jobs - counts.openJobs}
                total={counts.jobs}
                tone="bg-muted-foreground"
                href="/admin/jobs?status=closed"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * A labelled proportion bar that opens its slice of the list. Width falls
 * back to 0 when the total is 0.
 */
function Breakdown({
  label,
  value,
  total,
  tone,
  href,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
  href: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Link
      href={href}
      prefetch={false}
      className="-mx-2 block rounded-lg px-2 py-2 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
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
    </Link>
  );
}
