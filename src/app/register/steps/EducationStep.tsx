"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import {
  SectionHeading,
  SelectField,
  TextField,
} from "@/components/shared/FormFields";
import {
  CURRENT_YEAR_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  type RegisterValues,
} from "@/app/register/schema";

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

  return (
    <div className="space-y-6">
      <SectionHeading
        title={isStudent ? "Education information" : "Graduation & employment"}
        description={
          isStudent
            ? "Provide your current academic information."
            : "Provide your academic background and current employment information."
        }
      />

      {isStudent ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="university"
              label="University / College"
              required
              placeholder="University name"
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

          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="currentYear"
              render={({ field }) => (
                <SelectField
                  id="currentYear"
                  label="Current year"
                  required
                  options={CURRENT_YEAR_OPTIONS}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  error={errors.currentYear?.message}
                />
              )}
            />

            <TextField
              id="currentGPA"
              label="Current GPA"
              required
              type="number"
              step="0.01"
              min="0"
              max="4"
              placeholder="0.00 - 4.00"
              error={errors.currentGPA?.message}
              {...register("currentGPA")}
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="fieldOfGraduation"
              label="Field of graduation"
              required
              placeholder="e.g. Accounting, Computer Science"
              error={errors.fieldOfGraduation?.message}
              {...register("fieldOfGraduation")}
            />

            <TextField
              id="universityGraduatedFrom"
              label="University graduated from"
              required
              placeholder="University name"
              error={errors.universityGraduatedFrom?.message}
              {...register("universityGraduatedFrom")}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="CGPA"
              label="CGPA"
              required
              type="number"
              step="0.01"
              min="0"
              max="4"
              placeholder="0.00 - 4.00"
              error={errors.CGPA?.message}
              {...register("CGPA")}
            />

            <Controller
              control={control}
              name="employmentStatus"
              render={({ field }) => (
                <SelectField
                  id="employmentStatus"
                  label="Employment status"
                  required
                  options={EMPLOYMENT_STATUS_OPTIONS}
                  value={field.value ?? ""}
                  onValueChange={(value) => {
                    field.onChange(value);
                    onEmploymentStatusChange(value);
                  }}
                  error={errors.employmentStatus?.message}
                />
              )}
            />
          </div>

          {needsCurrentJob ? (
            <TextField
              id="currentJob"
              label="Current job"
              required
              placeholder="Your current job / occupation"
              error={errors.currentJob?.message}
              {...register("currentJob")}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
