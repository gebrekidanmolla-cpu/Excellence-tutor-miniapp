"use client";

import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PHOTO_MAX_DIMENSION } from "@/lib/compress-image";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Square crop for the profile photo: drag to position, pinch / slider to
 * zoom, rotate in 90° steps for a sideways phone photo. The result is drawn
 * to a canvas at most `PHOTO_MAX_DIMENSION` wide and handed back as a File,
 * so what gets uploaded is exactly what was framed. The tutor uses it on
 * their own profile and an admin on the tutor's edit page, hence the
 * overridable wording.
 */
export function PhotoCropDialog({
  imageUrl,
  onCancel,
  onConfirm,
  title = "Crop your photo",
  description = "Drag to position your face in the square, and zoom to fit.",
}: {
  /**
   * Object URL of the picked image; the dialog is open while it is set. The
   * caller creates and revokes it — revoking here would break under React's
   * dev-mode effect replay.
   */
  imageUrl: string | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => Promise<void>;
  title?: string;
  description?: string;
}) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [area, setArea] = React.useState<Area | null>(null);
  const [saving, setSaving] = React.useState(false);

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setArea(null);
  }

  async function handleConfirm() {
    if (!imageUrl || !area) {
      return;
    }

    setSaving(true);

    try {
      const cropped = await cropToFile(imageUrl, area, rotation);
      await onConfirm(cropped);
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not crop this image."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={imageUrl !== null}
      onOpenChange={(open) => {
        if (!open && !saving) {
          reset();
          onCancel();
        }
      }}
    >
      {/* The square is sized by whichever is smaller, the dialog's width or
          the viewport height left after the header, controls and footer
          (~18rem) — so the Save button stays on screen on a short phone or
          in landscape. Past that, the dialog itself scrolls. */}
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto sm:max-w-md sm:gap-5"
        showCloseButton={!saving}
      >
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="[@media(max-height:560px)]:hidden">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-square w-full max-w-[max(11rem,calc(100dvh-18rem))] touch-none overflow-hidden rounded-lg bg-foreground">
          {imageUrl ? (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={1}
              cropShape="rect"
              showGrid
              objectFit="cover"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-sm items-center gap-3">
          <ZoomOut className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Zoom"
            className="h-1.5 w-full cursor-pointer accent-primary"
          />
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={() => setRotation((current) => (current + 90) % 360)}
            aria-label="Rotate 90 degrees"
            className="ml-1"
          >
            <RotateCw aria-hidden="true" />
          </Button>
        </div>

        <DialogFooter className="flex-row justify-end">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={saving}
            onClick={() => {
              reset();
              onCancel();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            disabled={saving || !area}
            onClick={handleConfirm}
          >
            {saving ? (
              <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
            ) : null}
            {saving ? "Saving…" : "Save photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   CANVAS
========================================================= */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = src;
  });
}

/**
 * `area` is in the pixel space of the *rotated* image, which is what
 * react-easy-crop reports: draw the whole image rotated onto a canvas the
 * size of its bounding box, then copy the square out of that.
 */
async function cropToFile(
  src: string,
  area: Area,
  rotation: number
): Promise<File> {
  const image = await loadImage(src);
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const boxWidth = image.naturalWidth * cos + image.naturalHeight * sin;
  const boxHeight = image.naturalWidth * sin + image.naturalHeight * cos;

  const rotated = document.createElement("canvas");
  rotated.width = Math.round(boxWidth);
  rotated.height = Math.round(boxHeight);

  const rotatedContext = rotated.getContext("2d");

  if (!rotatedContext) {
    throw new Error("Could not crop this image.");
  }

  rotatedContext.translate(boxWidth / 2, boxHeight / 2);
  rotatedContext.rotate(radians);
  rotatedContext.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2
  );

  const size = Math.min(PHOTO_MAX_DIMENSION, Math.round(area.width));

  const output = document.createElement("canvas");
  output.width = size;
  output.height = size;

  const outputContext = output.getContext("2d");

  if (!outputContext) {
    throw new Error("Could not crop this image.");
  }

  outputContext.imageSmoothingQuality = "high";
  outputContext.drawImage(
    rotated,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size,
    size
  );

  const blob = await encode(output);

  return new File([blob], `profile-photo.${blob.type === "image/webp" ? "webp" : "jpg"}`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

/** WebP where the browser can encode it, JPEG otherwise (see compress-image.ts). */
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88));

  const webp = await toBlob("image/webp");

  if (webp && webp.type === "image/webp") {
    return webp;
  }

  const jpeg = await toBlob("image/jpeg");

  if (!jpeg) {
    throw new Error("Could not crop this image.");
  }

  return jpeg;
}
