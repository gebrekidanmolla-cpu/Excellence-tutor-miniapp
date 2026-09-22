"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/shared/ErrorState";
import {
  SectionHeading,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/FormFields";

const GENDER_OPTIONS = [
  { value: "FEMALE", label: "Female tutor" },
  { value: "MALE", label: "Male tutor" },
  { value: "ANY", label: "Male/Female" },
];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

export default function CreateJobForm() {
  const router = useRouter();

  const [gender, setGender] = useState("FEMALE");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [place, setPlace] = useState("");
  const [salary, setSalary] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [status, setStatus] = useState("OPEN");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      /* Payload shape is unchanged — `POST /api/admin/jobs` expects these
         exact keys, all as strings. */
      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gender,
          grade,
          subject,
          place,
          salary,
          daysPerWeek,
          hoursPerDay,
          additionalDetails,
          status,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      const result = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        setError(
          result?.message || result?.error || "Failed to create job."
        );

        return;
      }

      /* The server decides the wording — it is the only side that
         knows whether the channel post actually went out. */
      if (result.telegram?.status === "FAILED") {
        toast.warning(result.message);
      } else {
        toast.success(result.message ?? "Job created.");
      }
      router.push(`/admin/jobs/${result.job.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <SectionHeading
          title="Job information"
          description="The job code is generated automatically when the job is created."
        />

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <SelectField
            id="gender"
            label="Tutor gender"
            required
            options={GENDER_OPTIONS}
            value={gender}
            onValueChange={setGender}
          />

          <SelectField
            id="status"
            label="Status"
            required
            options={STATUS_OPTIONS}
            value={status}
            onValueChange={setStatus}
          />

          <TextField
            id="grade"
            label="Grade"
            required
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
          />

          <TextField
            id="subject"
            label="Subject"
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />

          <TextField
            id="place"
            label="Place"
            required
            value={place}
            onChange={(event) => setPlace(event.target.value)}
          />

          <TextField
            id="salary"
            label="Monthly salary (ETB)"
            required
            type="number"
            min="0"
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
          />
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <SectionHeading
          title="Tutoring schedule"
          description="Define how frequently and how long the tutor will teach."
        />

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TextField
            id="daysPerWeek"
            label="Days per week"
            required
            type="number"
            min="1"
            max="7"
            value={daysPerWeek}
            onChange={(event) => setDaysPerWeek(event.target.value)}
          />

          <TextField
            id="hoursPerDay"
            label="Hours per day"
            required
            type="number"
            min="0"
            step="0.5"
            value={hoursPerDay}
            onChange={(event) => setHoursPerDay(event.target.value)}
          />
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <SectionHeading
          title="Job details"
          description="Anything a tutor should know before applying."
        />

        <div className="mt-5">
          <TextAreaField
            id="additionalDetails"
            label="Additional details"
            rows={6}
            maxLength={5000}
            value={additionalDetails}
            onChange={(event) => setAdditionalDetails(event.target.value)}
          />
        </div>
      </section>

      <FormError message={error} />

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="xl"
          onClick={() => router.push("/admin/jobs")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button type="submit" size="xl" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : (
            <Save data-icon="inline-start" aria-hidden="true" />
          )}
          {isSubmitting ? "Creating job…" : "Create job"}
        </Button>
      </div>
    </form>
  );
}
