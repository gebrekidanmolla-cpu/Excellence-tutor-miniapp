"use client";

import { BookOpen, GraduationCap } from "lucide-react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import {
  AddAddressButton,
  SecondAddressCard,
} from "@/components/shared/SecondAddress";
import { TextAreaField, TextField } from "@/components/shared/FormFields";
import { ChoiceGroup, type Choice } from "@/app/register/components/ChoiceGroup";
import { FormSection } from "@/app/register/components/FormSection";
import {
  ABOUT_ME_MAX_LENGTH,
  GENDER_OPTIONS,
  type RegisterValues,
} from "@/app/register/schema";
import { ADDRESS_FIELD_LABELS } from "@/lib/address";

type AddressKey = keyof typeof ADDRESS_FIELD_LABELS;

const TUTOR_STATUS_CHOICES: Choice[] = [
  {
    value: "STUDENT",
    label: "University student",
    description: "Currently enrolled at a university or college.",
    icon: BookOpen,
  },
  {
    value: "GRADUATE",
    label: "Graduate",
    description: "You have completed your degree.",
    icon: GraduationCap,
  },
];

const ADDRESS_NAMES = {
  primary: {
    country: "country",
    city: "city",
    subcity: "subcity",
    exactPlace: "exactPlace",
  },
  second: {
    country: "address2Country",
    city: "address2City",
    subcity: "address2Subcity",
    exactPlace: "address2ExactPlace",
  },
} as const satisfies Record<string, Record<AddressKey, keyof RegisterValues>>;

const ADDRESS_PLACEHOLDERS: Record<AddressKey, string | undefined> = {
  country: undefined,
  city: "Addis Ababa",
  subcity: "e.g. Bole, Yeka",
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
    <fieldset className="min-w-0">
      {/* The visible title is the enclosing section or card header. */}
      <legend className="sr-only">
        {which === "primary" ? "Address" : "Second address"}
      </legend>

      <div className="grid gap-5 sm:grid-cols-2">
        {field("country", "country-name")}
        {field("city", "address-level1")}
        {field("subcity")}
        {field("exactPlace")}
      </div>
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
  const { register, control, formState, clearErrors, setValue } = form;
  const errors = formState.errors;

  const aboutMe = useWatch({ control, name: "aboutMe" });
  const hasSecondAddress = useWatch({ control, name: "hasSecondAddress" });

  return (
    <div className="space-y-10">
      <FormSection title="About you">
        <Controller
          control={control}
          name="tutorStatus"
          render={({ field }) => (
            <ChoiceGroup
              name="tutorStatus"
              legend="Which describes you?"
              required
              variant="card"
              options={TUTOR_STATUS_CHOICES}
              value={field.value ?? ""}
              inputRef={field.ref}
              onChange={(value) => {
                field.onChange(value);
                onTutorStatusChange(value);
              }}
              hint="This decides which education details we ask for next."
              error={errors.tutorStatus?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <ChoiceGroup
              name="gender"
              legend="Gender"
              required
              options={GENDER_OPTIONS}
              value={field.value ?? ""}
              inputRef={field.ref}
              onChange={field.onChange}
              error={errors.gender?.message}
            />
          )}
        />
      </FormSection>

      <FormSection
        title="Where you live"
        description="Helps us match you with families nearby."
      >
        <AddressFields form={form} which="primary" />

        {hasSecondAddress ? (
          <SecondAddressCard
            onRemove={() => {
              setValue("hasSecondAddress", false);
              clearErrors(Object.values(ADDRESS_NAMES.second));
            }}
          >
            <AddressFields form={form} which="second" />
          </SecondAddressCard>
        ) : (
          <AddAddressButton
            onClick={() => setValue("hasSecondAddress", true)}
            description="For example, a university dorm during the week and your family's home on weekends."
          />
        )}
      </FormSection>

      <FormSection title="Introduce yourself">
        <TextAreaField
          id="aboutMe"
          label="About me"
          maxLength={ABOUT_ME_MAX_LENGTH}
          rows={5}
          placeholder="Briefly introduce yourself, your strengths, teaching interests, or experience..."
          error={errors.aboutMe?.message}
          value={aboutMe}
          {...register("aboutMe")}
        />
      </FormSection>
    </div>
  );
}
