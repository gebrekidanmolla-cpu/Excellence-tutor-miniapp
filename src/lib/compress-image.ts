/**
 * Client-side image compression for tutor documents.
 *
 * Registration uploads three to five photographed documents. Straight off a
 * phone camera each is several megabytes, which makes them both the bulk of
 * the storage bill and — on an Ethiopian mobile connection — the slowest part
 * of signing up, i.e. the step people abandon. Re-encoding in the browser
 * first takes a typical document photo from megabytes to a few hundred
 * kilobytes while staying legible at the size an admin actually reads it.
 *
 * Browser-only: this touches `createImageBitmap`, `document` and `canvas`, so
 * it may only be called from a client component's event handler.
 *
 * `compressImage` never throws and never rejects a file. Every failure path
 * returns the original, because compression is an optimisation and not a
 * gate — `validateDocument` in `src/app/register/schema.ts` stays the one
 * thing that decides whether a file is acceptable.
 */

/**
 * Longest edge, in pixels. Transcripts are the demanding case: they are dense
 * grade tables, and the whole point of collecting one is that somebody can
 * read it. 2000px keeps rows of small print sharp; dropping it further is
 * where legibility starts to go.
 */
const MAX_DIMENSION = 2000;

const QUALITY = 0.82;

/** Below this, re-encoding costs CPU on a cheap phone and saves nothing. */
const MIN_INPUT_SIZE = 150 * 1024;

/**
 * Above this, decoding could stall a low-end device for seconds. Such a file
 * is passed through untouched and `validateDocument` rejects it on size,
 * which is the message the tutor needs anyway.
 */
const MAX_INPUT_SIZE = 25 * 1024 * 1024;

const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const TARGET_TYPE = "image/webp";
const FALLBACK_TYPE = "image/jpeg";

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

export async function compressImage(file: File): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  // PDFs (CVs) and anything unexpected pass straight through.
  if (!COMPRESSIBLE_TYPES.includes(file.type)) {
    return file;
  }

  if (file.size < MIN_INPUT_SIZE || file.size > MAX_INPUT_SIZE) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await decode(file);

    const { width, height } = fit(bitmap.width, bitmap.height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await encode(canvas);

    // An already-optimised upload can come back larger than it went in.
    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], rename(file.name, blob.type), {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

/**
 * `imageOrientation` is what keeps a portrait photo from being written back
 * sideways: canvas ignores EXIF rotation, so it has to be baked in at decode.
 * Older engines reject the options argument outright, hence the retry.
 */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

function fit(width: number, height: number) {
  const largest = Math.max(width, height);

  if (largest <= MAX_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_DIMENSION / largest;

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * A browser without WebP encoding does not fail here — `toBlob` quietly hands
 * back a PNG instead, which for a photograph is far larger than the original.
 * Checking the type it actually produced is what catches that.
 */
async function encode(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const preferred = await toBlob(canvas, TARGET_TYPE);

  if (preferred && preferred.type === TARGET_TYPE) {
    return preferred;
  }

  return toBlob(canvas, FALLBACK_TYPE);
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, QUALITY);
  });
}

function rename(name: string, type: string): string {
  const extension = EXTENSIONS[type] ?? "jpg";
  const base = name.replace(/\.[^.]+$/, "").trim() || "document";

  return `${base}.${extension}`;
}
