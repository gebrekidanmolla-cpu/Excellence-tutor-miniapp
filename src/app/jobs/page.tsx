"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  MapPin,
  Users,
} from "lucide-react";

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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/jobs?status=OPEN", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Failed to load jobs."
          );
        }

        setJobs(result.jobs ?? []);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load jobs."
        );
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      {/* Header */}

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600">
              <BriefcaseBusiness size={15} />
              Available Opportunities
            </div>

            <h1 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Find your next
              <span className="block text-gray-400">
                teaching opportunity.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
              Browse tutoring positions currently accepting
              applications and find an opportunity that matches
              your qualifications.
            </p>
          </div>
        </div>
      </section>

      {/* Jobs */}

      <section className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-900">
            Open Positions
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? "Loading opportunities..."
              : `${jobs.length} ${
                  jobs.length === 1
                    ? "opportunity"
                    : "opportunities"
                } currently available`}
          </p>
        </div>

        {/* Error */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}

        {loading && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-82.5 animate-pulse rounded-2xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        )}

        {/* Empty */}

        {!loading && !error && jobs.length === 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <BriefcaseBusiness size={25} />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              No open positions
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              There are currently no tutoring opportunities
              accepting applications. Please check again later.
            </p>

            <Link
              href="/tutor"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Jobs */}

        {!loading && !error && jobs.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50">
      {/* Top */}

      <div className="border-b border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
            <BookOpen size={21} />
          </div>

          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            Open
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
            Job Code
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight">
            {job.jobCode}
          </h2>
        </div>
      </div>

      {/* Details */}

      <div className="flex-1 p-6">
        <div className="space-y-4">
          <JobDetail
            icon={<GraduationCap size={17} />}
            label="Grade"
            value={job.grade}
          />

          <JobDetail
            icon={<BookOpen size={17} />}
            label="Subject"
            value={job.subject}
          />

          <JobDetail
            icon={<MapPin size={17} />}
            label="Place"
            value={job.place}
          />

          <JobDetail
            icon={<Users size={17} />}
            label="Tutor Requirement"
            value={formatGender(job.gender)}
          />

          <JobDetail
            icon={<CalendarDays size={17} />}
            label="Posted"
            value={formatDate(job.createdAt)}
          />
        </div>

        {/* Salary */}

        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">
            Monthly Salary
          </p>

          <p className="mt-1 text-xl font-bold">
            {job.salary.toLocaleString()} ETB
          </p>
        </div>
      </div>

      {/* Action */}

      <div className="border-t border-gray-100 p-4">
        <Link
          href={`/jobs/${job.jobCode}`}
          className="group/button flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          View Details
          <ArrowRight
            size={16}
            className="transition-transform group-hover/button:translate-x-1"
          />
        </Link>
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-400">
          {label}
        </p>

        <p className="truncate text-sm font-semibold text-gray-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatGender(
  gender: Job["gender"]
) {
  switch (gender) {
    case "MALE":
      return "Male Tutor";

    case "FEMALE":
      return "Female Tutor";

    default:
      return "Any Tutor";
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}