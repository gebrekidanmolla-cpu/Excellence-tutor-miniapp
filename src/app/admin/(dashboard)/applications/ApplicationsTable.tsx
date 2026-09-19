"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ApplicationStatusSelect from "./ApplicationStatusSelect";
import CopyPhone from "./CopyPhone";
import AssignTutorButton from "./AssignTutorButton";

type ApplicationStatus =
  | "PENDING"
  | "REVIEWED"
  | "ACCEPTED"
  | "REJECTED";

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

function formatGPA(application: Application) {
  const {
    tutor: { tutorStatus, currentGPA, CGPA },
  } = application;

  if (tutorStatus === "STUDENT") {
    return currentGPA !== null
      ? currentGPA.toFixed(2)
      : "—";
  }

  return CGPA !== null ? CGPA.toFixed(2) : "—";
}

function formatGender(gender: Application["tutor"]["gender"]) {
  if (gender === "MALE") return "M";
  if (gender === "FEMALE") return "F";
  return "—";
}

function formatAppliedTime(date: string) {
  const value = new Date(date);

  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApplicationsTable({
  applications,
}: Props) {
  // =====================================================
  // SEARCH / FILTER STATE
  // =====================================================

  const [jobSearch, setJobSearch] = useState("");

  const [entranceFilter, setEntranceFilter] =
    useState("ALL");

  const [timeFilter, setTimeFilter] =
    useState("ALL");

  const [tutorStatusFilter, setTutorStatusFilter] =
    useState<"ALL" | TutorStatus>("ALL");

  // =====================================================
  // SORT STATE
  // =====================================================

  const [entranceSort, setEntranceSort] =
    useState<SortDirection>("desc");

  const [timeSort, setTimeSort] =
    useState<SortDirection>(null);

  // =====================================================
  // ENTRANCE SORT
  // =====================================================

  function toggleEntranceSort() {
    setEntranceSort((current) => {
      if (current === null) return "desc";
      if (current === "desc") return "asc";
      return null;
    });
  }

  // =====================================================
  // TIME SORT
  // =====================================================

  function toggleTimeSort() {
    setTimeSort((current) => {
      if (current === null) return "desc";
      if (current === "desc") return "asc";
      return null;
    });
  }

  // =====================================================
  // FILTER + SORT
  // =====================================================

  const filteredApplications = useMemo(() => {
    let result = [...applications];

    // ---------------------------------------------------
    // JOB CODE SEARCH
    // ---------------------------------------------------

    const search = jobSearch.trim().toLowerCase();

    if (search) {
      result = result.filter((application) =>
        application.job.jobCode
          .toLowerCase()
          .includes(search)
      );
    }

    // ---------------------------------------------------
    // ENTRANCE FILTER
    // ---------------------------------------------------

    if (entranceFilter !== "ALL") {
      const minimum = Number(entranceFilter);

      result = result.filter(
        (application) =>
          application.tutor.entrancePercentage >=
          minimum
      );
    }

    // ---------------------------------------------------
    // TIME FILTER
    // ---------------------------------------------------

    if (timeFilter !== "ALL") {
      const now = Date.now();

      const hours =
        timeFilter === "24H"
          ? 24
          : timeFilter === "7D"
            ? 24 * 7
            : 24 * 30;

      const cutoff =
        now - hours * 60 * 60 * 1000;

      result = result.filter(
        (application) =>
          new Date(application.createdAt).getTime() >=
          cutoff
      );
    }

    // ---------------------------------------------------
    // TUTOR STATUS FILTER
    // ---------------------------------------------------

    if (tutorStatusFilter !== "ALL") {
      result = result.filter(
        (application) =>
          application.tutor.tutorStatus ===
          tutorStatusFilter
      );
    }

    // ---------------------------------------------------
    // SORT
    // ---------------------------------------------------
    //
    // Entrance has priority when selected.
    // Time becomes the secondary sort.
    //
    // Example:
    //
    // Entrance ↓ + Time ↓
    //
    // = highest entrance percentage first,
    //   and among equal entrance scores,
    //   newest applications first.
    //
    // ---------------------------------------------------

    result.sort((a, b) => {
      if (entranceSort) {
        const entranceDifference =
          a.tutor.entrancePercentage -
          b.tutor.entrancePercentage;

        if (entranceDifference !== 0) {
          return entranceSort === "desc"
            ? -entranceDifference
            : entranceDifference;
        }
      }

      if (timeSort) {
        const timeDifference =
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime();

        if (timeDifference !== 0) {
          return timeSort === "desc"
            ? -timeDifference
            : timeDifference;
        }
      }

      return 0;
    });

    return result;
  }, [
    applications,
    jobSearch,
    entranceFilter,
    timeFilter,
    tutorStatusFilter,
    entranceSort,
    timeSort,
  ]);

  // =====================================================
  // COUNTS
  // =====================================================

  const pendingCount = applications.filter(
    (application) => application.status === "PENDING"
  ).length;

  const reviewedCount = applications.filter(
    (application) => application.status === "REVIEWED"
  ).length;

  const acceptedCount = applications.filter(
    (application) => application.status === "ACCEPTED"
  ).length;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-4">
      {/* =================================================
          SUMMARY
          ================================================= */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total"
          value={applications.length}
        />

        <SummaryCard
          label="Pending"
          value={pendingCount}
        />

        <SummaryCard
          label="Reviewed"
          value={reviewedCount}
        />

        <SummaryCard
          label="Accepted"
          value={acceptedCount}
        />
      </div>

      {/* =================================================
          FILTER BAR
          ================================================= */}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          {/* JOB SEARCH */}

          <div className="min-w-0 flex-1">
            <label className="sr-only">
              Search Job Code
            </label>

            <input
              type="text"
              value={jobSearch}
              onChange={(event) =>
                setJobSearch(event.target.value)
              }
              placeholder="Search job code..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none transition focus:border-gray-400 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus:bg-gray-900"
            />
          </div>

          {/* ENTRANCE */}

          <select
            value={entranceFilter}
            onChange={(event) =>
              setEntranceFilter(event.target.value)
            }
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="ALL">All Entr.</option>
            <option value="90">90%+</option>
            <option value="80">80%+</option>
            <option value="70">70%+</option>
            <option value="60">60%+</option>
          </select>

          {/* TIME */}

          <select
            value={timeFilter}
            onChange={(event) =>
              setTimeFilter(event.target.value)
            }
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="ALL">All Time</option>
            <option value="24H">Last 24h</option>
            <option value="7D">Last 7d</option>
            <option value="30D">Last 30d</option>
          </select>

          {/* TUTOR STATUS */}

          <select
            value={tutorStatusFilter}
            onChange={(event) =>
              setTutorStatusFilter(
                event.target.value as
                  | "ALL"
                  | TutorStatus
              )
            }
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="ALL">All Tutors</option>
            <option value="STUDENT">Students</option>
            <option value="GRADUATE">Graduates</option>
          </select>

          {/* RESET */}

          <button
            type="button"
            onClick={() => {
              setJobSearch("");
              setEntranceFilter("ALL");
              setTimeFilter("ALL");
              setTutorStatusFilter("ALL");
              setEntranceSort("desc");
              setTimeSort(null);
            }}
            className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Reset
          </button>
        </div>

        {/* ACTIVE SORT INDICATOR */}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>Sort:</span>

          <span
            className={`rounded-full px-2.5 py-1 ${
              entranceSort
                ? "bg-gray-100 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                : "bg-transparent"
            }`}
          >
            Entr.{" "}
            {entranceSort === "desc"
              ? "↓"
              : entranceSort === "asc"
                ? "↑"
                : "—"}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 ${
              timeSort
                ? "bg-gray-100 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                : "bg-transparent"
            }`}
          >
            Time{" "}
            {timeSort === "desc"
              ? "↓"
              : timeSort === "asc"
                ? "↑"
                : "—"}
          </span>

          <span className="ml-auto">
            Showing{" "}
            <strong className="text-gray-700 dark:text-gray-200">
              {filteredApplications.length}
            </strong>{" "}
            of {applications.length}
          </span>
        </div>
      </div>

      {/* =================================================
          TABLE
          ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  Name
                </th>

                <th className="px-4 py-3 font-semibold">
                  Phone
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  G
                </th>

                <th className="px-4 py-3 font-semibold">
                  Univ.
                </th>

                <th className="px-4 py-3 font-semibold">
                  Dept.
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  GPA/CGPA
                </th>

                {/* ENTRANCE SORT */}

                <th className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={toggleEntranceSort}
                    className="inline-flex items-center gap-1 transition hover:text-gray-900 dark:hover:text-white"
                  >
                    Entr. %

                    <span className="text-sm">
                      {entranceSort === "desc"
                        ? "↓"
                        : entranceSort === "asc"
                          ? "↑"
                          : "↕"}
                    </span>
                  </button>
                </th>

                {/* TIME SORT */}

                <th className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={toggleTimeSort}
                    className="inline-flex items-center gap-1 transition hover:text-gray-900 dark:hover:text-white"
                  >
                    Applied

                    <span className="text-sm">
                      {timeSort === "desc"
                        ? "↓"
                        : timeSort === "asc"
                          ? "↑"
                          : "↕"}
                    </span>
                  </button>
                </th>

                <th className="px-4 py-3 font-semibold">
                  Tutor
                </th>

                <th className="px-4 py-3 font-semibold">
                  Status
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-16 text-center"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      No applications found
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      Try changing your search or filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplications.map(
                  (application) => {
                    const jobIsClosed =
                      application.job.status === "CLOSED";

                    const hasAssignedTutor =
                      Boolean(
                        application.job
                          .assignedTutorId
                      );

                    const isAccepted =
                      application.status ===
                      "ACCEPTED";

                    const canAssign =
                      !jobIsClosed &&
                      !hasAssignedTutor &&
                      !isAccepted;

                    return (
                      <tr
                        key={application.id}
                        className="transition hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                      >
                        {/* NAME */}

                        <td className="px-4 py-3">
                          <div className="max-w-45 truncate font-medium text-gray-900 dark:text-white">
                            {application.tutor.fullName}
                          </div>

                          <div className="mt-0.5 text-xs text-gray-400">
                            {application.job.jobCode}
                          </div>
                        </td>

                        {/* PHONE */}

                        <td className="px-4 py-3">
                          <CopyPhone
                            phone={
                              application.tutor.phone
                            }
                          />
                        </td>

                        {/* GENDER */}

                        <td className="px-4 py-3 text-center">
                          <span className="font-medium">
                            {formatGender(
                              application.tutor
                                .gender
                            )}
                          </span>
                        </td>

                        {/* UNIVERSITY */}

                        <td className="px-4 py-3">
                          <div className="max-w-37.5 truncate">
                            {application.tutor
                              .university || "—"}
                          </div>
                        </td>

                        {/* DEPARTMENT */}

                        <td className="px-4 py-3">
                          <div className="max-w-37.5 truncate">
                            {application.tutor
                              .department || "—"}
                          </div>
                        </td>

                        {/* GPA */}

                        <td className="px-4 py-3 text-center font-medium">
                          {formatGPA(application)}
                        </td>

                        {/* ENTRANCE */}

                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {application.tutor
                              .entrancePercentage.toFixed(
                                1
                              )}
                            %
                          </div>

                          <div className="text-xs text-gray-400">
                            {
                              application.tutor
                                .entranceScore
                            }
                            /
                            {
                              application.tutor
                                .entranceTotal
                            }
                          </div>
                        </td>

                        {/* APPLIED */}

                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {formatAppliedTime(
                            application.createdAt
                          )}
                        </td>

                        {/* TUTOR STATUS */}

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              application.tutor
                                .tutorStatus ===
                              "STUDENT"
                                ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                            }`}
                          >
                            {application.tutor
                              .tutorStatus ===
                            "STUDENT"
                              ? "Student"
                              : "Graduate"}
                          </span>
                        </td>

                        {/* APPLICATION STATUS */}

                        <td className="px-4 py-3">
                          <ApplicationStatusSelect
                            applicationId={
                              application.id
                            }
                            initialStatus={
                              application.status
                            }
                          />
                        </td>

                        {/* ACTION */}

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {/* VIEW */}

                            <Link
                              href={`/admin/applications/${application.id}`}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                              View
                            </Link>

                            {/* ASSIGN */}

                            {canAssign && (
                              <AssignTutorButton
                                applicationId={
                                  application.id
                                }
                                tutorName={
                                  application.tutor
                                    .fullName
                                }
                                jobCode={
                                  application.job
                                    .jobCode
                                }
                              />
                            )}

                            {/* ACCEPTED */}

                            {isAccepted && (
                              <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                Assigned
                              </span>
                            )}

                            {/* CLOSED */}

                            {jobIsClosed &&
                              !isAccepted && (
                                <span className="text-xs text-gray-400">
                                  Closed
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =======================================================
// SUMMARY CARD
// =======================================================

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs font-medium text-gray-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

