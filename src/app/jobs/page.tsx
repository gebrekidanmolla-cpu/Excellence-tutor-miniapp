"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  RotateCw,
  Search,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatSalary } from "@/lib/format";

type Job = {
  id: string;
  jobCode: string;
  gender: "MALE" | "FEMALE" | "ANY";
  grade: string;
  subject: string;
  place: string;
  salary: number;
  status: "OPEN" | "CLOSED";
  createdAt: string;
};

/** `ANY` reads as "Any Tutor" here rather than the raw enum. */
function formatTutorRequirement(gender: Job["gender"]): string {
  switch (gender) {
    case "MALE":
      return "Male Tutor";
    case "FEMALE":
      return "Female Tutor";
    default:
      return "Any Tutor";
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  /* Bumping this re-runs the effect; the retry button drives it. */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /* Every state update happens after an await: setting state synchronously
       inside an effect causes a cascading re-render. */
    async function run() {
      try {
        const response = await fetch("/api/jobs?status=OPEN", {
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

  /* Client-side only: the endpoint returns every open job, and filtering here
     avoids a round trip per keystroke. */
  const visibleJobs = useMemo(() => {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Available jobs"
        description={
          loading
            ? "Loading opportunities…"
            : `${jobs.length} ${
                jobs.length === 1 ? "opportunity" : "opportunities"
              } currently accepting applications`
        }
      />

      {!loading && !error && jobs.length > 0 ? (
        <div className="relative max-w-sm">
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
            className="pl-9"
          />
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
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
          title="No open positions"
          description="There are currently no tutoring opportunities accepting applications. Please check again later."
          action={
            <Button render={<Link href="/tutor" />} size="lg">
              <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
              Back to dashboard
            </Button>
          }
        />
      ) : null}

      {!loading && !error && jobs.length > 0 && visibleJobs.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No matching jobs"
          description={`Nothing matches “${query}”. Try a different subject, grade or place.`}
          action={
            <Button variant="outline" size="lg" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : null}

      {!loading && !error && visibleJobs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-lg hover:shadow-primary/5 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50">
      <div className="flex items-start justify-between gap-3 border-b p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Job code
          </p>

          <h2 className="mt-0.5 truncate font-heading text-lg font-semibold">
            {job.jobCode}
          </h2>
        </div>

        <StatusBadge status={job.status} />
      </div>

      <div className="flex-1 space-y-4 p-5">
        <JobDetail
          icon={<BookOpen />}
          label="Subject"
          value={job.subject}
        />
        <JobDetail
          icon={<GraduationCap />}
          label="Grade"
          value={job.grade}
        />
        <JobDetail icon={<MapPin />} label="Place" value={job.place} />
        <JobDetail
          icon={<Users />}
          label="Tutor requirement"
          value={formatTutorRequirement(job.gender)}
        />
        <JobDetail
          icon={<CalendarDays />}
          label="Posted"
          value={formatDate(job.createdAt)}
        />

        <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Wallet className="size-4.5" />
          </span>

          <div>
            <p className="text-xs text-muted-foreground">Monthly salary</p>
            <p className="font-heading text-base font-semibold">
              {formatSalary(job.salary)}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t p-4">
        <Button
          render={<Link href={`/jobs/${job.jobCode}`} />}
          size="xl"
          className="w-full"
        >
          View details
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

function JobDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-4"
      >
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
