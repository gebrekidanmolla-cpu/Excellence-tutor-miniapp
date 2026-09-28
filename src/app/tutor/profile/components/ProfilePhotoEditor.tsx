"use client";

import * as React from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

import { ALLOWED_DOCUMENT_TYPES, PHOTO_ACCEPT } from "@/lib/document-rules";
import { PHOTO_MAX_DIMENSION } from "@/lib/compress-image";
import { PhotoCropDialog } from "./PhotoCropDialog";
import { useTutorFile } from "./useTutorFile";

/** Past this, decoding for the cropper could stall a cheap phone. */
const MAX_PICKED_SIZE = 25 * 1024 * 1024;

/**
 * The tutor's portrait with change / remove controls. A picked image opens
 * in a square crop dialog first; only the cropped result (at most
 * `PHOTO_MAX_DIMENSION` px) is uploaded, and it is shown from a local object
 * URL straight away rather than waiting for the refreshed page.
 */
export function ProfilePhotoEditor({
  photoUrl,
  initials,
  children,
}: {
  photoUrl: string | null;
  initials: string;
  /** Shown beside the photo, above the controls — the tutor's name. */
  children?: React.ReactNode;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { upload, remove, busy } = useTutorFile("photo", {
    maxDimension: PHOTO_MAX_DIMENSION,
  });

  /* `undefined` = show what the server sent; otherwise a local override. */
  const [override, setOverride] = React.useState<string | null | undefined>();
  const objectUrl = React.useRef<string | null>(null);

  React.useEffect(
    () => () => {
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
      }
    },
    []
  );

  /* Object URL of the image being cropped; the crop dialog is open while set. */
  const [cropSource, setCropSource] = React.useState<string | null>(null);

  React.useEffect(
    () => () => {
      if (cropSource) {
        URL.revokeObjectURL(cropSource);
      }
    },
    [cropSource]
  );

  const shown = override === undefined ? photoUrl : override;

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";

    if (!picked) {
      return;
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(picked.type)) {
      toast.error("Please choose a JPG, PNG or WEBP image.");
      return;
    }

    if (picked.size > MAX_PICKED_SIZE) {
      toast.error("That image is too large. Please choose a smaller photo.");
      return;
    }

    setCropSource(URL.createObjectURL(picked));
  }

  async function handleCropped(cropped: File) {
    const uploaded = await upload(cropped);

    // On failure the dialog stays open, so the tutor can simply retry.
    if (!uploaded) {
      return;
    }

    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
    }

    objectUrl.current = URL.createObjectURL(uploaded);
    setOverride(objectUrl.current);
    setCropSource(null);
  }

  return (
    <div id="photo" className="flex scroll-mt-24 flex-wrap items-center gap-5">
      <div className="relative shrink-0">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local object URL or a 302 to a presigned R2 URL
          <img
            src={shown}
            alt="Your profile photo"
            className="size-20 rounded-2xl object-cover ring-1 ring-foreground/10 sm:size-24"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-[color-mix(in_oklch,var(--primary),var(--highlight)_40%)] font-heading text-2xl font-semibold text-primary-foreground sm:size-24"
          >
            {initials}
          </span>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          aria-label={shown ? "Change profile photo" : "Add profile photo"}
          className="absolute -right-2 -bottom-2 flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-4 ring-card transition-transform hover:scale-105 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
        >
          {busy === "upload" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="size-4" aria-hidden="true" />
          )}
        </button>

        {busy === "upload" ? (
          <span className="absolute inset-0 rounded-2xl bg-background/50" aria-hidden="true" />
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFile}
      />

      <PhotoCropDialog
        imageUrl={cropSource}
        onCancel={() => setCropSource(null)}
        onConfirm={handleCropped}
      />

      <div className="min-w-0 flex-1 space-y-3">
        {children}

        {shown ? null : (
          <p className="text-sm text-muted-foreground text-pretty">
            Add a clear, friendly photo of your face — it helps families
            recognise you. JPG, PNG or WEBP.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => inputRef.current?.click()}
          >
            <Camera data-icon="inline-start" aria-hidden="true" />
            {busy === "upload"
              ? "Uploading…"
              : shown
                ? "Change photo"
                : "Upload photo"}
          </Button>

          {shown ? (
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 data-icon="inline-start" aria-hidden="true" />
                  Remove
                </Button>
              }
              title="Remove your profile photo?"
              description="Your profile will show your initials instead. You can add a new photo at any time."
              confirmLabel="Remove photo"
              variant="destructive"
              onConfirm={async () => {
                await remove();
                setOverride(null);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
