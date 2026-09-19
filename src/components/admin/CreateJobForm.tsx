"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  FileText,
  Loader2,
  Save,
} from "lucide-react";

export default function CreateJobForm() {
  const router = useRouter();

  const [jobCode, setJobCode] = useState("");
  const [gender, setGender] = useState("FEMALE");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [salary, setSalary] = useState("");

  const [daysPerWeek, setDaysPerWeek] =
    useState("");

  const [hoursPerDay, setHoursPerDay] =
    useState("");

  const [additionalDetails, setAdditionalDetails] =
    useState("");

  const [status, setStatus] = useState("OPEN");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/admin/jobs",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobCode,
            gender,
            grade,
            subject,
            salary,
            daysPerWeek,
            hoursPerDay,
            additionalDetails,
            status,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") ?? "";

      const result = contentType.includes(
        "application/json"
      )
        ? await response.json()
        : null;

      if (!response.ok) {
        setError(
          result?.message ||
            result?.error ||
            "Failed to create job."
        );

        return;
      }

      router.push(
        `/admin/jobs/${result.job.id}`
      );

      router.refresh();
    } catch (error) {
      console.error(error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* ========================================================= */}
      {/* BASIC JOB INFORMATION */}
      {/* ========================================================= */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-gray-950">
            Job Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter the basic information for this tutoring
            opportunity.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Job Code */}
          <div>
            <label
              htmlFor="jobCode"
              className="block text-sm font-medium text-gray-900"
            >
              Job Code
            </label>

            <input
              id="jobCode"
              type="text"
              value={jobCode}
              onChange={(event) =>
                setJobCode(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="E337"
              required
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Example: E337
            </p>
          </div>

          {/* Gender */}
          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-900"
            >
              Tutor Gender
            </label>

            <select
              id="gender"
              value={gender}
              onChange={(event) =>
                setGender(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            >
              <option value="FEMALE">
                Female Tutor
              </option>

              <option value="MALE">
                Male Tutor
              </option>

              <option value="ANY">
                Any Gender
              </option>
            </select>
          </div>

          {/* Grade */}
          <div>
            <label
              htmlFor="grade"
              className="block text-sm font-medium text-gray-900"
            >
              Grade
            </label>

            <input
              id="grade"
              type="text"
              value={grade}
              onChange={(event) =>
                setGrade(event.target.value)
              }
              placeholder="KG 1"
              required
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* Subject */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-900"
            >
              Subject
            </label>

            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value)
              }
              placeholder="All Subjects"
              required
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* Salary */}
          <div>
            <label
              htmlFor="salary"
              className="block text-sm font-medium text-gray-900"
            >
              Salary
            </label>

            <div className="relative mt-2">
              <input
                id="salary"
                type="number"
                min="1"
                step="1"
                value={salary}
                onChange={(event) =>
                  setSalary(event.target.value)
                }
                placeholder="4800"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                ETB
              </span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-900"
            >
              Job Status
            </label>

            <select
              id="status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            >
              <option value="OPEN">
                Open
              </option>

              <option value="CLOSED">
                Closed
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SCHEDULE */}
      {/* ========================================================= */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
            <CalendarDays size={18} />
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              Tutoring Schedule
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Define how frequently and how long the tutor
              will teach.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Days per week */}
          <div>
            <label
              htmlFor="daysPerWeek"
              className="flex items-center gap-2 text-sm font-medium text-gray-900"
            >
              <CalendarDays
                size={16}
                className="text-gray-400"
              />
              Days per Week
            </label>

            <input
              id="daysPerWeek"
              type="number"
              min="1"
              max="7"
              step="1"
              value={daysPerWeek}
              onChange={(event) =>
                setDaysPerWeek(event.target.value)
              }
              placeholder="3"
              required
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Example: 3 days per week
            </p>
          </div>

          {/* Hours per day */}
          <div>
            <label
              htmlFor="hoursPerDay"
              className="flex items-center gap-2 text-sm font-medium text-gray-900"
            >
              <Clock3
                size={16}
                className="text-gray-400"
              />
              Hours per Day
            </label>

            <input
              id="hoursPerDay"
              type="number"
              min="0.5"
              max="12"
              step="0.5"
              value={hoursPerDay}
              onChange={(event) =>
                setHoursPerDay(event.target.value)
              }
              placeholder="2"
              required
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Example: 2 hours per day
            </p>
          </div>
        </div>

        {/* Schedule Preview */}
        {daysPerWeek && hoursPerDay && (
          <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                Schedule:
              </span>{" "}
              {daysPerWeek} days/week ×{" "}
              {hoursPerDay} hours/day
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Approximately{" "}
              {Number(daysPerWeek) *
                Number(hoursPerDay)}{" "}
              hours per week.
            </p>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* ADDITIONAL DETAILS */}
      {/* ========================================================= */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
            <FileText size={18} />
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              Additional Details
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add any information tutors should know before
              applying.
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="additionalDetails"
            className="block text-sm font-medium text-gray-900"
          >
            Job Details
          </label>

          <textarea
            id="additionalDetails"
            value={additionalDetails}
            onChange={(event) =>
              setAdditionalDetails(
                event.target.value
              )
            }
            rows={6}
            maxLength={5000}
            placeholder={`Example:
- Student is in Grade 8.
- Tutor should have strong Mathematics and Physics knowledge.
- Teaching will take place at the student's home.
- Tutor should be punctual and highly committed.
- Preferably available in the afternoon.`}
            className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          />

          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>
              Include requirements, location notes,
              preferred schedule, or other instructions.
            </span>

            <span>
              {additionalDetails.length}/5000
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ERROR */}
      {/* ========================================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ========================================================= */}
      {/* ACTIONS */}
      {/* ========================================================= */}

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            router.push("/admin/jobs")
          }
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />
              Creating Job...
            </>
          ) : (
            <>
              <Save size={17} />
              Create Job
            </>
          )}
        </button>
      </div>
    </form>
  );
}
``
