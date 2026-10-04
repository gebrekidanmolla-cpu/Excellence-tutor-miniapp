"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/EmptyState";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  ListToolbar,
  ShowMore,
  type FilterGroup,
} from "@/components/admin/ListToolbar";
import { ParentLinkButton } from "@/components/admin/ParentLinkButton";
import { TutorDocumentsMenu } from "@/components/admin/TutorDocumentsMenu";
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
import type { TutorRow } from "@/lib/admin-rows";
import { formatEnum } from "@/lib/format";
import { useListFilters } from "@/lib/use-list-filters";
import { cn } from "@/lib/utils";

/** Each filter's values; the first is the default and stays out of the URL. */
const FILTERS = {
  type: ["all", "student", "graduate"],
  assigned: ["any", "yes", "no"],
  date: DATE_RANGES,
  sort: ["newest", "oldest", "name", "entrance", "applications"],
} as const;

const SORT_LABELS: Record<(typeof FILTERS.sort)[number], string> = {
  newest: "Newest",
  oldest: "Oldest",
  name: "Name A–Z",
  entrance: "Best entrance",
  applications: "Most applications",
};

const SORTS: Record<
  (typeof FILTERS.sort)[number],
  (a: TutorRow, b: TutorRow) => number
> = {
  newest: byNewest,
  oldest: (a, b) => byNewest(b, a),
  name: (a, b) => a.fullName.localeCompare(b.fullName),
  entrance: (a, b) =>
    b.entrancePercentage - a.entrancePercentage || byNewest(a, b),
  applications: (a, b) =>
    b.applicationCount - a.applicationCount || byNewest(a, b),
};

function gpaOf(tutor: TutorRow): string {
  return tutor.gpa !== null ? tutor.gpa.toFixed(2) : "—";
}

