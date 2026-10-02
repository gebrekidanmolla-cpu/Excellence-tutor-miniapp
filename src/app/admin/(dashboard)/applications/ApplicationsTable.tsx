"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ExpandableDisclosure } from "@/components/shared/ExpandableRow";
import {
  formatDate,
  formatDateTime,
  formatEnum,
  formatSalary,
} from "@/lib/format";
import ApplicationRowActions from "./ApplicationRowActions";

type ApplicationStatus = "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";

type TutorStatus = "STUDENT" | "GRADUATE";

type Application = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  tutor: {
    id: string;
    fullName: string;
    phone: string;
    gender: "ANY" | "MALE" | "FEMALE";
    university: string | null;
    department: string | null;
    currentGPA: number | null;
    CGPA: number | null;
    tutorStatus: TutorStatus;
    entranceScore: number;
    entranceTotal: number;
    entrancePercentage: number;
    createdAt: string;
  };
  job: {
    id: string;
    jobCode: string;
    grade: string;
    subject: string;
    salary: number;
    status: "OPEN" | "CLOSED";
    assignedTutorId: string | null;
  };
};

type Props = {
  applications: Application[];
};

type SortDirection = "asc" | "desc" | null;

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

const ENTRANCE_OPTIONS = [
  { value: "ALL", label: "Any entrance %" },
  { value: "90", label: "90%+" },
  { value: "80", label: "80%+" },
  { value: "70", label: "70%+" },
  { value: "60", label: "60%+" },
];

const TIME_OPTIONS = [
  { value: "ALL", label: "All time" },
  { value: "24H", label: "Last 24h" },
  { value: "7D", label: "Last 7d" },
  { value: "30D", label: "Last 30d" },
];

const TUTOR_STATUS_OPTIONS = [
  { value: "ALL", label: "All tutors" },
  { value: "STUDENT", label: "Students" },
  { value: "GRADUATE", label: "Graduates" },
];

const TIME_FILTER_HOURS: Record<string, number> = {
  "24H": 24,
  "7D": 24 * 7,
  "30D": 24 * 30,
};

function formatGPA(application: Application): string {
  const {
    tutor: { tutorStatus, currentGPA, CGPA },
  } = application;

  if (tutorStatus === "STUDENT") {
    return currentGPA !== null ? currentGPA.toFixed(2) : "—";
  }

  return CGPA !== null ? CGPA.toFixed(2) : "—";
}

