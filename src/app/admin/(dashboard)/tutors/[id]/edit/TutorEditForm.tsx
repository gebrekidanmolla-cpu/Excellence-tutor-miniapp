"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MapPin,
  Save,
  User,
} from "lucide-react";

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

export default function TutorEditForm({
  tutor,
}: {
  tutor: TutorData;
}) {
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
    currentGPA:
      tutor.currentGPA !== null
        ? String(tutor.currentGPA)
        : "",

    fieldOfGraduation: tutor.fieldOfGraduation,
    universityGraduatedFrom:
      tutor.universityGraduatedFrom,
    CGPA:
      tutor.CGPA !== null
        ? String(tutor.CGPA)
        : "",
    employmentStatus: tutor.employmentStatus,
    currentJob: tutor.currentJob,

    entranceScore: String(tutor.entranceScore),
    entranceTotal: String(tutor.entranceTotal),
    entrancePercentage: String(
      tutor.entrancePercentage
    ),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(
    field: string,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(
        `/api/admin/tutors/${tutor.id}`,
        {
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

            fieldOfGraduation:
              form.fieldOfGraduation,
            universityGraduatedFrom:
              form.universityGraduatedFrom,
            CGPA: form.CGPA,
            employmentStatus:
              form.employmentStatus,
            currentJob: form.currentJob,

            entranceScore:
              form.entranceScore,
            entranceTotal:
              form.entranceTotal,
            entrancePercentage:
              form.entrancePercentage,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") ?? "";

      const data = contentType.includes(
        "application/json"
      )
        ? await response.json()
        : null;

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to update tutor."
        );
      }

      setSuccess(true);

      setTimeout(() => {
        router.push(
          `/admin/tutors/${tutor.id}`
        );
        router.refresh();
      }, 700);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Personal Information */}
      <FormSection
        icon={User}
        title="Personal Information"
        description="Basic tutor account information"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={(value) =>
              updateField("fullName", value)
            }
            required
          />

          <Select
            label="Gender"
            value={form.gender}
            onChange={(value) =>
              updateField("gender", value)
            }
            options={[
              { value: "MALE", label: "Male" },
              { value: "FEMALE", label: "Female" },
              { value: "ANY", label: "Any" },
            ]}
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) =>
              updateField("email", value)
            }
            required
          />

          <Input
            label="Phone"
            value={form.phone}
            onChange={(value) =>
              updateField("phone", value)
            }
            required
          />

          <div className="sm:col-span-2">
            <Textarea
              label="About Tutor"
              value={form.aboutMe}
              onChange={(value) =>
                updateField("aboutMe", value)
              }
              rows={5}
            />
          </div>
        </div>
      </FormSection>

      {/* Location */}
      <FormSection
        icon={MapPin}
        title="Location"
        description="Tutor's registered location"
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Input
            label="City"
            value={form.city}
            onChange={(value) =>
              updateField("city", value)
            }
            required
          />

          <Input
            label="Subcity"
            value={form.subcity}
            onChange={(value) =>
              updateField("subcity", value)
            }
            required
          />

          <Input
            label="Exact Place"
            value={form.exactPlace}
            onChange={(value) =>
              updateField("exactPlace", value)
            }
            required
          />
        </div>
      </FormSection>

      {/* Education */}
      <FormSection
        icon={GraduationCap}
        title="Education"
        description="Academic information"
      >
        {tutor.tutorStatus === "STUDENT" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="University"
              value={form.university}
              onChange={(value) =>
                updateField("university", value)
              }
              required
            />

            <Input
              label="Department"
              value={form.department}
              onChange={(value) =>
                updateField("department", value)
              }
              required
            />

            <Input
              label="Current Year"
              value={form.currentYear}
              onChange={(value) =>
                updateField("currentYear", value)
              }
              required
            />

            <NumberInput
              label="Current GPA"
              value={form.currentGPA}
              onChange={(value) =>
                updateField("currentGPA", value)
              }
              step="0.01"
            />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Field of Graduation"
              value={form.fieldOfGraduation}
              onChange={(value) =>
                updateField(
                  "fieldOfGraduation",
                  value
                )
              }
              required
            />

            <Input
              label="University Graduated From"
              value={
                form.universityGraduatedFrom
              }
              onChange={(value) =>
                updateField(
                  "universityGraduatedFrom",
                  value
                )
              }
              required
            />

            <NumberInput
              label="CGPA"
              value={form.CGPA}
              onChange={(value) =>
                updateField("CGPA", value)
              }
              step="0.01"
            />

            <Input
              label="Employment Status"
              value={form.employmentStatus}
              onChange={(value) =>
                updateField(
                  "employmentStatus",
                  value
                )
              }
            />

            <Input
              label="Current Job"
              value={form.currentJob}
              onChange={(value) =>
                updateField(
                  "currentJob",
                  value
                )
              }
            />
          </div>
        )}
      </FormSection>

      {/* Entrance Examination */}
      <FormSection
        icon={GraduationCap}
        title="Entrance Examination"
        description="Entrance examination information"
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberInput
            label="Score"
            value={form.entranceScore}
            onChange={(value) =>
              updateField(
                "entranceScore",
                value
              )
            }
          />

          <NumberInput
            label="Total"
            value={form.entranceTotal}
            onChange={(value) =>
              updateField(
                "entranceTotal",
                value
              )
            }
          />

          <NumberInput
            label="Percentage"
            value={form.entrancePercentage}
            onChange={(value) =>
              updateField(
                "entrancePercentage",
                value
              )
            }
            step="0.01"
          />
        </div>
      </FormSection>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />
          <span>
            Tutor information updated successfully.
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Link
          href={`/admin/tutors/${tutor.id}`}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />
              Saving...
            </>
          ) : (
            <>
              <Save size={17} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Form Components */
/* -------------------------------------------------------------------------- */

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
          <Icon size={18} />
        </div>

        <div>
          <h2 className="font-semibold tracking-tight text-gray-950">
            {title}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm leading-6 text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
    </label>
  );
}
