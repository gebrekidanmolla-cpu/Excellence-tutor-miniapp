"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { Separator } from "@/components/ui/separator";
import {
  FileUploadField,
  SectionHeading,
  SelectField,
  TextField,
} from "@/components/shared/FormFields";
import {
  CV_ACCEPT,
  DOCUMENT_ACCEPT,
  ENTRANCE_TOTAL_OPTIONS,
  type FileField,
  type FileState,
  type RegisterValues,
} from "@/app/register/schema";

export function DocumentsStep({
  form,
  files,
  fileErrors,
  onFileChange,
}: {
  form: UseFormReturn<RegisterValues>;
  files: FileState;
  fileErrors: Partial<Record<FileField, string>>;
  onFileChange: (field: FileField, file: File | null) => void;
}) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  const isGraduate =
    useWatch({ control, name: "tutorStatus" }) === "GRADUATE";

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Entrance result & documents"
        description="Enter your entrance result and upload the required documents."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="entranceScore"
          label="Score"
          required
          type="number"
          min="0"
          placeholder="e.g. 520"
          error={errors.entranceScore?.message}
          {...register("entranceScore")}
        />

        <Controller
          control={control}
          name="entranceTotal"
          render={({ field }) => (
            <SelectField
              id="entranceTotal"
              label="Out of"
              required
              options={ENTRANCE_TOTAL_OPTIONS}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              error={errors.entranceTotal?.message}
            />
          )}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="font-heading text-base font-medium">Documents</h3>

        <FileUploadField
          id="transcript"
          label="Transcript"
          required
          accept={DOCUMENT_ACCEPT}
          hint="JPG, JPEG, PNG or WEBP — max 2MB"
          file={files.transcript}
          error={fileErrors.transcript}
          onChange={(file) => onFileChange("transcript", file)}
        />

        <FileUploadField
          id="entranceResult"
          label="Entrance Result"
          required
          accept={DOCUMENT_ACCEPT}
          hint="JPG, JPEG, PNG or WEBP — max 2MB"
          file={files.entranceResult}
          error={fileErrors.entranceResult}
          onChange={(file) => onFileChange("entranceResult", file)}
        />

        <FileUploadField
          id="governmentId"
          label="Government ID"
          required
          accept={DOCUMENT_ACCEPT}
          hint="JPG, JPEG, PNG or WEBP — max 2MB"
          file={files.governmentId}
          error={fileErrors.governmentId}
          onChange={(file) => onFileChange("governmentId", file)}
        />

        {isGraduate ? (
          <FileUploadField
            id="graduationDocument"
            label="Graduation Document"
            required
            accept={DOCUMENT_ACCEPT}
            hint="Temporary or Original — JPG, JPEG, PNG or WEBP — max 2MB"
            file={files.graduationDocument}
            error={fileErrors.graduationDocument}
            onChange={(file) => onFileChange("graduationDocument", file)}
          />
        ) : null}

        <FileUploadField
          id="cv"
          label="CV / Resume"
          accept={CV_ACCEPT}
          hint="Optional — JPG, JPEG, PNG, WEBP or PDF — max 5MB"
          file={files.cv}
          error={fileErrors.cv}
          onChange={(file) => onFileChange("cv", file)}
        />
      </div>
    </div>
  );
}
