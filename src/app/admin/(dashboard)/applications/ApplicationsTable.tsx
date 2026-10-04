"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ExpandableDisclosure } from "@/components/shared/ExpandableRow";
import {
  ListToolbar,
  ShowMore,
  type FilterGroup,
} from "@/components/admin/ListToolbar";
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
import type { ApplicationRow } from "@/lib/admin-rows";
import { formatDateTime, formatEnum, formatSalary } from "@/lib/format";
import { useListFilters } from "@/lib/use-list-filters";
import ApplicationRowActions from "./ApplicationRowActions";

type Props = {
  applications: readonly ApplicationRow[];
  linkBase: string;
  /** When the rows were read; the date filter counts back from it. */
  loadedAt: number;
};

/** Each filter's values; the first is the default and stays out of the URL. */
const FILTERS = {
  status: ["all", "pending", "reviewed", "accepted", "rejected"],
  date: DATE_RANGES,
  job: ["any", "unassigned", "assigned"],
  tutor: ["any", "student", "graduate"],
  entrance: ["any", "90", "80", "70", "60"],
  sort: ["entrance", "newest", "oldest", "gpa"],
} as const;

const STATUS_LABELS: Record<(typeof FILTERS.status)[number], string> = {
  all: "All",
  pending: "Pending",
  reviewed: "Reviewed",
  accepted: "Accepted",
  rejected: "Rejected",
};

const SORT_LABELS: Record<(typeof FILTERS.sort)[number], string> = {
  entrance: "Best entrance",
  newest: "Newest",
  oldest: "Oldest",
  gpa: "Best GPA",
};

/* Ties fall back to newest first, so the order never looks random. */
const SORTS: Record<
  (typeof FILTERS.sort)[number],
  (a: ApplicationRow, b: ApplicationRow) => number
> = {
  entrance: (a, b) =>
    b.tutor.entrancePercentage - a.tutor.entrancePercentage || byNewest(a, b),
  newest: byNewest,
  oldest: (a, b) => byNewest(b, a),
  gpa: (a, b) => (b.tutor.gpa ?? -1) - (a.tutor.gpa ?? -1) || byNewest(a, b),
};

function formatGPA(application: ApplicationRow): string {
  return application.tutor.gpa !== null
    ? application.tutor.gpa.toFixed(2)
    : "—";
}

/** The label/value pairs revealed by the row chevron. */
function DetailPanel({ application }: { application: ApplicationRow }) {
  const { tutor, job } = application;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Phone</dt>
        <dd>
          <CopyButton
            value={tutor.phone}
            variant="ghost"
            size="sm"
            successMessage="Phone number copied"
            className="-ml-2 font-normal"
          >
            {tutor.phone}
          </CopyButton>
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Gender</dt>
        <dd className="mt-0.5 font-medium">{formatEnum(tutor.gender)}</dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">University</dt>
        <dd className="mt-0.5 font-medium break-words">
          {tutor.institution || "—"}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">
          {tutor.tutorStatus === "STUDENT" ? "Department" : "Field"}
        </dt>
        <dd className="mt-0.5 font-medium break-words">
          {tutor.field || "—"}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Entrance result</dt>
        <dd className="mt-0.5 font-medium tabular-nums">
          {tutor.entranceScore}/{tutor.entranceTotal}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Job salary</dt>
        <dd className="mt-0.5 font-medium tabular-nums">
          {formatSalary(job.salary)}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Job status</dt>
        <dd className="mt-0.5">
          <StatusBadge status={job.status} />
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Applied</dt>
        <dd className="mt-0.5 font-medium">
          {formatDateTime(application.createdAt)}
        </dd>
      </div>
    </dl>
  );
}

/**
 * Search, filter and act on every application. All rows arrive in one
 * server render; searching and filtering happen here, and the filters live
 * in the URL (`useListFilters`), so `/admin/applications?status=pending`
 * is a bookmarkable view that costs no extra request to switch.
 */
