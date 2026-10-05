"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
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
  status: "OPEN" | "CLOSED";
  additionalDetails: string | null;
  createdAt: string;
};

type Filter = "ALL" | "OPEN" | "CLOSED";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

/** `ANY` reads as "Male/Female" here rather than the raw enum. */
function formatTutorRequirement(gender: Job["gender"]): string {
  switch (gender) {
    case "MALE":
      return "Male";
    case "FEMALE":
      return "Female";
    default:
      return "Male/Female";
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

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

  /* Search narrows first, so each tab's count reflects the current search. */
  const searchedJobs = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return jobs;
    }

    return jobs.filter((job) =>
      [job.jobCode, job.subject, job.grade, job.place]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [jobs, query]);

  const counts = useMemo(
    () => ({
      ALL: searchedJobs.length,
      OPEN: searchedJobs.filter((job) => job.status === "OPEN").length,
      CLOSED: searchedJobs.filter((job) => job.status === "CLOSED").length,
    }),
    [searchedJobs]
  );

  /* Under "All", open jobs lead: they are the ones a tutor can act on. The
     sort is stable, so each group keeps the API's newest-first order. */
  const visibleJobs = useMemo(() => {
    if (filter !== "ALL") {
      return searchedJobs.filter((job) => job.status === filter);
    }

    return [...searchedJobs].sort(
      (a, b) => Number(b.status === "OPEN") - Number(a.status === "OPEN")
    );
  }, [searchedJobs, filter]);

  const openTotal = jobs.filter((job) => job.status === "OPEN").length;
  const hasJobs = !loading && !error && jobs.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description={
          loading ? (
            "Loading opportunities…"
          ) : error ? (
            "Browse tutoring opportunities from Excellence Tutor."
          ) : (
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="relative flex size-2 shrink-0"
              >
                {openTotal > 0 ? (
                  <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
                ) : null}
                <span
                  className={cn(
                    "relative size-2 rounded-full",
                    openTotal > 0 ? "bg-success" : "bg-muted-foreground/50"
                  )}
                />
              </span>
              {openTotal} {openTotal === 1 ? "job is" : "jobs are"} accepting
              applications · {jobs.length} total
            </span>
          )
        }
      />

      {hasJobs ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-2 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter((value as Filter) ?? "ALL")}
          >
            <TabsList className="h-10! w-full sm:w-fit">
              {FILTERS.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="px-3 sm:px-4"
                >
                  {option.label}
                  <span className="rounded-full bg-foreground/5 px-1.5 text-xs text-muted-foreground tabular-nums">
                    {counts[option.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:max-w-xs">
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
              <Skeleton key={index} className="h-64 rounded-2xl" />
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
          description="There are no tutoring opportunities posted yet. Please check again later."
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
            title="No matching jobs"
            description={`Nothing ${
              filter === "ALL" ? "" : `${filter.toLowerCase()} `
            }matches “${query}”. Try a different subject, grade or place.`}
            action={
              <Button variant="outline" size="lg" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<BriefcaseBusiness />}
            title={filter === "OPEN" ? "No open positions" : "No closed jobs"}
            description={
              filter === "OPEN"
                ? "Nothing is accepting applications right now. New jobs are posted regularly — check back soon."
                : "Every job listed is still accepting applications."
            }
            action={
              <Button
                variant="outline"
                size="lg"
                onClick={() => setFilter("ALL")}
              >
                Show all jobs
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

function JobCard({ job }: { job: Job }) {
  const isOpen = job.status === "OPEN";

  return (
    <article
      className={cn(
        "group relative flex w-full flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-all has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50",
        isOpen
          ? "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5 hover:ring-primary/25 motion-reduce:hover:translate-y-0"
          : "bg-muted/30"
      )}
    >
      {/* Status accent along the top edge, readable at a glance from across
          the grid; the pill below carries the same state in words. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-5 top-0 h-1 rounded-b-full",
          isOpen ? "bg-success" : "bg-muted-foreground/40"
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-wide text-muted-foreground">
            {job.jobCode}
          </p>

          <h2
            className={cn(
              "mt-1 line-clamp-2 font-heading text-lg leading-snug font-semibold text-balance",
              !isOpen && "text-foreground/70"
            )}
          >
            {/* Stretched link: the whole card is the click target, while the
                accessible name stays the subject rather than the card text. */}
            <Link
              href={`/apply/${job.jobCode}`} prefetch={false}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {job.subject}
            </Link>
          </h2>
        </div>

        <JobStatusPill isOpen={isOpen} />
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5 text-xs">
        <Chip icon={<GraduationCap />} label="Grade">
          {job.grade}
        </Chip>
        <Chip icon={<MapPin />} label="Place">
          {job.place}
        </Chip>
        <Chip icon={<Users />} label="Gender">
          {formatTutorRequirement(job.gender)}
        </Chip>
      </ul>

      {job.additionalDetails ? (
        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-xl p-3 ring-1",
            isOpen
              ? "bg-highlight/10 ring-highlight/25"
              : "bg-muted ring-transparent"
          )}
        >
          <Megaphone
            className={cn(
              "mt-0.5 size-4 shrink-0",
              isOpen ? "text-highlight-foreground" : "text-muted-foreground"
            )}
            aria-hidden="true"
          />

          <p
            className={cn(
              "line-clamp-3 min-w-0 flex-1 text-sm font-medium text-pretty wrap-break-word",
              isOpen ? "text-highlight-foreground" : "text-muted-foreground"
            )}
          >
            {job.additionalDetails}
          </p>
        </div>
      ) : null}

      {/* Pushes the footer down so salaries line up across a row of cards. */}
      <div aria-hidden="true" className="min-h-4 flex-1" />

      <div className="flex items-end justify-between gap-3 border-t border-dashed pt-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Monthly salary</p>
          <p
            className={cn(
              "font-heading text-xl font-semibold tabular-nums",
              isOpen ? "text-primary" : "text-foreground/60"
            )}
          >
            {formatSalary(job.salary)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Posted {formatDate(job.createdAt)}
          </p>
        </div>

        <span
          aria-hidden="true"
          className={cn(
            "flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-medium transition-colors",
            isOpen
              ? "bg-primary text-primary-foreground group-hover:bg-primary/90"
              : "bg-background text-muted-foreground ring-1 ring-foreground/10 group-hover:text-foreground"
          )}
        >
          {isOpen ? "Apply" : "View"}
          <ArrowUpRight
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
          />
        </span>
      </div>
    </article>
  );
}

/**
 * Solid rather than tinted, unlike the shared `StatusBadge`: on this page the
 * state decides whether a tutor can act, so it has to win against the card.
 * The green is darkened so white text clears AA on it.
 */
function JobStatusPill({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tracking-wide uppercase",
        isOpen
          ? "bg-[color-mix(in_oklch,var(--success),var(--foreground)_30%)] text-white shadow-sm shadow-success/30"
          : "bg-foreground/10 text-foreground/70"
      )}
    >
      {isOpen ? (
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/70 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-white" />
        </span>
      ) : (
        <Lock className="size-3" aria-hidden="true" />
      )}
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}

function Chip({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
      {icon}
      <span className="truncate">
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="font-semibold text-foreground/90">{children}</span>
      </span>
    </li>
  );
}
