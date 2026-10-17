"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock,
  LayoutDashboard,
  Lock,
  MapPin,
  Megaphone,
  RotateCw,
  Search,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate, formatSalary } from "@/lib/format";
import { cn } from "@/lib/utils";

type Job = {
  id: string;
  jobCode: string;
  gender: "MALE" | "FEMALE" | "ANY";
  grade: string;
  subject: string;
  place: string;
  salary: number;
  daysPerWeek: number;
  hoursPerDay: number;
  status: "OPEN" | "CLOSED";
  additionalDetails: string | null;
  createdAt: string;
};

type Filter = "OPEN" | "CLOSED";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

/* =========================================================
   WORDING — the admin form takes these as free text, and
   the common values ("All", "8", "4 & 6") don't explain
   themselves on a card.
========================================================= */

/** "All" (the most common value) means every subject. */
function formatSubject(subject: string): string {
  return subject.trim().replace(/^all\b(?!\s+subjects?\b)/i, "All subjects");
}

/** "8" or "4 & 6" become "Grade 8" / "Grades 4 & 6"; "Kg 3", "Adult level" stay as typed. */
function formatGrade(grade: string): string {
  const value = grade.trim();

  if (!/^\d/.test(value)) {
    return value;
  }

  return `${/[&,]/.test(value) ? "Grades" : "Grade"} ${value}`;
}

/** "3 days a week · 2 hours a day". */
function formatSchedule(job: Job): string | null {
  if (!job.daysPerWeek || !job.hoursPerDay) {
    return null;
  }

  const hours = Number(job.hoursPerDay.toFixed(2));

  return `${job.daysPerWeek} ${job.daysPerWeek === 1 ? "day" : "days"} a week · ${hours} ${
    hours === 1 ? "hour" : "hours"
  } a day`;
}

