"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
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

type TutorData = {
  id: string;
  fullName: string;
  gender: string;
  email: string;
  phone: string;
  city: string;
  subcity: string;
  exactPlace: string;
  aboutMe: string;
  tutorStatus: "STUDENT" | "GRADUATE";

  university: string;
  department: string;
  currentYear: string;
  currentGPA: number | null;

  fieldOfGraduation: string;
  universityGraduatedFrom: string;
  CGPA: number | null;
  employmentStatus: string;
  currentJob: string;

  entranceScore: number;
  entranceTotal: number;
  entrancePercentage: number;
};

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const CURRENT_YEAR_OPTIONS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
  { value: "5", label: "5th Year or above" },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "UNEMPLOYED", label: "Unemployed" },
  { value: "OTHER", label: "Other" },
];

const ENTRANCE_TOTAL_OPTIONS = [
  { value: "600", label: "600" },
  { value: "700", label: "700" },
];

export default function TutorEditForm({ tutor }: { tutor: TutorData }) {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: tutor.fullName,
    gender: tutor.gender,
    email: tutor.email,
    phone: tutor.phone,
    city: tutor.city,
    subcity: tutor.subcity,
    exactPlace: tutor.exactPlace,
    aboutMe: tutor.aboutMe,

    university: tutor.university,
    department: tutor.department,
    currentYear: tutor.currentYear,
    currentGPA: tutor.currentGPA !== null ? String(tutor.currentGPA) : "",

    fieldOfGraduation: tutor.fieldOfGraduation,
    universityGraduatedFrom: tutor.universityGraduatedFrom,
    CGPA: tutor.CGPA !== null ? String(tutor.CGPA) : "",
    employmentStatus: tutor.employmentStatus,
    currentJob: tutor.currentJob,

    entranceScore: String(tutor.entranceScore),
    entranceTotal: String(tutor.entranceTotal),
    entrancePercentage: String(tutor.entrancePercentage),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isStudent = tutor.tutorStatus === "STUDENT";

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      /* Payload unchanged. Note this route answers errors as `{ error }`,
         unlike the rest of the API, which uses `{ success, message }`. */
      const response = await fetch(`/api/admin/tutors/${tutor.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName,
          gender: form.gender,
          email: form.email,
          phone: form.phone,

          city: form.city,
          subcity: form.subcity,
          exactPlace: form.exactPlace,
          aboutMe: form.aboutMe,

          university: form.university,
          department: form.department,
          currentYear: form.currentYear,
          currentGPA: form.currentGPA,

          fieldOfGraduation: form.fieldOfGraduation,
          universityGraduatedFrom: form.universityGraduatedFrom,
          CGPA: form.CGPA,
          employmentStatus: form.employmentStatus,
          currentJob: form.currentJob,

          entranceScore: form.entranceScore,
          entranceTotal: form.entranceTotal,
          entrancePercentage: form.entrancePercentage,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      const data = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update tutor.");
      }

      toast.success("Tutor updated.");

      /* Navigates immediately — the old version waited on a 700ms timer
         before redirecting. */
      router.push(`/admin/tutors/${tutor.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong."
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <SectionHeading
          title="Personal information"
          description="Basic tutor account information."
        />

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TextField
            id="fullName"
            label="Full name"
            required
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
          />

          <SelectField
            id="gender"
            label="Gender"
            required
            options={GENDER_OPTIONS}
            value={form.gender}
            onValueChange={(value) => updateField("gender", value)}
          />

          <TextField
            id="email"
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />

          <TextField
            id="phone"
            label="Phone"
            required
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            hint="Full number including the +251 country code."
          />
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <SectionHeading
          title="Location"
          description="Where the tutor is based."
        />

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TextField
            id="city"
            label="City"
            required
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
          />

          <TextField
            id="subcity"
            label="Subcity"
            required
            value={form.subcity}
            onChange={(event) => updateField("subcity", event.target.value)}
          />

          <TextField
            id="exactPlace"
            label="Exact place"
            required
            className="sm:col-span-2"
            value={form.exactPlace}
            onChange={(event) =>
              updateField("exactPlace", event.target.value)
            }
          />
        </div>

        <div className="mt-5">
          <TextAreaField
            id="aboutMe"
            label="About tutor"
            rows={4}
            maxLength={500}
            value={form.aboutMe}
            onChange={(event) => updateField("aboutMe", event.target.value)}
          />
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <SectionHeading
          title={isStudent ? "Education" : "Graduation & employment"}
          description={
            isStudent
              ? "Current academic information."
              : "Academic background and employment."
          }
        />

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {isStudent ? (
            <>
              <TextField
                id="university"
                label="University / College"
                value={form.university}
                onChange={(event) =>
                  updateField("university", event.target.value)
                }
              />

              <TextField
                id="department"
                label="Department"
                value={form.department}
                onChange={(event) =>
                  updateField("department", event.target.value)
                }
              />

              <SelectField
                id="currentYear"
                label="Current year"
                options={CURRENT_YEAR_OPTIONS}
                value={form.currentYear}
                onValueChange={(value) => updateField("currentYear", value)}
              />

              <TextField
                id="currentGPA"
                label="Current GPA"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.currentGPA}
                onChange={(event) =>
                  updateField("currentGPA", event.target.value)
                }
              />
            </>
          ) : (
            <>
              <TextField
                id="fieldOfGraduation"
                label="Field of graduation"
                value={form.fieldOfGraduation}
                onChange={(event) =>
                  updateField("fieldOfGraduation", event.target.value)
                }
              />

              <TextField
                id="universityGraduatedFrom"
                label="University graduated from"
                value={form.universityGraduatedFrom}
                onChange={(event) =>
                  updateField("universityGraduatedFrom", event.target.value)
                }
              />

              <TextField
                id="CGPA"
                label="CGPA"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.CGPA}
                onChange={(event) => updateField("CGPA", event.target.value)}
              />

              <SelectField
                id="employmentStatus"
                label="Employment status"
                options={EMPLOYMENT_STATUS_OPTIONS}
                value={form.employmentStatus}
                onValueChange={(value) =>
                  updateField("employmentStatus", value)
                }
              />

              <TextField
                id="currentJob"
                label="Current job"
                className="sm:col-span-2"
                value={form.currentJob}
                onChange={(event) =>
                  updateField("currentJob", event.target.value)
                }
              />
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <SectionHeading
          title="Entrance examination"
          description="The percentage is stored alongside the score."
        />

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <TextField
            id="entranceScore"
            label="Score"
            type="number"
            min="0"
            value={form.entranceScore}
            onChange={(event) =>
              updateField("entranceScore", event.target.value)
            }
          />

          <SelectField
            id="entranceTotal"
            label="Out of"
            options={ENTRANCE_TOTAL_OPTIONS}
            value={form.entranceTotal}
            onValueChange={(value) => updateField("entranceTotal", value)}
          />

          <TextField
            id="entrancePercentage"
            label="Percentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.entrancePercentage}
            onChange={(event) =>
              updateField("entrancePercentage", event.target.value)
            }
          />
        </div>
      </section>

      <FormError message={error} />

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Button
          render={<Link href={`/admin/tutors/${tutor.id}`} />}
          variant="outline"
          size="xl"
          disabled={saving}
        >
          Cancel
        </Button>

        <Button type="submit" size="xl" disabled={saving}>
          {saving ? (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : (
            <Save data-icon="inline-start" aria-hidden="true" />
          )}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
