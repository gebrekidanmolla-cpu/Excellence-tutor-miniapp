import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import SheetSyncButton from "@/components/admin/SheetSyncButton";
import {
  formatDate,
  formatEnum,
  formatSalary,
  getSheetSyncLabel,
} from "@/lib/format";
import { isSheetSyncConfigured } from "@/lib/google-sheets";

type JobRow = Awaited<ReturnType<typeof loadJobs>>[number];

async function loadJobs() {
  return prisma.job.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });
}

export default async function AdminJobsPage() {
  const jobs = await loadJobs();
  const sheetConfigured = isSheetSyncConfigured();

  /* Replaces a `min-w-225` table that forced horizontal scrolling on every
     phone; `DataTable` renders these same columns as cards below `md:`. */
  const columns: DataTableColumn<JobRow>[] = [
    {
      id: "jobCode",
      header: "Job code",
      mobileTitle: true,
      cell: (job) => (
        <Link
          href={`/admin/jobs/${job.id}`}
          className="font-mono font-medium text-primary underline-offset-4 hover:underline"
        >
          {job.jobCode}
        </Link>
      ),
    },
    {
      id: "subject",
      header: "Subject",
      cell: (job) => job.subject,
    },
    {
      id: "grade",
      header: "Grade",
      cell: (job) => job.grade,
    },
    {
      id: "gender",
      header: "Tutor",
      cell: (job) => formatEnum(job.gender),
    },
    {
      id: "place",
      header: "Place",
      cell: (job) => job.place || "—",
    },
    {
      id: "salary",
      header: "Salary",
      headClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      cell: (job) => formatSalary(job.salary),
    },
    {
      id: "applications",
      header: "Applications",
      headClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      /* Straight to that job's pool: the count is the reason to open the job
         in the first place, and the applicants list lives on its page. */
      cell: (job) =>
        job._count.applications > 0 ? (
          <Link
            href={`/admin/jobs/${job.id}#applicants`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {job._count.applications}
          </Link>
        ) : (
          job._count.applications
        ),
    },
    {
      id: "created",
      header: "Created",
      cell: (job) => formatDate(job.createdAt),
    },
    {
      id: "status",
      header: "Status",
      cell: (job) => <StatusBadge status={job.status} />,
    },
    {
      id: "telegram",
      header: "Telegram",
      /* Hidden on mobile so the card doesn't grow another row — the
         job page is where you act on a failed post anyway. */
      hideOnMobile: true,
      cell: (job) => <StatusBadge status={job.telegramPostStatus} />,
    },
    {
      id: "sheet",
      header: "Sheet",
      hideOnMobile: true,
      cell: (job) => (
        <StatusBadge
          status={job.sheetSyncStatus}
          label={getSheetSyncLabel(job.sheetSyncStatus)}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      hideOnMobile: true,
      headClassName: "w-px",
      cell: (job) => (
        <Button
          render={<Link href={`/admin/jobs/${job.id}`} />}
          variant="ghost"
          size="sm"
          aria-label={`View job ${job.jobCode}`}
        >
          View
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description={
          jobs.length === 0
            ? "Manage tutoring jobs and applications."
            : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} posted`
        }
        actions={
          <>
            {/* The backfill for jobs that predate sheet mirroring, and
                the repair for any row whose sync failed since. */}
            {sheetConfigured && jobs.length > 0 ? (
              <SheetSyncButton variant="outline" />
            ) : null}

            <Button render={<Link href="/admin/jobs/new" />} size="xl">
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create job
            </Button>
          </>
        }
      />

      <DataTable
        items={jobs}
        columns={columns}
        getRowKey={(job) => job.id}
        caption="Tutoring jobs"
        empty={
          <EmptyState
            icon={<BriefcaseBusiness />}
            title="No jobs yet"
            description="Create your first tutoring job to start receiving applications."
            action={
              <Button render={<Link href="/admin/jobs/new" />} size="xl">
                <Plus data-icon="inline-start" aria-hidden="true" />
                Create job
              </Button>
            }
          />
        }
      />
    </div>
  );
}