function formatTutorRequirement(gender: Job["gender"]): string {
  switch (gender) {
    case "MALE":
      return "Male tutor only";
    case "FEMALE":
      return "Female tutor only";
    default:
      return "Male or female tutor";
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  /* Open first: those are the jobs a tutor can act on. */
  const [filter, setFilter] = useState<Filter>("OPEN");

  /* Bumping this re-runs the effect; the retry button drives it. */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /* Every state update happens after an await: setting state synchronously
       inside an effect causes a cascading re-render. */
    async function run() {
      try {
        /* No `status` param: the endpoint then returns open and closed jobs,
           newest first, and the tabs below split them client-side. */
        const response = await fetch("/api/jobs", {
          cache: "no-store",
        });

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(result.message || "Failed to load jobs.");
        }

        setJobs(result.jobs ?? []);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load jobs."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  }

  /* Search narrows first, so each tab's count reflects the current search.
     It matches what the card shows ("All subjects", "Grade 8") as well as
     what was typed into the admin form. */
  const searchedJobs = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return jobs;
    }

    return jobs.filter((job) =>
      [
        job.jobCode,
        formatSubject(job.subject),
        formatGrade(job.grade),
        job.place,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [jobs, query]);

  const counts = useMemo(
    () => ({
      OPEN: searchedJobs.filter((job) => job.status === "OPEN").length,
      CLOSED: searchedJobs.filter((job) => job.status === "CLOSED").length,
    }),
    [searchedJobs]
  );

  /* The API's newest-first order is kept within each tab. */
  const visibleJobs = useMemo(
    () => searchedJobs.filter((job) => job.status === filter),
    [searchedJobs, filter]
  );

  const otherFilter: Filter = filter === "OPEN" ? "CLOSED" : "OPEN";
  const openTotal = jobs.filter((job) => job.status === "OPEN").length;
  const hasJobs = !loading && !error && jobs.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Available jobs"
        description={
          loading ? (
            "Loading jobs…"
          ) : error ? (
            "Tutoring jobs from Excellence Tutor."
          ) : (
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  openTotal > 0 ? "bg-success" : "bg-muted-foreground/50"
                )}
              />
              {openTotal === 0
                ? "No jobs are open right now"
                : `${openTotal} ${openTotal === 1 ? "job is" : "jobs are"} open for applications`}
            </span>
          )
        }
      />

      {hasJobs ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-2 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter((value as Filter) ?? "OPEN")}
          >
            <TabsList className="h-10! w-full sm:w-fit">
              {FILTERS.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="px-3 sm:px-5"
                >
                  {option.label}
                  <span className="rounded-full bg-foreground/5 px-1.5 text-xs text-muted-foreground tabular-nums">
                    {counts[option.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Wide enough on desktop for the whole placeholder. */}
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              type="search"
              size="xl"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subject, grade, place or code"
              aria-label="Search jobs"
              className="border-transparent bg-muted/60 pr-9 pl-9 focus-visible:bg-background [&::-webkit-search-cancel-button]:hidden"
            />

            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-14 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <ErrorState
          title="Could not load jobs"
          description={error}
          action={
            <Button onClick={retry} size="lg">
              <RotateCw data-icon="inline-start" aria-hidden="true" />
              Try again
            </Button>
          }
        />
      ) : null}

      {!loading && !error && jobs.length === 0 ? (
        <EmptyState
          icon={<BriefcaseBusiness />}
          title="No jobs yet"
          description="There are no tutoring jobs posted yet. Please check again later."
          action={
            <Button render={<Link href="/tutor" prefetch={false} />} size="lg">
              <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
              Back to dashboard
            </Button>
          }
        />
      ) : null}

      {hasJobs && visibleJobs.length === 0 ? (
        query.trim() ? (
          <EmptyState
            icon={<Search />}
            title={`No ${filter.toLowerCase()} jobs match`}
            description={
              counts[otherFilter] > 0
                ? `Nothing ${filter.toLowerCase()} matches “${query}”, but ${counts[otherFilter]} ${otherFilter.toLowerCase()} ${
                    counts[otherFilter] === 1 ? "job does" : "jobs do"
                  }.`
                : `Nothing matches “${query}”. Try a different subject, grade or place.`
            }
            action={
              counts[otherFilter] > 0 ? (
                <Button variant="outline" size="lg" onClick={() => setFilter(otherFilter)}>
                  Show {otherFilter.toLowerCase()} jobs
                </Button>
              ) : (
                <Button variant="outline" size="lg" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              )
            }
          />
        ) : filter === "OPEN" ? (
          <EmptyState
            icon={<BriefcaseBusiness />}
            title="No open jobs right now"
            description="Nothing is accepting applications at the moment. New jobs are posted regularly, so check back soon."
            action={
              <Button render={<Link href="/tutor" prefetch={false} />} variant="outline" size="lg">
                <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
                Back to dashboard
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<BriefcaseBusiness />}
            title="No closed jobs"
            description="Every job listed is still accepting applications."
            action={
              <Button variant="outline" size="lg" onClick={() => setFilter("OPEN")}>
                Show open jobs
              </Button>
            }
          />
        )
      ) : null}

      {hasJobs && visibleJobs.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleJobs.map((job) => (
            <li key={job.id} className="flex min-w-0">
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * One job, laid out in the order a tutor decides on it: what they would
 * teach, what it pays, where, when and for whom, anything extra the family
 * asked for, and last the reference details. Open is the default tab, so
 * only a closed job carries a status badge.
 */
function JobCard({ job }: { job: Job }) {
  const isOpen = job.status === "OPEN";
  const schedule = formatSchedule(job);

  return (
    <article
      className={cn(
        "group relative flex w-full flex-col rounded-2xl p-5 ring-1 ring-foreground/10 transition-all has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50",
        isOpen
          ? "bg-card hover:-translate-y-0.5 hover:shadow-xl hover:shadow-glow/5 hover:ring-primary/25 motion-reduce:hover:translate-y-0"
          : "bg-muted/30"
      )}
    >
      {/* What they would teach */}
      <div className="flex items-start justify-between gap-3">
        <h2
          className={cn(
            "line-clamp-2 font-heading text-lg leading-snug font-semibold text-balance",
            !isOpen && "text-foreground/70"
          )}
        >
          {/* Stretched link: the whole card is the click target, while the
              accessible name stays the subject rather than the card text. */}
          <Link
            href={`/apply/${job.jobCode}`}
            prefetch={false}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {formatSubject(job.subject)}
          </Link>
        </h2>

        {!isOpen ? (
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-foreground/10 px-2.5 text-xs font-medium text-foreground/70">
            <Lock className="size-3" aria-hidden="true" />
            Closed
          </span>
        ) : null}
      </div>

      <p className="mt-0.5 text-sm font-medium text-muted-foreground">
        {formatGrade(job.grade)}
      </p>

      {/* What it pays */}
      <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            "font-heading text-2xl font-semibold tabular-nums",
            isOpen ? "text-primary" : "text-foreground/60"
          )}
        >
          {formatSalary(job.salary)}
        </span>
        <span className="text-sm text-muted-foreground">per month</span>
      </p>

      {/* Where, when and for whom */}
      <dl className="mt-4 space-y-2 text-sm">
        {job.place.trim() ? (
          <Fact icon={<MapPin />} label="Place">
            {job.place}
          </Fact>
        ) : null}
        {schedule ? (
          <Fact icon={<Clock />} label="Schedule">
            {schedule}
          </Fact>
        ) : null}
        <Fact icon={<Users />} label="Tutor">
          {formatTutorRequirement(job.gender)}
        </Fact>
      </dl>

      {/* Anything extra the family asked for */}
      {job.additionalDetails?.trim() ? (
        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-lg px-3 py-2",
            isOpen ? "bg-highlight/10" : "bg-muted"
          )}
        >
          <Megaphone
            className={cn(
              "mt-0.5 size-4 shrink-0",
              isOpen ? "text-highlight-strong" : "text-muted-foreground"
            )}
            aria-hidden="true"
          />
          <p
            className={cn(
              "line-clamp-2 min-w-0 flex-1 text-sm whitespace-pre-line wrap-break-word",
              isOpen ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {job.additionalDetails.trim()}
          </p>
        </div>
      ) : null}

      {/* Pushes the footer down so it lines up across a row of cards. */}
      <div aria-hidden="true" className="min-h-4 flex-1" />

      {/* Reference details */}
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          <span className="font-mono">{job.jobCode}</span>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          Posted {formatDate(job.createdAt)}
        </p>

        <span
          aria-hidden="true"
          className={cn(
            "flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-medium transition-colors",
            isOpen
              ? "bg-primary text-primary-foreground group-hover:bg-primary/90"
              : "bg-card text-muted-foreground ring-1 ring-foreground/10 group-hover:text-foreground"
          )}
        >
          {isOpen ? "Apply" : "View"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </span>
      </div>
    </article>
  );
}

/** A label/value row: the icon carries the label visually, the `dt` for screen readers. */
function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <dt className="flex h-5 shrink-0 items-center text-muted-foreground [&>svg]:size-4">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 wrap-break-word">{children}</dd>
    </div>
  );
}
