"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
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
import { ADDRESS_FIELD_LABELS } from "@/lib/address";

type AddressKey = keyof typeof ADDRESS_FIELD_LABELS;

const ADDRESS_NAMES = {
  primary: {
    country: "country",
    city: "city",
    subcity: "subcity",
    woreda: "woreda",
    exactPlace: "exactPlace",
  },
  second: {
    country: "address2Country",
    city: "address2City",
    subcity: "address2Subcity",
    woreda: "address2Woreda",
    exactPlace: "address2ExactPlace",
  },
} as const satisfies Record<string, Record<AddressKey, keyof RegisterValues>>;

const ADDRESS_PLACEHOLDERS: Record<AddressKey, string | undefined> = {
  country: undefined,
  city: "Addis Ababa",
  subcity: "e.g. Bole, Yeka",
  woreda: "e.g. Woreda 03",
  exactPlace: "e.g. 4 Kilo, Ayat, Bethel",
};

function AddressFields({
  form,
  which,
}: {
  form: UseFormReturn<RegisterValues>;
  which: keyof typeof ADDRESS_NAMES;
}) {
  const { register, formState } = form;
  const names = ADDRESS_NAMES[which];

  const field = (key: AddressKey, autoComplete?: string) => (
    <TextField
      id={names[key]}
      label={ADDRESS_FIELD_LABELS[key]}
      required
      placeholder={ADDRESS_PLACEHOLDERS[key]}
      /* Browser autofill only knows one address; keep it off the second. */
      autoComplete={which === "primary" ? autoComplete : "off"}
      error={formState.errors[names[key]]?.message}
      {...register(names[key])}
    />
  );

  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 font-heading text-sm font-medium">
        {which === "primary" ? "Address" : "Second address"}
      </legend>

      <div className="grid gap-5 sm:grid-cols-2">
        {field("country", "country-name")}
        {field("city", "address-level1")}
        {field("subcity")}
        {field("woreda")}
      </div>

      {field("exactPlace")}
    </fieldset>
  );
}

export function PersonalStep({
  form,
  onTutorStatusChange,
}: {
  form: UseFormReturn<RegisterValues>;
  onTutorStatusChange: (status: string) => void;
}) {
  const { register, control, formState, clearErrors } = form;
  const errors = formState.errors;

  const aboutMe = useWatch({ control, name: "aboutMe" });
  const hasSecondAddress = useWatch({ control, name: "hasSecondAddress" });

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

      <AddressFields form={form} which="primary" />

      <Controller
        control={control}
        name="hasSecondAddress"
        render={({ field }) => (
          <label
            htmlFor="hasSecondAddress"
            className="flex cursor-pointer gap-3 rounded-xl border bg-muted/40 p-4 transition-colors hover:bg-muted/70"
          >
            <Checkbox
              id="hasSecondAddress"
              checked={field.value === true}
              onCheckedChange={(checked) => {
                field.onChange(checked === true);

                if (checked !== true) {
                  clearErrors(Object.values(ADDRESS_NAMES.second));
                }
              }}
              className="mt-0.5"
            />

            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Add a second address (optional)
              </span>
              <span className="block text-sm text-muted-foreground text-pretty">
                For example, if you live in a university dorm during the week
                and at your family&apos;s home on weekends.
              </span>
            </span>
          </label>
        )}
      />

      {hasSecondAddress ? (
        <AddressFields form={form} which="second" />
      ) : null}

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
