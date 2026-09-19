"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface EditJobFormProps {
  job: {
    id: string;
    jobCode: string;
    gender: "MALE" | "FEMALE" | "ANY";
    grade: string;
    subject: string;
    salary: number;
    status: "OPEN" | "CLOSED";
  };
}

export default function EditJobForm({
  job,
}: EditJobFormProps) {
  const router = useRouter();

  const [jobCode, setJobCode] =
    useState(job.jobCode);

  const [gender, setGender] =
    useState(job.gender);

  const [grade, setGrade] =
    useState(job.grade);

  const [subject, setSubject] =
    useState(job.subject);

  const [salary, setSalary] =
    useState(String(job.salary));

  const [status, setStatus] =
    useState(job.status);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/jobs/${job.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            jobCode,
            gender,
            grade,
            subject,
            salary,
            status,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to update job."
        );

        return;
      }

      setSuccess(
        "Job updated successfully."
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
      {/* Job Code */}

      <div>
        <label
          htmlFor="jobCode"
          className="block text-sm font-medium"
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
          required
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </div>

      {/* Gender */}

      <div>
        <label
          htmlFor="gender"
          className="block text-sm font-medium"
        >
          Tutor Gender
        </label>

        <select
          id="gender"
          value={gender}
          onChange={(event) =>
            setGender(
              event.target.value as
                | "MALE"
                | "FEMALE"
                | "ANY"
            )
          }
          className="mt-2 w-full rounded-xl border px-4 py-3"
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
          className="block text-sm font-medium"
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
          required
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </div>

      {/* Subject */}

      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium"
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
          required
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </div>

      {/* Salary */}

      <div>
        <label
          htmlFor="salary"
          className="block text-sm font-medium"
        >
          Salary
        </label>

        <input
          id="salary"
          type="number"
          min="1"
          step="1"
          value={salary}
          onChange={(event) =>
            setSalary(event.target.value)
          }
          required
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </div>

      {/* Status */}

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium"
        >
          Job Status
        </label>

        <select
          id="status"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as
                | "OPEN"
                | "CLOSED"
            )
          }
          className="mt-2 w-full rounded-xl border px-4 py-3"
        >
          <option value="OPEN">
            Open
          </option>

          <option value="CLOSED">
            Closed
          </option>
        </select>
      </div>

      {/* Error */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success */}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Buttons */}

      <div className="flex gap-3">

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving Changes..."
            : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/admin/jobs/${job.id}`
            )
          }
          className="rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
        >
          Cancel
        </button>

      </div>
    </form>
  );
}