function SortButton({
  label,
  direction,
  onToggle,
}: {
  label: string;
  direction: SortDirection;
  onToggle: () => void;
}) {
  const Icon =
    direction === "desc"
      ? ArrowDown
      : direction === "asc"
        ? ArrowUp
        : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Sort by ${label}`}
      className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {label}
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}

/** The label/value pairs revealed by the row chevron. */
function DetailPanel({ application }: { application: Application }) {
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
          {tutor.university || "—"}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Department</dt>
        <dd className="mt-0.5 font-medium break-words">
          {tutor.department || "—"}
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

export default function ApplicationsTable({ applications }: Props) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [jobSearch, setJobSearch] = useState("");
  const [entranceFilter, setEntranceFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [tutorStatusFilter, setTutorStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  /* The cutoff is captured when the filter is chosen. Calling `Date.now()`
     during render is impure and makes results drift between renders. */
  const [timeCutoff, setTimeCutoff] = useState<number | null>(null);

  const [entranceSort, setEntranceSort] = useState<SortDirection>("desc");
  const [timeSort, setTimeSort] = useState<SortDirection>(null);

  function changeTimeFilter(value: string) {
    setTimeFilter(value);
    setPage(1);

    const hours = TIME_FILTER_HOURS[value];

    setTimeCutoff(hours ? Date.now() - hours * 60 * 60 * 1000 : null);
  }

  function toggleEntranceSort() {
    setEntranceSort((current) => {
      if (current === null) return "desc";
      if (current === "desc") return "asc";
      return null;
    });
  }

  function toggleTimeSort() {
    setTimeSort((current) => {
      if (current === null) return "desc";
      if (current === "desc") return "asc";
      return null;
    });
  }

  function clearFilters() {
    setStatusFilter("ALL");
    setJobSearch("");
    setEntranceFilter("ALL");
    setTutorStatusFilter("ALL");
    changeTimeFilter("ALL");
    setPage(1);
  }

  const hasFilters =
    statusFilter !== "ALL" ||
    Boolean(jobSearch.trim()) ||
    entranceFilter !== "ALL" ||
    timeFilter !== "ALL" ||
    tutorStatusFilter !== "ALL";

  /** Tab counts stay on the full set so they don't move as you filter. */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: applications.length,
      PENDING: 0,
      REVIEWED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };

    for (const application of applications) {
      counts[application.status] += 1;
    }

    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    let result = [...applications];

    if (statusFilter !== "ALL") {
      result = result.filter(
        (application) => application.status === statusFilter
      );
    }

    const search = jobSearch.trim().toLowerCase();

    if (search) {
      result = result.filter((application) =>
        `${application.job.jobCode} ${application.tutor.fullName}`
          .toLowerCase()
          .includes(search)
      );
    }

    if (entranceFilter !== "ALL") {
      const minimum = Number(entranceFilter);

      result = result.filter(
        (application) => application.tutor.entrancePercentage >= minimum
      );
    }

    if (timeCutoff !== null) {
      result = result.filter(
        (application) =>
          new Date(application.createdAt).getTime() >= timeCutoff
      );
    }

    if (tutorStatusFilter !== "ALL") {
      result = result.filter(
        (application) => application.tutor.tutorStatus === tutorStatusFilter
      );
    }

    /*
     * Entrance has priority when selected; time is the secondary sort.
     * Entrance ↓ + Time ↓ = highest entrance first, newest first within ties.
     */
    result.sort((a, b) => {
      if (entranceSort) {
        const entranceDifference =
          a.tutor.entrancePercentage - b.tutor.entrancePercentage;

        if (entranceDifference !== 0) {
          return entranceSort === "desc"
            ? -entranceDifference
            : entranceDifference;
        }
      }

      if (timeSort) {
        const timeDifference =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

        if (timeDifference !== 0) {
          return timeSort === "desc" ? -timeDifference : timeDifference;
        }
      }

      return 0;
    });

    return result;
  }, [
    applications,
    statusFilter,
    jobSearch,
    entranceFilter,
    timeCutoff,
    tutorStatusFilter,
    entranceSort,
    timeSort,
  ]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredApplications.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, pageCount);

  const visibleApplications = filteredApplications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function rowActionsFor(application: Application) {
    /* Both mirror the API guards: the assign route and the status route each
       refuse a closed job and a job that already has an assigned tutor. */
    const jobIsActionable =
      application.job.status !== "CLOSED" &&
      !application.job.assignedTutorId;

    return (
      <ApplicationRowActions
        applicationId={application.id}
        status={application.status}
        tutorName={application.tutor.fullName}
        tutorPhone={application.tutor.phone}
        jobCode={application.job.jobCode}
        canAssign={jobIsActionable && application.status !== "ACCEPTED"}
        canChangeStatus={jobIsActionable}
      />
    );
  }

  const columns: DataTableColumn<Application>[] = [
    {
      id: "tutor",
      header: "Tutor",
      mobileTitle: true,
      cellClassName: "whitespace-normal",
      cell: (application) => (
        <div className="min-w-0">
          <Link
            href={`/admin/applications/${application.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {application.tutor.fullName}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
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
            className="font-mono text-sm font-medium underline-offset-4 hover:underline"
          >
            {application.job.jobCode}
          </Link>
          <p className="mt-0.5 max-w-44 truncate text-xs text-muted-foreground">
            {application.job.subject} · {application.job.grade}
          </p>
        </div>
      ),
    },
    {
      id: "entrance",
      header: (
        <SortButton
          label="Entrance"
          direction={entranceSort}
          onToggle={toggleEntranceSort}
        />
      ),
      cellClassName: "tabular-nums font-medium",
      cell: (application) => `${application.tutor.entrancePercentage.toFixed(1)}%`,
    },
    {
      id: "gpa",
      header: "GPA",
      cellClassName: "tabular-nums",
      cell: (application) => formatGPA(application),
    },
    {
      id: "applied",
      header: (
        <SortButton
          label="Applied"
          direction={timeSort}
          onToggle={toggleTimeSort}
        />
      ),
      /* The compact date keeps the column narrow; the tooltip carries the
         exact time the old `formatDateTime` column used to spend width on. */
      cell: (application) => (
        <Tooltip>
          <TooltipTrigger
            render={<span className="cursor-default text-muted-foreground" />}
          >
            {formatDate(application.createdAt)}
          </TooltipTrigger>

          <TooltipContent>
            {formatDateTime(application.createdAt)}
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (application) => <StatusBadge status={application.status} />,
    },
    {
      id: "actions",
      header: "",
      hideOnMobile: true,
      headClassName: "w-px",
      cellClassName: "text-right",
      cell: rowActionsFor,
    },
  ];

  return (
    <div className="space-y-4">
      {/* -----------------------------------------------------
          STATUS TABS
      ----------------------------------------------------- */}
      <Tabs
        value={statusFilter}
        onValueChange={(value) => {
          setStatusFilter((value as string) ?? "ALL");
          setPage(1);
        }}
      >
        {/* `justify-start`: a centred row that overflows spills off both
            edges, and the part past the left edge can never be scrolled to. */}
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <span className="text-xs text-muted-foreground tabular-nums">
                {statusCounts[tab.value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* -----------------------------------------------------
          FILTER BAR
      ----------------------------------------------------- */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              type="search"
              value={jobSearch}
              onChange={(event) => {
                setJobSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search job code or tutor name"
              aria-label="Search applications"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:shrink-0">
            <FilterSelect
              label="Entrance percentage"
              options={ENTRANCE_OPTIONS}
              value={entranceFilter}
              onChange={(value) => {
                setEntranceFilter(value);
                setPage(1);
              }}
            />

            <FilterSelect
              label="Applied within"
              options={TIME_OPTIONS}
              value={timeFilter}
              onChange={changeTimeFilter}
            />

            <FilterSelect
              label="Tutor type"
              options={TUTOR_STATUS_OPTIONS}
              value={tutorStatusFilter}
              onChange={(value) => {
                setTutorStatusFilter(value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {hasFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              {filteredApplications.length} of {applications.length} shown
            </p>

            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X data-icon="inline-start" aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>

      {/* -----------------------------------------------------
          TABLE
      ----------------------------------------------------- */}
      <DataTable
        items={visibleApplications}
        columns={columns}
        getRowKey={(application) => application.id}
        caption="Tutor applications"
        renderExpanded={(application) => (
          <DetailPanel application={application} />
        )}
        getExpandLabel={(application) =>
          `Show more details for ${application.tutor.fullName}`
        }
        renderMobileCard={(application) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/applications/${application.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {application.tutor.fullName}
                </Link>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {application.job.jobCode} · {application.job.subject}
                </p>
              </div>

              <StatusBadge status={application.status} />
            </div>

            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
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

              <div>
                <dt className="text-xs text-muted-foreground">Applied</dt>
                <dd className="font-medium">
                  {formatDate(application.createdAt)}
                </dd>
              </div>
            </dl>

            <ExpandableDisclosure>
              <DetailPanel application={application} />
            </ExpandableDisclosure>

            <div className="border-t pt-3">{rowActionsFor(application)}</div>
          </div>
        )}
        empty={
          <EmptyState
            icon={hasFilters ? <Search /> : <FileText />}
            title={
              hasFilters ? "No matching applications" : "No applications yet"
            }
            description={
              hasFilters
                ? "No applications match the current filters."
                : "Applications will appear here as tutors apply to open jobs."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="lg" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      />

      {/* -----------------------------------------------------
          PAGINATION
      ----------------------------------------------------- */}
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {pageCount}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft data-icon="inline-start" aria-hidden="true" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="lg"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
              <ChevronRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      items={options as { value: string; label: string }[]}
      value={value}
      onValueChange={(next) => onChange((next as string) ?? "ALL")}
    >
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
