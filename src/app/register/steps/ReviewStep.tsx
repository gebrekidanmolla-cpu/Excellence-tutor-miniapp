"use client";

import { Check, Pencil, X } from "lucide-react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { formatAddress } from "@/lib/address";
import { formatEnum } from "@/lib/format";
import {
  CURRENT_YEAR_OPTIONS,
  type FileState,
  type RegisterValues,
  type Step,
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

/** One card per wizard step, each with a shortcut back to that step. */
function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: Step;
  onEdit: (step: Step) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-muted/25 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(step)}
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          <Pencil data-icon="inline-start" aria-hidden="true" />
          Edit
        </Button>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ReviewStep({
  form,
  files,
  onEdit,
}: {
  form: UseFormReturn<RegisterValues>;
  files: FileState;
  onEdit: (step: Step) => void;
}) {
  const { control, formState } = form;

  const values = useWatch({ control }) as RegisterValues;
  const isStudent = values.tutorStatus === "STUDENT";
  const isGraduate = values.tutorStatus === "GRADUATE";

  return (
    <div className="space-y-4">
      <ReviewSection title="Account" step={1} onEdit={onEdit}>
        <InfoGrid>
          <InfoItem label="Full name" value={values.fullName} />
          <InfoItem label="Email" value={values.email} />
          <InfoItem
            label="Phone"
            value={values.phone ? `+251 ${values.phone}` : ""}
          />
        </InfoGrid>
      </ReviewSection>

      <ReviewSection title="Personal" step={2} onEdit={onEdit}>
        <InfoGrid>
          <InfoItem label="Gender" value={formatEnum(values.gender)} />
          <InfoItem label="Status" value={formatEnum(values.tutorStatus)} />
          <InfoItem label="Address" value={formatAddress(values)} />
          {values.hasSecondAddress ? (
            <InfoItem
              label="Second address"
              value={formatAddress({
                country: values.address2Country,
                city: values.address2City,
                subcity: values.address2Subcity,
                exactPlace: values.address2ExactPlace,
              })}
            />
          ) : null}
        </InfoGrid>

        {values.aboutMe ? (
          <>
            <Separator className="my-4" />
            <InfoItem label="About me" value={values.aboutMe} />
          </>
        ) : null}
      </ReviewSection>

      <ReviewSection
        title={isStudent ? "Education" : "Graduation & employment"}
        step={3}
        onEdit={onEdit}
      >
        <InfoGrid>
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
        </InfoGrid>
      </ReviewSection>

      <ReviewSection title="Entrance & documents" step={4} onEdit={onEdit}>
        <InfoGrid>
          <InfoItem
            label="Entrance result"
            value={
              values.entranceScore
                ? `${values.entranceScore} / ${values.entranceTotal}`
                : ""
            }
          />
        </InfoGrid>

        <ul className="mt-5 space-y-3">
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
      </ReviewSection>

      <Controller
        control={control}
        name="confirmation"
        render={({ field }) => (
          <div className="space-y-2">
            <label
              htmlFor="confirmation"
              className="mt-2 flex cursor-pointer gap-3 rounded-xl border bg-primary/[0.03] p-4 transition-colors hover:bg-primary/5 has-[[data-checked]]:border-primary/40"
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
