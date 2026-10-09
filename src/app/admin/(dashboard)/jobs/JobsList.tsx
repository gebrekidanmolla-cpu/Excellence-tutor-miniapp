"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobStatusBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  ListToolbar,
  ShowMore,
  type FilterGroup,
} from "@/components/admin/ListToolbar";
import { JobRowActions } from "@/components/admin/JobRowActions";
import {
  DATE_RANGES,
  DATE_RANGE_LABELS,
  buildSearchIndex,
  byNewest,
  countBy,
  isWithinRange,
  matchesSearch,
  plural,
} from "@/lib/admin-list";
import type { JobRow } from "@/lib/admin-rows";
import { formatDate, formatSalary, getJobOutcome } from "@/lib/format";
import { useListFilters } from "@/lib/use-list-filters";
import { cn } from "@/lib/utils";

/** Each filter's values; the first is the default and stays out of the URL. */
const FILTERS = {
  status: ["all", "open", "closed"],
  outcome: ["any", "successful", "failed"],
  assigned: ["any", "no", "yes"],
  applicants: ["any", "new", "none"],
  date: DATE_RANGES,
  sort: ["newest", "oldest", "applicants", "new", "salary"],
} as const;

const SORT_LABELS: Record<(typeof FILTERS.sort)[number], string> = {
  newest: "Newest",
  oldest: "Oldest",
  applicants: "Most applicants",
  new: "Most new",
  salary: "Highest salary",
};

const SORTS: Record<
  (typeof FILTERS.sort)[number],
  (a: JobRow, b: JobRow) => number
> = {
  newest: byNewest,
  oldest: (a, b) => byNewest(b, a),
  applicants: (a, b) =>
    b.applicationCount - a.applicationCount || byNewest(a, b),
  new: (a, b) => b.pendingCount - a.pendingCount || byNewest(a, b),
  salary: (a, b) => b.salary - a.salary || byNewest(a, b),
};

/** The applicant count, with the unreviewed ones called out. */
function Applicants({ job, className }: { job: JobRow; className?: string }) {
  if (job.applicationCount === 0) {
    return <span className="text-muted-foreground">No applicants</span>;
  }

  return (
    <Link
      href={`/admin/jobs/${job.id}#applicants`}
      prefetch={false}
      className={cn(
        "inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md tap-target underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      <span className="tabular-nums">
        {plural(job.applicationCount, "applicant")}
      </span>

      {job.pendingCount > 0 ? (
        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-[color-mix(in_oklch,var(--warning),var(--foreground)_40%)] tabular-nums">
          {job.pendingCount} new
        </span>
      ) : null}
    </Link>
  );
}

/** Only failures are worth a glance from the list; the job page has the rest. */
function SyncWarnings({ job, className }: { job: JobRow; className?: string }) {
  if (job.telegramPostStatus !== "FAILED" && job.sheetSyncStatus !== "FAILED") {
    return null;
  }

  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {job.telegramPostStatus === "FAILED" ? (
        <StatusBadge status="FAILED" label="Post failed" />
      ) : null}
      {job.sheetSyncStatus === "FAILED" ? (
        <StatusBadge status="FAILED" label="Sheet failed" />
      ) : null}
    </span>
  );
}

function ParentPhone({ job }: { job: JobRow }) {
  if (!job.parentPhone) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <CopyButton
      value={job.parentPhone}
      variant="ghost"
      size="sm"
      successMessage="Parent phone copied"
      className="-ml-2 font-normal tabular-nums"
    >
      {job.parentPhone}
    </CopyButton>
  );
}

/**
 * Search, filter and act on every job. The rows come from one server query;
 * everything else happens here, with the filters kept in the URL.
 */
