"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextAreaField, TextField } from "@/components/shared/FormFields";
import { FormError } from "@/components/shared/ErrorState";
import {
  AddAddressButton,
  SecondAddressCard,
} from "@/components/shared/SecondAddress";
import { ChoiceGroup } from "@/app/register/components/ChoiceGroup";
import {
  ABOUT_ME_MAX_LENGTH,
  EMPLOYMENT_STATUS_OPTIONS,
} from "@/app/register/schema";
import { ADDRESS_FIELD_LABELS } from "@/lib/address";
import { normalizeEthiopianPhone } from "@/lib/phone";
import { ABOUT_ME_MIN_LENGTH } from "@/lib/profile-strength";
import {
  needsCurrentJob,
  profileEditSchema,
  type ProfileEditValues,
} from "@/lib/tutor-profile-edit";

type AddressKey = keyof typeof ADDRESS_FIELD_LABELS;

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
} as const satisfies Record<string, Record<AddressKey, keyof ProfileEditValues>>;

const ADDRESS_PLACEHOLDERS: Record<AddressKey, string | undefined> = {
  country: undefined,
  city: "Addis Ababa",
  subcity: "e.g. Bole, Yeka",
  exactPlace: "e.g. 4 Kilo, Ayat, Bethel",
};

/* Short labels for the chip row; the stored values are "1"–"5". */
const YEAR_CHOICES = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "5", label: "5th+" },
];

function Card({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 space-y-5 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
    >
      <div className="space-y-0.5">
        <h2 className="font-heading font-medium">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function AddressFields({
  form,
  which,
}: {
  form: UseFormReturn<ProfileEditValues>;
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
      autoComplete={which === "primary" ? autoComplete : "off"}
      error={formState.errors[names[key]]?.message}
      {...register(names[key])}
    />
  );

  return (
    <fieldset className="min-w-0">
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

export function ProfileEditForm({
  defaultValues,
}: {
  defaultValues: ProfileEditValues;
}) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues,
    mode: "onTouched",
  });

  const {
    control,
    register,
    setValue,
    setError,
    clearErrors,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const phone = useWatch({ control, name: "phone" });
  const aboutMe = useWatch({ control, name: "aboutMe" });
  const hasSecondAddress = useWatch({ control, name: "hasSecondAddress" });
  const employmentStatus = useWatch({ control, name: "employmentStatus" });

  const isStudent = defaultValues.tutorStatus === "STUDENT";
  const aboutMeLength = aboutMe.trim().length;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const response = await fetch("/api/tutor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = (await response.json().catch(() => null)) as {
        message?: string;
        field?: string;
      } | null;

      if (!response.ok) {
        const message = body?.message || "Couldn't save your profile.";

        if (body?.field && body.field in defaultValues) {
          setError(
            body.field as keyof ProfileEditValues,
            { message },
            { shouldFocus: true }
          );
        } else {
          setFormError(message);
        }

        return;
      }

      toast.success("Your profile has been updated.");
      router.push("/tutor/profile");
      router.refresh();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* -----------------------------------------------------
          ABOUT ME
      ----------------------------------------------------- */}
      <Card
        id="about"
        title="About me"
        description="Families read this first. Mention your subjects, grade levels, experience and how you like to teach."
      >
        <TextAreaField
          id="aboutMe"
          label="Introduction"
          maxLength={ABOUT_ME_MAX_LENGTH}
          rows={6}
          placeholder="e.g. I'm a 4th-year engineering student who has tutored grade 9–12 maths and physics for two years…"
          hint={
            aboutMeLength < ABOUT_ME_MIN_LENGTH
              ? `Write at least ${ABOUT_ME_MIN_LENGTH} characters to complete this part of your profile.`
              : undefined
          }
          error={errors.aboutMe?.message}
          value={aboutMe}
          {...register("aboutMe")}
        />
      </Card>

      {/* -----------------------------------------------------
          CONTACT
      ----------------------------------------------------- */}
      <Card
        title="Contact"
        description="The number the Excellence Tutor team calls about jobs."
      >
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone number
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </Label>

          <div className="flex">
            <span className="inline-flex h-11 shrink-0 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
              +251
            </span>

            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              size="xl"
              maxLength={9}
              placeholder="912 345 678"
              value={phone}
              onChange={(event) =>
                setValue("phone", normalizeEthiopianPhone(event.target.value), {
                  shouldValidate: form.formState.isSubmitted,
                  shouldDirty: true,
                })
              }
              onBlur={() => form.trigger("phone")}
              className="rounded-l-none tabular-nums"
              aria-invalid={Boolean(errors.phone) || undefined}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
            />
          </div>

          {errors.phone ? (
            <p id="phone-error" className="text-sm text-destructive">
              {errors.phone.message}
            </p>
          ) : (
            <p id="phone-hint" className="text-xs text-muted-foreground">
              Enter the 9 digits after +251.
            </p>
          )}
        </div>
      </Card>

      {/* -----------------------------------------------------
          LOCATION
      ----------------------------------------------------- */}
      <Card
        title="Where you live"
        description="Helps us match you with families nearby."
      >
        <AddressFields form={form} which="primary" />

        {hasSecondAddress ? (
          <SecondAddressCard
            onRemove={() => {
              setValue("hasSecondAddress", false, { shouldDirty: true });
              clearErrors(Object.values(ADDRESS_NAMES.second));
            }}
          >
            <AddressFields form={form} which="second" />
          </SecondAddressCard>
        ) : (
          <AddAddressButton
            onClick={() =>
              setValue("hasSecondAddress", true, { shouldDirty: true })
            }
            description="For example, a university dorm during the week and your family's home on weekends."
          />
        )}
      </Card>

      {/* -----------------------------------------------------
          EDUCATION / EMPLOYMENT
      ----------------------------------------------------- */}
      {isStudent ? (
        <Card
          title="Studies"
          description="Moved up a year? Keep this current."
        >
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
        </Card>
      ) : (
        <Card title="Employment" description="Let us know if your work changes.">
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

                  if (!needsCurrentJob(value)) {
                    clearErrors("currentJob");
                  }
                }}
                error={errors.employmentStatus?.message}
              />
            )}
          />

          {needsCurrentJob(employmentStatus) ? (
            <TextField
              id="currentJob"
              label="Current job"
              required
              placeholder="e.g. Junior accountant at …"
              error={errors.currentJob?.message}
              {...register("currentJob")}
            />
          ) : null}
        </Card>
      )}

      <FormError message={formError} />

      {/* -----------------------------------------------------
          ACTIONS — pinned above the mobile tab bar.
      ----------------------------------------------------- */}
      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-end gap-2 rounded-xl border bg-background/90 p-3 shadow-lg backdrop-blur-xl lg:bottom-4">
        <Button
          render={<Link href="/tutor/profile" prefetch={false} />}
          variant="ghost"
          size="xl"
        >
          Cancel
        </Button>

        <Button type="submit" size="xl" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? (
            <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
