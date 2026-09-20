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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { formatDateTime, formatEnum } from "@/lib/format";
import ApplicationStatusSelect from "./ApplicationStatusSelect";
import AssignTutorButton from "./AssignTutorButton";

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

export default function ApplicationsTable({ applications }: Props) {
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
    setJobSearch("");
    setEntranceFilter("ALL");
    setTutorStatusFilter("ALL");
    changeTimeFilter("ALL");
    setPage(1);
  }

  const hasFilters =
    Boolean(jobSearch.trim()) ||
    entranceFilter !== "ALL" ||
    timeFilter !== "ALL" ||
    tutorStatusFilter !== "ALL";

  const filteredApplications = useMemo(() => {
    let result = [...applications];

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

  function actionsFor(application: Application) {
    const jobIsClosed = application.job.status === "CLOSED";
    const hasAssignedTutor = Boolean(application.job.assignedTutorId);
    const isAccepted = application.status === "ACCEPTED";
    const canAssign = !jobIsClosed && !hasAssignedTutor && !isAccepted;

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          render={<Link href={`/admin/applications/${application.id}`} />}
          variant="outline"
          size="sm"
        >
          View
        </Button>

        {canAssign ? (
          <AssignTutorButton
            applicationId={application.id}
            tutorName={application.tutor.fullName}
            jobCode={application.job.jobCode}
          />
        ) : null}

        {isAccepted ? (
          <span className="text-xs font-medium text-muted-foreground">
            Assigned
          </span>
        ) : null}

        {jobIsClosed && !isAccepted ? (
          <span className="text-xs text-muted-foreground">Closed</span>
        ) : null}
      </div>
    );
  }

  const columns: DataTableColumn<Application>[] = [
    {
      id: "name",
      header: "Name",
      mobileTitle: true,
      cell: (application) => (
        <div className="min-w-0">
          <Link
            href={`/admin/applications/${application.id}`}
            className="truncate font-medium text-primary underline-offset-4 hover:underline"
          >
            {application.tutor.fullName}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {application.job.jobCode}
          </p>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: (application) => (
        <CopyButton
          value={application.tutor.phone}
          variant="ghost"
          size="sm"
          successMessage="Phone number copied"
          className="-ml-2 font-normal"
        >
          {application.tutor.phone}
        </CopyButton>
      ),
    },
    {
      id: "gender",
      header: "Gender",
      cell: (application) => formatEnum(application.tutor.gender),
    },
    {
      id: "university",
      header: "University",
      cell: (application) => (
        <span className="block max-w-40 truncate">
          {application.tutor.university || "—"}
        </span>
      ),
    },
    {
      id: "department",
      header: "Department",
      cell: (application) => (
        <span className="block max-w-40 truncate">
          {application.tutor.department || "—"}
        </span>
      ),
    },
    {
      id: "gpa",
      header: "GPA / CGPA",
      cellClassName: "tabular-nums",
      cell: (application) => formatGPA(application),
    },
    {
      id: "entrance",
      header: (
        <SortButton
          label="Entrance %"
          direction={entranceSort}
          onToggle={toggleEntranceSort}
        />
      ),
      cellClassName: "tabular-nums",
      cell: (application) => (
        <div>
          <span className="font-medium">
            {application.tutor.entrancePercentage.toFixed(1)}%
          </span>
          <span className="ml-1.5 text-xs text-muted-foreground">
            {application.tutor.entranceScore}/
            {application.tutor.entranceTotal}
          </span>
        </div>
      ),
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
      cell: (application) => formatDateTime(application.createdAt),
    },
    {
      id: "tutorStatus",
      header: "Tutor",
      cell: (application) => formatEnum(application.tutor.tutorStatus),
    },
    {
      id: "status",
      header: "Status",
      cell: (application) => (
        <ApplicationStatusSelect
          applicationId={application.id}
          initialStatus={application.status}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      hideOnMobile: true,
      headClassName: "text-right",
      cellClassName: "text-right",
      cell: actionsFor,
    },
  ];

  return (
    <div className="space-y-4">
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

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Entrance</dt>
                <dd className="font-medium tabular-nums">
                  {application.tutor.entrancePercentage.toFixed(1)}%
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted-foreground">GPA / CGPA</dt>
                <dd className="font-medium tabular-nums">
                  {formatGPA(application)}
                </dd>
              </div>

              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">University</dt>
                <dd className="truncate font-medium">
                  {application.tutor.university || "—"}
                </dd>
              </div>

              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Applied</dt>
                <dd className="font-medium">
                  {formatDateTime(application.createdAt)}
                </dd>
              </div>
            </dl>

            <CopyButton
              value={application.tutor.phone}
              variant="outline"
              size="sm"
              successMessage="Phone number copied"
              className="w-full"
            >
              {application.tutor.phone}
            </CopyButton>

            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <ApplicationStatusSelect
                applicationId={application.id}
                initialStatus={application.status}
              />

              {actionsFor(application)}
            </div>
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