export default function ApplicationsTable({
  applications,
  linkBase,
  loadedAt,
}: Props) {
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
      applications.map((application) => ({
        application,
        index: buildSearchIndex(
          [
            application.tutor.fullName,
            application.job.jobCode,
            application.job.subject,
            application.job.grade,
            application.tutor.institution,
            application.tutor.field,
            application.tutor.exactPlace,
          ],
          [application.tutor.phone]
        ),
      })),
    [applications]
  );

  /* Every application is already on the page, so a tutor's total is a count
     over the list rather than another query. */
  const applicationsByTutor = useMemo(
    () => countBy(applications, (application) => application.tutor.id),
    [applications]
  );

  /** Narrows the list to one tutor, by their phone number, which is unique. */
  function showTutor(phone: string) {
    clear();
    setQuery(phone);
  }

  /** The tutor's total; tapping it lists all of them when there are more. */
  function tutorTotal(application: ApplicationRow) {
    const { tutor } = application;

    const count = applicationsByTutor[tutor.id] ?? 1;

    if (count < 2) {
      return <span className="font-medium tabular-nums">1</span>;
    }

    return (
      <button
        type="button"
        onClick={() => showTutor(tutor.phone)}
        title={`Show all ${count} applications by ${tutor.fullName}`}
        className="rounded-md font-medium text-primary tabular-nums underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {count}
        <span className="sr-only">
          {" "}
          applications by {tutor.fullName}. Show them all.
        </span>
      </button>
    );
  }

  /* Every filter except status: what each status segment would hold, so
     its count stays truthful while the other filters are applied. */
  const matching = searchable
    .filter(({ application, index }) => {
      const { tutor, job } = application;

      return (
        matchesSearch(index, deferredQuery) &&
        isWithinRange(application.createdAt, filters.date, loadedAt) &&
        (filters.job === "any" ||
          (filters.job === "assigned") === Boolean(job.assignedTutorId)) &&
        (filters.tutor === "any" ||
          tutor.tutorStatus === filters.tutor.toUpperCase()) &&
        (filters.entrance === "any" ||
          tutor.entrancePercentage >= Number(filters.entrance))
      );
    })
    .map(({ application }) => application);

  const statusCounts = countBy(matching, (application) => application.status);

  const visible = (
    filters.status === "all"
      ? matching
      : matching.filter(
          (application) => application.status === filters.status.toUpperCase()
        )
  ).sort(SORTS[filters.sort]);

  const rows = visible.slice(0, limit);

  const isFiltered = activeCount > 0;

  const primary: FilterGroup = {
    id: "status",
    label: "Status",
    value: filters.status,
    options: FILTERS.status.map((value) => ({
      value,
      label: STATUS_LABELS[value],
      count:
        value === "all"
          ? matching.length
          : (statusCounts[value.toUpperCase()] ?? 0),
    })),
  };

  const groups: FilterGroup[] = [
    {
      id: "date",
      label: "Applied",
      value: filters.date,
      options: FILTERS.date.map((value) => ({
        value,
        label: DATE_RANGE_LABELS[value],
      })),
    },
    {
      id: "job",
      label: "Job",
      value: filters.job,
      options: [
        { value: "any", label: "Any" },
        { value: "unassigned", label: "Unassigned" },
        { value: "assigned", label: "Assigned" },
      ],
    },
    {
      id: "tutor",
      label: "Tutor",
      value: filters.tutor,
      options: [
        { value: "any", label: "Any" },
        { value: "student", label: "Students" },
        { value: "graduate", label: "Graduates" },
      ],
    },
    {
      id: "entrance",
      label: "Entrance",
      value: filters.entrance,
      options: FILTERS.entrance.map((value) => ({
        value,
        label: value === "any" ? "Any" : `${value}%+`,
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

  function rowActionsFor(application: ApplicationRow, compact: boolean) {
    /* Both mirror the API guards: the assign route and the status route each
       refuse a closed job and a job that already has an assigned tutor. */
    const jobIsActionable =
      application.job.status !== "CLOSED" &&
      !application.job.assignedTutorId;

    return (
      <ApplicationRowActions
        applicationId={application.id}
        status={application.status}
        tutor={application.tutor}
        jobCode={application.job.jobCode}
        linkBase={linkBase}
        canAssign={jobIsActionable && application.status !== "ACCEPTED"}
        canChangeStatus={jobIsActionable}
        compact={compact}
      />
    );
  }

  const columns: DataTableColumn<ApplicationRow>[] = [
    {
      id: "tutor",
      header: "Tutor",
      mobileTitle: true,
      cellClassName: "whitespace-normal",
      cell: (application) => (
        <div className="min-w-0">
          <Link
            href={`/admin/applications/${application.id}`}
            prefetch={false}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {application.tutor.fullName}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {application.tutor.phone} ·{" "}
            {formatEnum(application.tutor.tutorStatus)}
          </p>
        </div>
      ),
    },
    {
      id: "job",
      header: "Job",
      cellClassName: "whitespace-normal",
      cell: (application) => (
        <div className="min-w-0">
          <Link
            href={`/admin/jobs/${application.job.id}`}
            prefetch={false}
            className="font-mono text-sm font-medium underline-offset-4 hover:underline"
          >
            {application.job.jobCode}
          </Link>
          <p className="mt-0.5 max-w-40 truncate text-xs text-muted-foreground">
            {application.job.subject} · {application.job.grade}
          </p>
        </div>
      ),
    },
    {
      id: "scores",
      header: "Entrance",
      /* GPA sits under the entrance result rather than beside it, which
         keeps the table inside a 1280px screen. */
      cell: (application) => (
        <div className="tabular-nums">
          <p className="font-medium">
            {application.tutor.entrancePercentage.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            GPA {formatGPA(application)}
          </p>
        </div>
      ),
    },
    {
      id: "area",
      header: "Area",
      cell: (application) => (
        <span className="block max-w-28 truncate">
          {application.tutor.exactPlace || "—"}
        </span>
      ),
    },
    {
      id: "total",
      header: "Applications",
      cell: tutorTotal,
    },
    {
      id: "status",
      header: "Status",
      cell: (application) => <StatusBadge status={application.status} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideOnMobile: true,
      headClassName: "w-px",
      cellClassName: "text-right",
      cell: (application) => rowActionsFor(application, true),
    },
  ];

  const total = applications.length;

  return (
    <div className="space-y-4">
      <ListToolbar
        searchLabel="Search applications"
        searchPlaceholder="Name, phone, job code…"
        query={query}
        onQueryChange={setQuery}
        primary={primary}
        groups={groups}
        onFilterChange={(id, value) =>
          setFilter(id as keyof typeof FILTERS, value)
        }
        summary={
          isFiltered
            ? `${visible.length.toLocaleString("en-US")} of ${plural(total, "application")}`
            : plural(visible.length, "application")
        }
        resultLabel={`Show ${plural(visible.length, "application")}`}
        onClear={isFiltered ? clear : undefined}
      />

      <DataTable
        items={rows}
        columns={columns}
        getRowKey={(application) => application.id}
        caption="Tutor applications"
        breakpoint="xl"
        renderExpanded={(application) => (
          <DetailPanel application={application} />
        )}
        getExpandLabel={(application) =>
          `Show more details for ${application.tutor.fullName}`
        }
        renderMobileCard={(application) => (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/applications/${application.id}`}
                  prefetch={false}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {application.tutor.fullName}
                </Link>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <Link
                    href={`/admin/jobs/${application.job.id}`}
                    prefetch={false}
                    className="font-mono font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {application.job.jobCode}
                  </Link>{" "}
                  · {application.job.subject} · {application.job.grade}
                </p>
              </div>

              <StatusBadge status={application.status} />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Entrance</dt>
                <dd className="font-medium tabular-nums">
                  {application.tutor.entrancePercentage.toFixed(1)}%
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted-foreground">GPA</dt>
                <dd className="font-medium tabular-nums">
                  {formatGPA(application)}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Area</dt>
                <dd className="truncate font-medium">
                  {application.tutor.exactPlace || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted-foreground">
                  Applications
                </dt>
                <dd>{tutorTotal(application)}</dd>
              </div>
            </dl>

            <ExpandableDisclosure>
              <DetailPanel application={application} />
            </ExpandableDisclosure>

            <div className="mt-auto border-t pt-3">
              {rowActionsFor(application, false)}
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={isFiltered ? <Search /> : <FileText />}
            title={
              isFiltered ? "No matching applications" : "No applications yet"
            }
            description={
              isFiltered
                ? "No applications match the current search and filters."
                : "Applications will appear here as tutors apply to open jobs."
            }
            action={
              isFiltered ? (
                <Button variant="outline" size="lg" onClick={clear}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      />

      <ShowMore
        shown={rows.length}
        total={visible.length}
        noun="applications"
        onShowMore={showMore}
      />
    </div>
  );
}
