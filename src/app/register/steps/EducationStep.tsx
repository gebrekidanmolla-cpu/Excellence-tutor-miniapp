"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { TextField } from "@/components/shared/FormFields";
import { ChoiceGroup } from "@/app/register/components/ChoiceGroup";
import { FormSection } from "@/app/register/components/FormSection";
import {
  EMPLOYMENT_STATUS_OPTIONS,
  type RegisterValues,
} from "@/app/register/schema";

/* Short labels for the chip row; the stored values are "1"–"5". */
const YEAR_CHOICES = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "5", label: "5th+" },
];

/**
 * Branches on `tutorStatus`. The wizard clears the other branch's values when
 * the status changes, so a tutor who switches from Graduate to Student cannot
 * submit stale graduate fields.
 */
export function EducationStep({
  form,
  onEmploymentStatusChange,
}: {
  form: UseFormReturn<RegisterValues>;
  onEmploymentStatusChange: (status: string) => void;
}) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  const tutorStatus = useWatch({ control, name: "tutorStatus" });
  const employmentStatus = useWatch({ control, name: "employmentStatus" });

  const isStudent = tutorStatus === "STUDENT";

  const needsCurrentJob =
    employmentStatus === "EMPLOYED" || employmentStatus === "SELF_EMPLOYED";

  if (isStudent) {
    return (
      <div className="space-y-10">
        <FormSection title="Where you study">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="university"
              label="University / College"
              required
              placeholder="e.g. Addis Ababa University"
              autoComplete="organization"
              error={errors.university?.message}
              {...register("university")}
            />

            <TextField
              id="department"
              label="Department"
              required
              placeholder="e.g. Accounting, Computer Science"
              error={errors.department?.message}
              {...register("department")}
            />
          </div>
        </FormSection>

        <FormSection title="Your progress">
          <Controller
            control={control}
            name="currentYear"
            render={({ field }) => (
              <ChoiceGroup
                name="currentYear"
                legend="Current year"
                required
                options={YEAR_CHOICES}
                value={field.value ?? ""}
                inputRef={field.ref}
                onChange={field.onChange}
                error={errors.currentYear?.message}
              />
            )}
          />

          <TextField
            id="currentGPA"
            label="Current GPA"
            required
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 3.45"
            hint="On a 4.00 scale."
            className="sm:max-w-56"
            error={errors.currentGPA?.message}
            {...register("currentGPA")}
          />
        </FormSection>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <FormSection title="Your degree">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="fieldOfGraduation"
            label="Field of study"
            required
            placeholder="e.g. Accounting, Computer Science"
            error={errors.fieldOfGraduation?.message}
            {...register("fieldOfGraduation")}
          />

          <TextField
            id="universityGraduatedFrom"
            label="University graduated from"
            required
            placeholder="e.g. Addis Ababa University"
            autoComplete="organization"
            error={errors.universityGraduatedFrom?.message}
            {...register("universityGraduatedFrom")}
          />
        </div>

        <TextField
          id="CGPA"
          label="Final CGPA"
          required
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 3.45"
          hint="On a 4.00 scale."
          className="sm:max-w-56"
          error={errors.CGPA?.message}
          {...register("CGPA")}
        />
      </FormSection>

      <FormSection title="Work">
        <Controller
          control={control}
          name="employmentStatus"
          render={({ field }) => (
            <ChoiceGroup
              name="employmentStatus"
              legend="Employment status"
              required
              options={EMPLOYMENT_STATUS_OPTIONS}
              value={field.value ?? ""}
              inputRef={field.ref}
              onChange={(value) => {
                field.onChange(value);
                onEmploymentStatusChange(value);
              }}
              error={errors.employmentStatus?.message}
            />
          )}
        />

        {needsCurrentJob ? (
          <TextField
            id="currentJob"
            label="Current job"
            required
            placeholder="e.g. Junior accountant"
            autoComplete="organization-title"
            error={errors.currentJob?.message}
            {...register("currentJob")}
          />
        ) : null}
      </FormSection>
    </div>
  );
}
