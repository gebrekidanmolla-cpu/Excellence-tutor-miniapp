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

interface EditJobFormProps {
  job: {
    id: string;
    jobCode: string;
    gender: "MALE" | "FEMALE" | "ANY";
    grade: string;
    subject: string;
    place: string;
    parentName: string;
    parentPhone: string;
    salary: number;
    daysPerWeek: number;
    hoursPerDay: number;
    additionalDetails: string | null;
    status: "OPEN" | "CLOSED";
  };
}

const GENDER_OPTIONS = [
  { value: "FEMALE", label: "Female tutor" },
  { value: "MALE", label: "Male tutor" },
  { value: "ANY", label: "Any tutor" },
];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

export default function EditJobForm({ job }: EditJobFormProps) {
  const router = useRouter();

  const [gender, setGender] = useState<string>(job.gender);
  const [grade, setGrade] = useState(job.grade);
  const [subject, setSubject] = useState(job.subject);
  const [place, setPlace] = useState(job.place);
  const [parentName, setParentName] = useState(job.parentName);
  const [parentPhone, setParentPhone] = useState(job.parentPhone);
  const [salary, setSalary] = useState(String(job.salary));
  const [daysPerWeek, setDaysPerWeek] = useState(String(job.daysPerWeek));
  const [hoursPerDay, setHoursPerDay] = useState(String(job.hoursPerDay));
  const [additionalDetails, setAdditionalDetails] = useState(
    job.additionalDetails ?? ""
  );
  const [status, setStatus] = useState<string>(job.status);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gender,
          grade,
          subject,
          place,
          parentName,
          parentPhone,
          salary,
          daysPerWeek,
          hoursPerDay,
          additionalDetails,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Failed to update job.");

        return;
      }

      toast.success("Job updated.");
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
          description={`Update the details for job ${job.jobCode}.`}
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
            id="parentName"
            label="Parent name"
            required
            value={parentName}
            onChange={(event) => setParentName(event.target.value)}
          />

          <TextField
            id="parentPhone"
            label="Parent phone number"
            required
            type="tel"
            inputMode="tel"
            value={parentPhone}
            onChange={(event) => setParentPhone(event.target.value)}
          />
        </div>

      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <SectionHeading
          title="Schedule and pay"
          description="How often the tutor teaches, and what it pays."
        />

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
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
          title="Anything else"
          description="Optional — shown on the job post and the channel listing."
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
          onClick={() => router.push(`/admin/jobs/${job.id}`)}
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
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