/** The row's actions: the parent link, documents, and the rest in a menu. */
function TutorRowActions({
  tutor,
  linkBase,
  compact,
}: {
  tutor: TutorRow;
  linkBase: string;
  compact: boolean;
}) {
  /* A phone card gets 40px controls; a table row keeps them small. */
  const cardControl = compact ? undefined : "h-10 flex-1";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        compact ? "justify-end" : "gap-2"
      )}
    >
      <ParentLinkButton
        tutorId={tutor.id}
        tutorName={tutor.fullName}
        token={tutor.shareToken}
        linkBase={linkBase}
        compact={compact}
        className={cardControl}
      />

      <TutorDocumentsMenu
        tutorId={tutor.id}
        tutorName={tutor.fullName}
        documents={tutor.documents}
        compact={compact}
        className={cardControl}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size={compact ? "icon-sm" : "icon-lg"}
              aria-label={`More actions for ${tutor.fullName}`}
              className={compact ? undefined : "size-10"}
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            render={
              <Link href={`/admin/tutors/${tutor.id}`} prefetch={false} />
            }
          >
            <Eye aria-hidden="true" />
            View profile
          </DropdownMenuItem>

          <DropdownMenuItem
            render={
              <Link
                href={`/admin/tutors/${tutor.id}/edit`}
                prefetch={false}
              />
            }
          >
            <Pencil aria-hidden="true" />
            Edit tutor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Assignments({ tutor }: { tutor: TutorRow }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
      {plural(tutor.applicationCount, "application")}
      {tutor.assignedJobCount > 0 ? (
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-[color-mix(in_oklch,var(--success),var(--foreground)_35%)]">
          {tutor.assignedJobCount === 1
            ? "Assigned"
            : `${tutor.assignedJobCount} jobs`}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Every registered tutor, searched and filtered in the browser. This page
 * used to fetch `/api/admin/tutors` after it loaded and again, debounced, as
 * the admin typed — two invocations to open it and one more per pause in
 * typing. Now it is one server render and no requests after that.
 */
export default function TutorsList({
  tutors,
  linkBase,
  loadedAt,
}: {
  tutors: readonly TutorRow[];
  linkBase: string;
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
      tutors.map((tutor) => ({
        tutor,
        index: buildSearchIndex(
          [
            tutor.fullName,
            tutor.email,
            tutor.institution,
            tutor.field,
            tutor.exactPlace,
            tutor.location,
          ],
          [tutor.phone]
        ),
      })),
    [tutors]
  );

  /* Every filter except the type, so the type counts stay truthful. */
  const matching = searchable
    .filter(
      ({ tutor, index }) =>
        matchesSearch(index, deferredQuery) &&
        isWithinRange(tutor.createdAt, filters.date, loadedAt) &&
        (filters.assigned === "any" ||
          (filters.assigned === "yes") === tutor.assignedJobCount > 0)
    )
    .map(({ tutor }) => tutor);

  const typeCounts = countBy(matching, (tutor) => tutor.tutorStatus);

  const visible = (
    filters.type === "all"
      ? matching
      : matching.filter(
          (tutor) => tutor.tutorStatus === filters.type.toUpperCase()
        )
  ).sort(SORTS[filters.sort]);

  const rows = visible.slice(0, limit);

  const isFiltered = activeCount > 0;

  const primary: FilterGroup = {
    id: "type",
    label: "Tutor type",
    value: filters.type,
    options: [
      { value: "all", label: "All", count: matching.length },
      { value: "student", label: "Students", count: typeCounts.STUDENT ?? 0 },
      {
        value: "graduate",
        label: "Graduates",
        count: typeCounts.GRADUATE ?? 0,
      },
    ],
  };

  const groups: FilterGroup[] = [
    {
      id: "assigned",
      label: "Assigned",
      value: filters.assigned,
      options: [
        { value: "any", label: "Any" },
        { value: "yes", label: "On a job" },
        { value: "no", label: "Unassigned" },
      ],
    },
    {
      id: "date",
      label: "Joined",
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

  const columns: DataTableColumn<TutorRow>[] = [
    {
      id: "name",
      header: "Name",
      mobileTitle: true,
      cell: (tutor) => (
        <div className="min-w-0">
          <Link
            href={`/admin/tutors/${tutor.id}`}
            prefetch={false}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {tutor.fullName}
          </Link>
          <p className="mt-0.5 max-w-44 truncate text-xs text-muted-foreground">
            {tutor.email}
          </p>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: (tutor) => (
        <CopyButton
          value={tutor.phone}
          variant="ghost"
          size="sm"
          successMessage="Phone number copied"
          className="-ml-2 max-w-none font-normal tabular-nums"
        >
          {tutor.phone}
        </CopyButton>
      ),
    },
    {
      id: "education",
      header: "Education",
      cellClassName: "whitespace-normal",
      cell: (tutor) => (
        <div className="min-w-0">
          <p className="max-w-40 truncate">{tutor.institution || "—"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {formatEnum(tutor.tutorStatus)} · GPA {gpaOf(tutor)} ·{" "}
            {tutor.entrancePercentage.toFixed(1)}%
          </p>
        </div>
      ),
    },
    {
      id: "applications",
      header: "Applications",
      /* Lets the "Assigned" badge drop under the count instead of widening
         the table past a 1280px screen. */
      cellClassName: "whitespace-normal",
      cell: (tutor) => <Assignments tutor={tutor} />,
    },
    {
      id: "area",
      header: "Area",
      cellClassName: "whitespace-normal",
      cell: (tutor) => (
        <span className="block max-w-36 truncate">
          {tutor.exactPlace || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideOnMobile: true,
      headClassName: "w-px",
      cellClassName: "text-right",
      cell: (tutor) => (
        <TutorRowActions tutor={tutor} linkBase={linkBase} compact />
      ),
    },
  ];

  const total = tutors.length;

  return (
    <div className="space-y-4">
      <ListToolbar
        searchLabel="Search tutors"
        searchPlaceholder="Name, phone, area…"
        query={query}
        onQueryChange={setQuery}
        primary={primary}
        groups={groups}
        onFilterChange={(id, value) =>
          setFilter(id as keyof typeof FILTERS, value)
        }
        summary={
          isFiltered
            ? `${visible.length.toLocaleString("en-US")} of ${plural(total, "tutor")}`
            : `${plural(visible.length, "tutor")} registered`
        }
        resultLabel={`Show ${plural(visible.length, "tutor")}`}
        onClear={isFiltered ? clear : undefined}
      />

      <DataTable
        items={rows}
        columns={columns}
        getRowKey={(tutor) => tutor.id}
        caption="Registered tutors"
        breakpoint="xl"
        renderMobileCard={(tutor) => (
          <div className="flex h-full flex-col gap-3">
            <div className="min-w-0">
              <Link
                href={`/admin/tutors/${tutor.id}`}
                prefetch={false}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {tutor.fullName}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <a
                  href={`tel:${tutor.phone}`}
                  className="text-primary tabular-nums underline-offset-4 hover:underline"
                >
                  {tutor.phone}
                </a>
                {" · "}
                {formatEnum(tutor.tutorStatus)}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Entrance</dt>
                <dd className="font-medium tabular-nums">
                  {tutor.entrancePercentage.toFixed(1)}%
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted-foreground">GPA</dt>
                <dd className="font-medium tabular-nums">{gpaOf(tutor)}</dd>
              </div>

              <div className="col-span-2 min-w-0">
                <dt className="text-xs text-muted-foreground">Area</dt>
                <dd className="truncate font-medium">
                  {tutor.exactPlace || "—"}
                </dd>
              </div>

              <div className="col-span-2 min-w-0">
                <dt className="text-xs text-muted-foreground">Education</dt>
                <dd className="truncate font-medium">
                  {tutor.institution || "—"}
                  {tutor.field ? (
                    <span className="font-normal text-muted-foreground">
                      {" · "}
                      {tutor.field}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className="col-span-2">
                <dt className="sr-only">Applications</dt>
                <dd className="text-muted-foreground">
                  <Assignments tutor={tutor} />
                </dd>
              </div>
            </dl>

            <div className="mt-auto border-t pt-3">
              <TutorRowActions
                tutor={tutor}
                linkBase={linkBase}
                compact={false}
              />
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={isFiltered ? <Search /> : <Users />}
            title={isFiltered ? "No matching tutors" : "No tutors yet"}
            description={
              isFiltered
                ? "No tutors match the current search and filters."
                : "Registered tutors will appear here."
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
        noun="tutors"
        onShowMore={showMore}
      />
    </div>
  );
}