export default function JobsList({
  jobs,
  loadedAt,
}: {
  jobs: readonly JobRow[];
  /** When the rows were read; the date filter counts back from it. */
  loadedAt: number;
}) {
  const {
    filters,
    query,
    deferredQuery,
    setFilter,
    setQuery,
    clear,
    activeCount,
    limit,
    showMore,
  } = useListFilters(FILTERS, { persistent: ["sort"] });

  const searchable = useMemo(
    () =>
      jobs.map((job) => ({
        job,
        index: buildSearchIndex(
          [
            job.jobCode,
            job.subject,
            job.grade,
            job.place,
            job.parentName,
            job.assignedTutor?.fullName,
          ],
          [job.parentPhone]
        ),
      })),
    [jobs]
  );

  /* Every filter except status, so the status counts stay truthful. */
  const matching = searchable
    .filter(
      ({ job, index }) =>
        matchesSearch(index, deferredQuery) &&
        isWithinRange(job.createdAt, filters.date, loadedAt) &&
        (filters.outcome === "any" ||
          getJobOutcome(job.status, Boolean(job.assignedTutor)) ===
            filters.outcome.toUpperCase()) &&
        (filters.assigned === "any" ||
          (filters.assigned === "yes") === Boolean(job.assignedTutor)) &&
        (filters.applicants === "any" ||
          (filters.applicants === "new"
            ? job.pendingCount > 0
            : job.applicationCount === 0))
    )
    .map(({ job }) => job);

  const statusCounts = countBy(matching, (job) => job.status);

  const visible = (
    filters.status === "all"
      ? matching
      : matching.filter((job) => job.status === filters.status.toUpperCase())
  ).sort(SORTS[filters.sort]);

  const rows = visible.slice(0, limit);

  const isFiltered = activeCount > 0;

  const primary: FilterGroup = {
    id: "status",
    label: "Status",
    value: filters.status,
    options: [
      { value: "all", label: "All", count: matching.length },
      { value: "open", label: "Open", count: statusCounts.OPEN ?? 0 },
      { value: "closed", label: "Closed", count: statusCounts.CLOSED ?? 0 },
    ],
  };

  const groups: FilterGroup[] = [
    {
      /* How a closed job ended; an open job has no outcome, so either
         choice leaves only closed jobs. */
      id: "outcome",
      label: "Outcome",
      value: filters.outcome,
      options: [
        { value: "any", label: "Any" },
        { value: "successful", label: "Successful" },
        { value: "failed", label: "Failed" },
      ],
    },
    {
      id: "assigned",
      label: "Tutor",
      value: filters.assigned,
      options: [
        { value: "any", label: "Any" },
        { value: "no", label: "Unassigned" },
        { value: "yes", label: "Assigned" },
      ],
    },
    {
      id: "applicants",
      label: "Applicants",
      value: filters.applicants,
      options: [
        { value: "any", label: "Any" },
        { value: "new", label: "Has new" },
        { value: "none", label: "None yet" },
      ],
    },
    {
      id: "date",
      label: "Created",
      value: filters.date,
      options: FILTERS.date.map((value) => ({
        value,
        label: DATE_RANGE_LABELS[value],
      })),
    },
    {
      id: "sort",
      label: "Sort",
      value: filters.sort,
      options: FILTERS.sort.map((value) => ({
        value,
        label: SORT_LABELS[value],
      })),
    },
  ];

  function rowActionsFor(job: JobRow, compact: boolean) {
    return (
      <JobRowActions
        jobId={job.id}
        jobCode={job.jobCode}
        status={job.status}
        assignedTutorName={job.assignedTutor?.fullName ?? null}
        applicationCount={job.applicationCount}
        parentPhone={job.parentPhone}
        compact={compact}
      />
    );
  }

  const columns: DataTableColumn<JobRow>[] = [
    {
      id: "job",
      header: "Job",
      mobileTitle: true,
      cellClassName: "whitespace-normal",
      cell: (job) => (
        <div className="min-w-0">
          <Link
            href={`/admin/jobs/${job.id}`}
            prefetch={false}
            className="font-mono font-medium text-primary tap-target underline-offset-4 hover:underline"
          >
            {job.jobCode}
          </Link>
          <p className="mt-0.5 max-w-44 truncate text-xs text-muted-foreground 2xl:max-w-56">
            {job.subject} · {job.grade}
            {job.place ? ` · ${job.place}` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "parent",
      header: "Parent",
      cellClassName: "whitespace-normal",
      cell: (job) => (
        <div className="min-w-0">
          <p className="max-w-36 truncate 2xl:max-w-40">{job.parentName || "—"}</p>
          <ParentPhone job={job} />
        </div>
      ),
    },
    {
      id: "applicants",
      header: "Applicants",
      /* Below 2xl the "new" pill wraps under the count, which with the caps
         on the job, parent and tutor columns keeps the table inside a
         1280px screen instead of scrolling sideways. */
      cell: (job) => <Applicants job={job} className="xl:max-w-28 2xl:max-w-none" />,
    },
    {
      id: "tutor",
      header: "Tutor",
      cellClassName: "whitespace-normal",
      cell: (job) =>
        job.assignedTutor ? (
          <Link
            href={`/admin/tutors/${job.assignedTutor.id}`}
            prefetch={false}
            className="block max-w-32 truncate underline-offset-4 hover:underline 2xl:max-w-36"
          >
            {job.assignedTutor.fullName}
          </Link>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      id: "salary",
      header: "Salary",
      cellClassName: "tabular-nums",
      cell: (job) => (
        <div>
          {formatSalary(job.salary)}
          <p className="text-xs text-muted-foreground">
            {formatDate(job.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (job) => (
        <div className="flex flex-col items-start gap-1">
          <JobStatusBadge
            status={job.status}
            hasAssignedTutor={Boolean(job.assignedTutor)}
          />
          <SyncWarnings job={job} />
        </div>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideOnMobile: true,
      headClassName: "w-px",
      cellClassName: "text-right",
      cell: (job) => rowActionsFor(job, true),
    },
  ];

  const total = jobs.length;

  return (
    <div className="space-y-4">
      <ListToolbar
        searchLabel="Search jobs"
        searchPlaceholder="Code, subject, parent…"
        query={query}
        onQueryChange={setQuery}
        primary={primary}
        groups={groups}
        onFilterChange={(id, value) =>
          setFilter(id as keyof typeof FILTERS, value)
        }
        summary={
          isFiltered
            ? `${visible.length.toLocaleString("en-US")} of ${plural(total, "job")}`
            : plural(visible.length, "job")
        }
        resultLabel={`Show ${plural(visible.length, "job")}`}
        onClear={isFiltered ? clear : undefined}
      />

      <DataTable
        items={rows}
        columns={columns}
        getRowKey={(job) => job.id}
        caption="Tutoring jobs"
        breakpoint="xl"
        renderMobileCard={(job) => (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/jobs/${job.id}`}
                  prefetch={false}
                  className="font-mono font-medium text-primary tap-target underline-offset-4 hover:underline"
                >
                  {job.jobCode}
                </Link>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {job.subject} · {job.grade}
                  {job.place ? ` · ${job.place}` : ""}
                </p>
              </div>

              {/* Capped so two failure badges stack instead of squeezing
                  the summary beside them into a one-word column. */}
              <div className="flex max-w-[45%] shrink-0 flex-col items-end gap-1">
                <JobStatusBadge
                  status={job.status}
                  hasAssignedTutor={Boolean(job.assignedTutor)}
                />
                <SyncWarnings job={job} className="justify-end" />
              </div>
            </div>

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Applicants</dt>
              <dd className="min-w-0">
                <Applicants job={job} />
              </dd>

              <dt className="text-muted-foreground">Parent</dt>
              {/* Wraps rather than truncates: one truncated line cut the
                  phone to "+251920…" on a phone. On a narrow card the number
                  drops under the name, so neither is lost. */}
              <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="min-w-0 break-words">{job.parentName || "—"}</span>
                {job.parentPhone ? (
                  <a
                    href={`tel:${job.parentPhone}`}
                    className="tap-target shrink-0 text-primary tabular-nums underline-offset-4 hover:underline"
                  >
                    {job.parentPhone}
                  </a>
                ) : null}
              </dd>

              <dt className="text-muted-foreground">Tutor</dt>
              <dd className="min-w-0 truncate">
                {job.assignedTutor ? (
                  <Link
                    href={`/admin/tutors/${job.assignedTutor.id}`}
                    prefetch={false}
                    className="underline-offset-4 hover:underline"
                  >
                    {job.assignedTutor.fullName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </dd>

              <dt className="text-muted-foreground">Salary</dt>
              <dd className="tabular-nums">
                {formatSalary(job.salary)}
                <span className="text-muted-foreground">
                  {" · "}
                  {formatDate(job.createdAt)}
                </span>
              </dd>
            </dl>

            <div className="mt-auto border-t pt-3">
              {rowActionsFor(job, false)}
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={isFiltered ? <Search /> : <BriefcaseBusiness />}
            title={isFiltered ? "No matching jobs" : "No jobs yet"}
            description={
              isFiltered
                ? "No jobs match the current search and filters."
                : "Create your first tutoring job to start receiving applications."
            }
            action={
              isFiltered ? (
                <Button variant="outline" size="lg" onClick={clear}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  render={<Link href="/admin/jobs/new" prefetch={false} />}
                  size="xl"
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Create job
                </Button>
              )
            }
          />
        }
      />

      <ShowMore
        shown={rows.length}
        total={visible.length}
        noun="jobs"
        onShowMore={showMore}
      />
    </div>
  );
}
