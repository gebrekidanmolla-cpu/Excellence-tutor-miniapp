"use client";

import { Lightbulb } from "lucide-react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { TextField } from "@/components/shared/FormFields";
import { ChoiceGroup } from "@/app/register/components/ChoiceGroup";
import { DocumentUpload } from "@/app/register/components/DocumentUpload";
import { FormSection } from "@/app/register/components/FormSection";
import {
  CV_ACCEPT,
  DOCUMENT_ACCEPT,
  ENTRANCE_TOTAL_OPTIONS,
  type FileField,
  type FileState,
  type RegisterValues,
} from "@/app/register/schema";
import {
  CV_MAX_SIZE,
  DOCUMENT_MAX_SIZE,
} from "@/lib/document-rules";

const PHOTO_HINT = "JPG, PNG or WEBP. Large photos are shrunk automatically.";

export function DocumentsStep({
  form,
  files,
  fileErrors,
  filesBusy,
  onFileChange,
}: {
  form: UseFormReturn<RegisterValues>;
  files: FileState;
  fileErrors: Partial<Record<FileField, string>>;
  filesBusy: Partial<Record<FileField, boolean>>;
  onFileChange: (field: FileField, file: File | null) => void;
}) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  const tutorStatus = useWatch({ control, name: "tutorStatus" });
  const entranceScore = useWatch({ control, name: "entranceScore" });
  const entranceTotal = useWatch({ control, name: "entranceTotal" });
  const isGraduate = tutorStatus === "GRADUATE";

  const score = Number(entranceScore);
  const total = Number(entranceTotal);
  const percentage =
    entranceScore?.trim() && Number.isInteger(score) && score >= 0 && score <= total
      ? ((score / total) * 100).toFixed(1)
      : null;

  const upload = (
    field: FileField,
    props: {
      label: string;
      description?: string;
      required?: boolean;
      accept?: string;
      hint?: string;
    }
  ) => (
    <DocumentUpload
      id={field}
      label={props.label}
      description={props.description}
      required={props.required}
      accept={props.accept ?? DOCUMENT_ACCEPT}
      hint={props.hint ?? PHOTO_HINT}
      maxSize={field === "cv" ? CV_MAX_SIZE : DOCUMENT_MAX_SIZE}
      file={files[field]}
      error={fileErrors[field]}
      busy={filesBusy[field]}
      onChange={(file) => onFileChange(field, file)}
    />
  );

  return (
    <div className="space-y-10">
      <FormSection
        title="National entrance exam"
        description="Your university entrance exam result."
      >
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <TextField
            id="entranceScore"
            label="Your score"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 520"
            hint={percentage ? `That's ${percentage}%.` : undefined}
            error={errors.entranceScore?.message}
            {...register("entranceScore")}
          />

          <Controller
            control={control}
            name="entranceTotal"
            render={({ field }) => (
              <ChoiceGroup
                name="entranceTotal"
                legend="Out of"
                required
                options={ENTRANCE_TOTAL_OPTIONS}
                value={field.value ?? ""}
                inputRef={field.ref}
                onChange={field.onChange}
                error={errors.entranceTotal?.message}
              />
            )}
          />
        </div>
      </FormSection>

      <FormSection
        title="Documents"
        description="Clear phone photos are fine."
      >
        <div className="flex gap-3 rounded-xl bg-highlight/10 p-4 text-sm">
          <Lightbulb
            className="mt-0.5 size-4 shrink-0 text-highlight-strong"
            aria-hidden="true"
          />
          <p className="text-pretty text-foreground">
            Take each photo in good light, with all four corners in frame and
            the text sharp enough to read.
          </p>
        </div>

        <div className="space-y-3">
          {upload("governmentId", {
            label: "Government ID",
            description: "A clear photo of a government-issued ID.",
            required: true,
          })}

          {upload("transcript", {
            label: "Transcript",
            description: "Your most recent academic transcript.",
            required: true,
          })}

          {upload("entranceResult", {
            label: "Entrance exam result",
            description: "The result slip showing the score above.",
            required: true,
          })}

          {isGraduate
            ? upload("graduationDocument", {
                label: "Graduation document",
                description: "Temporary or original degree certificate.",
                required: true,
              })
            : null}

          {upload("cv", {
            label: "CV / Resume",
            description: "A photo or a PDF.",
            accept: CV_ACCEPT,
            hint: "JPG, PNG, WEBP or PDF.",
          })}
        </div>
      </FormSection>
    </div>
  );
}
