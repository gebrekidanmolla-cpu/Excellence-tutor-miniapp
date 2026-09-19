"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  GraduationCap,
  UserRound,
  Users,
  Eye,
} from "lucide-react";

type TutorStatus = "STUDENT" | "GRADUATE";

interface Tutor {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;

  city: string;
  subcity: string;

  tutorStatus: TutorStatus;

  university: string | null;
  department: string | null;
  currentYear: string | null;
  currentGPA: number | null;

  fieldOfGraduation: string | null;
  universityGraduatedFrom: string | null;
  CGPA: number | null;
  employmentStatus: string | null;

  entrancePercentage: number;

  createdAt: string;
  updatedAt: string;

  _count: {
    applications: number;
  };
}

type FilterStatus = "ALL" | "STUDENT" | "GRADUATE";

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] =
    useState<FilterStatus>("ALL");

  async function loadTutors() {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (filterStatus !== "ALL") {
        params.set("status", filterStatus);
      }

      const response = await fetch(
        `/api/admin/tutors?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to fetch tutors."
        );
      }

      setTutors(data.tutors);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadTutors();
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, filterStatus]);

  return (
    <div className="space-y-6">
      {/* =========================================
          HEADER
      ========================================== */}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
          <Users size={20} />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            Tutors
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Browse and manage registered tutors.
          </p>
        </div>
      </div>

      {/* =========================================
          FILTERS
      ========================================== */}

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}

          <div className="relative w-full lg:max-w-lg">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name, email, phone, university..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-950 focus:bg-white focus:ring-2 focus:ring-gray-950/10"
            />
          </div>

          {/* Status filters */}

          <div className="flex w-full overflow-x-auto rounded-xl border bg-gray-50 p-1 lg:w-auto">
            {(
              [
                ["ALL", "All"],
                ["STUDENT", "Students"],
                ["GRADUATE", "Graduates"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilterStatus(value)
                }
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filterStatus === value
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          RESULTS
      ========================================== */}

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        {/* Result count */}

        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <p className="text-sm text-gray-500">
            {loading
              ? "Loading..."
              : `${tutors.length} tutor${
                  tutors.length === 1 ? "" : "s"
                }`}
          </p>
        </div>

        {/* Loading */}

        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-950" />

              <p className="mt-3 text-sm text-gray-500">
                Loading tutors...
              </p>
            </div>
          </div>
        ) : tutors.length === 0 ? (
          /* Empty */

          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <Users
              size={36}
              className="text-gray-300"
            />

            <h2 className="mt-3 font-semibold text-gray-900">
              No tutors found
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or filter.
            </p>
          </div>
        ) : (
          /* Table */

          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-5 py-3.5 font-semibold text-gray-600">
                    Tutor
                  </th>

                  <th className="px-4 py-3.5 font-semibold text-gray-600">
                    Type
                  </th>

                  <th className="px-4 py-3.5 font-semibold text-gray-600">
                    Education
                  </th>

                  <th className="px-4 py-3.5 font-semibold text-gray-600">
                    Academic
                  </th>

                  <th className="px-4 py-3.5 font-semibold text-gray-600">
                    Applications
                  </th>

                  <th className="px-4 py-3.5 font-semibold text-gray-600">
                    Registered
                  </th>

                  <th className="px-4 py-3.5 text-right font-semibold text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {tutors.map((tutor) => (
                  <TutorRow
                    key={tutor.id}
                    tutor={tutor}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================
   TUTOR ROW
========================================= */

function TutorRow({
  tutor,
}: {
  tutor: Tutor;
}) {
  const isStudent =
    tutor.tutorStatus === "STUDENT";

  const academicScore = isStudent
    ? tutor.currentGPA !== null
      ? `GPA ${tutor.currentGPA.toFixed(2)}`
      : "GPA —"
    : tutor.CGPA !== null
      ? `CGPA ${tutor.CGPA.toFixed(2)}`
      : "CGPA —";

  return (
    <tr className="group transition hover:bg-gray-50">
      {/* =========================================
          TUTOR
      ========================================== */}

      <td className="sticky left-0 z-10 bg-white px-5 py-4 group-hover:bg-gray-50">
        <div className="flex items-center gap-3">
          {/* Avatar */}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
            {tutor.fullName
              .charAt(0)
              .toUpperCase()}
          </div>

          {/* Name + contact */}

          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-950">
              {tutor.fullName}
            </p>

            <p className="mt-0.5 max-w-55 truncate text-xs text-gray-500">
              {tutor.email}
            </p>

            <p className="mt-0.5 text-xs text-gray-400">
              {tutor.phone}
            </p>
          </div>
        </div>
      </td>

      {/* =========================================
          TYPE
      ========================================== */}

      <td className="px-4 py-4">
        <StatusBadge
          status={tutor.tutorStatus}
        />
      </td>

      {/* =========================================
          EDUCATION
      ========================================== */}

      <td className="max-w-55 px-4 py-4">
        {isStudent ? (
          <div>
            <p className="truncate font-medium text-gray-900">
              {tutor.university || "—"}
            </p>

            <p className="mt-1 truncate text-xs text-gray-500">
              {tutor.department || "—"}
            </p>

            {tutor.currentYear && (
              <p className="mt-1 text-xs text-gray-400">
                Year {tutor.currentYear}
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="truncate font-medium text-gray-900">
              {tutor.fieldOfGraduation || "—"}
            </p>

            <p className="mt-1 truncate text-xs text-gray-500">
              {tutor.universityGraduatedFrom ||
                "—"}
            </p>
          </div>
        )}
      </td>

      {/* =========================================
          ACADEMIC
      ========================================== */}

      <td className="px-4 py-4">
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">
            {academicScore}
          </p>

          <p className="text-xs text-gray-500">
            Entrance{" "}
            <span className="font-medium text-gray-700">
              {tutor.entrancePercentage.toFixed(
                1
              )}
              %
            </span>
          </p>
        </div>
      </td>

      {/* =========================================
          APPLICATIONS
      ========================================== */}

      <td className="px-4 py-4">
        <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
          {tutor._count.applications}
        </span>
      </td>

      {/* =========================================
          REGISTERED
      ========================================== */}

      <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500">
        {formatDate(tutor.createdAt)}
      </td>

      {/* =========================================
          ACTION
      ========================================== */}

      <td className="px-4 py-4 text-right">
        <Link
          href={`/admin/tutors/${tutor.id}`}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950"
        >
          <Eye size={14} />
          View
        </Link>
      </td>
    </tr>
  );
}

/* =========================================
   STATUS BADGE
========================================= */

function StatusBadge({
  status,
}: {
  status: TutorStatus;
}) {
  if (status === "STUDENT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <GraduationCap size={12} />
        Student
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
      <UserRound size={12} />
      Graduate
    </span>
  );
}

/* =========================================
   DATE FORMATTER
========================================= */

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
