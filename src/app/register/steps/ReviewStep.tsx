"use client";

import { Check, X } from "lucide-react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { SectionHeading } from "@/components/shared/FormFields";
import { formatEnum } from "@/lib/format";
import {
  CURRENT_YEAR_OPTIONS,
  type FileState,
  type RegisterValues,
} from "@/app/register/schema";
import { cn } from "@/lib/utils";

function yearLabel(value: string): string {
  return (
    CURRENT_YEAR_OPTIONS.find((option) => option.value === value)?.label ?? "—"
  );
}

function DocumentRow({
  label,
  file,
  optional,
}: {
  label: string;
  file: File | null;
  optional?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full [&>svg]:size-3",
          file
            ? "bg-success/15 text-success"
            : "bg-muted text-muted-foreground"
        )}
      >
        {file ? <Check /> : <X />}
      </span>

      <span className="shrink-0 text-muted-foreground">{label}</span>

      <span className="min-w-0 flex-1 truncate text-right font-medium">
        {file ? file.name : optional ? "Not provided" : "Missing"}
      </span>
    </li>
  );
}

export function ReviewStep({
  form,
  files,
}: {
  form: UseFormReturn<RegisterValues>;
  files: FileState;
}) {
  const { control, formState } = form;

  const values = useWatch({ control }) as RegisterValues;
  const isStudent = values.tutorStatus === "STUDENT";
  const isGraduate = values.tutorStatus === "GRADUATE";

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Review & confirm"
        description="Please make sure your information is accurate before creating your account."
      />

      <section className="rounded-xl border p-5">
        <h3 className="font-heading text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Account
        </h3>

        <InfoGrid className="mt-4">
          <InfoItem label="Full name" value={values.fullName} />
          <InfoItem label="Email" value={values.email} />
          <InfoItem
            label="Phone"
            value={values.phone ? `+251 ${values.phone}` : ""}
          />
          <InfoItem label="Gender" value={formatEnum(values.gender)} />
          <InfoItem
            label="Location"
            value={[values.city, values.subcity, values.exactPlace]
              .filter(Boolean)
              .join(", ")}
          />
          <InfoItem label="Status" value={formatEnum(values.tutorStatus)} />
        </InfoGrid>

        {values.aboutMe ? (
          <>
            <Separator className="my-4" />
            <InfoItem label="About me" value={values.aboutMe} />
          </>
        ) : null}
      </section>

      <section className="rounded-xl border p-5">
        <h3 className="font-heading text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {isStudent ? "Education" : "Graduation & employment"}
        </h3>

        <InfoGrid className="mt-4">
          {isStudent ? (
            <>
              <InfoItem label="University" value={values.university} />
              <InfoItem label="Department" value={values.department} />
              <InfoItem
                label="Current year"
                value={yearLabel(values.currentYear)}
              />
              <InfoItem label="Current GPA" value={values.currentGPA} />
            </>
          ) : null}

          {isGraduate ? (
            <>
              <InfoItem
                label="Field of graduation"
                value={values.fieldOfGraduation}
              />
              <InfoItem
                label="University"
                value={values.universityGraduatedFrom}
              />
              <InfoItem label="CGPA" value={values.CGPA} />
              <InfoItem
                label="Employment"
                value={formatEnum(values.employmentStatus)}
              />
              {values.currentJob ? (
                <InfoItem label="Current job" value={values.currentJob} />
              ) : null}
            </>
          ) : null}

          <InfoItem
            label="Entrance result"
            value={
              values.entranceScore
                ? `${values.entranceScore} / ${values.entranceTotal}`
                : ""
            }
          />
        </InfoGrid>
      </section>

      <section className="rounded-xl border p-5">
        <h3 className="font-heading text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Documents
        </h3>

        <ul className="mt-4 space-y-3">
          <DocumentRow label="Transcript" file={files.transcript} />
          <DocumentRow
            label="Entrance result"
            file={files.entranceResult}
          />
          <DocumentRow label="Government ID" file={files.governmentId} />
          {isGraduate ? (
            <DocumentRow
              label="Graduation document"
              file={files.graduationDocument}
            />
          ) : null}
          <DocumentRow label="CV / Resume" file={files.cv} optional />
        </ul>
      </section>

      <Controller
        control={control}
        name="confirmation"
        render={({ field }) => (
          <div className="space-y-2">
            <label
              htmlFor="confirmation"
              className="flex cursor-pointer gap-3 rounded-xl border bg-muted/40 p-4 transition-colors hover:bg-muted/70"
            >
              <Checkbox
                id="confirmation"
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={
                  Boolean(formState.errors.confirmation) || undefined
                }
                className="mt-0.5"
              />

              <span className="text-sm leading-relaxed text-pretty">
                I confirm that the information I have provided is accurate and
                complete. I understand that Excellence Tutor may review my
                information and documents before accepting me as a tutor.
              </span>
            </label>

            {formState.errors.confirmation ? (
              <p className="text-sm text-destructive">
                {formState.errors.confirmation.message}
              </p>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
