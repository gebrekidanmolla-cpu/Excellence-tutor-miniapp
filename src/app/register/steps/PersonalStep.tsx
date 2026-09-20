"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import {
  SectionHeading,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/FormFields";
import {
  GENDER_OPTIONS,
  TUTOR_STATUS_OPTIONS,
  type RegisterValues,
} from "@/app/register/schema";

export function PersonalStep({
  form,
  onTutorStatusChange,
}: {
  form: UseFormReturn<RegisterValues>;
  onTutorStatusChange: (status: string) => void;
}) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  const aboutMe = useWatch({ control, name: "aboutMe" });

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Personal information"
        description="Tell us a little about yourself and where you are based."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <SelectField
              id="gender"
              label="Gender"
              required
              options={GENDER_OPTIONS}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              error={errors.gender?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="tutorStatus"
          render={({ field }) => (
            <SelectField
              id="tutorStatus"
              label="Current status"
              required
              options={TUTOR_STATUS_OPTIONS}
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(value);
                onTutorStatusChange(value);
              }}
              error={errors.tutorStatus?.message}
              hint="This decides which education details we ask for next."
            />
          )}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="city"
          label="City"
          required
          placeholder="Addis Ababa"
          autoComplete="address-level2"
          error={errors.city?.message}
          {...register("city")}
        />

        <TextField
          id="subcity"
          label="Subcity"
          required
          placeholder="e.g. Bole"
          error={errors.subcity?.message}
          {...register("subcity")}
        />
      </div>

      <TextField
        id="exactPlace"
        label="Exact place"
        required
        placeholder="e.g. Ayat, Piassa"
        error={errors.exactPlace?.message}
        {...register("exactPlace")}
      />

      <TextAreaField
        id="aboutMe"
        label="About me"
        maxLength={500}
        rows={5}
        placeholder="Briefly introduce yourself, your strengths, teaching interests, or experience..."
        error={errors.aboutMe?.message}
        value={aboutMe}
        {...register("aboutMe")}
      />
    </div>
  );
}
