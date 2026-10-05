"use client";

import * as React from "react";
import {
  AlertCircle,
  FileText,
  ImageUp,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMegabytes } from "@/lib/document-rules";
import { cn } from "@/lib/utils";

/*
 * One preview URL per picked File, created on first render and reused after.
 * Kept outside React state so Strict Mode's double effects can't revoke a URL
 * that is still on screen; the handful of blobs are released with the page.
 */
const previewUrls = new WeakMap<File, string>();

function previewUrlFor(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return null;
  }

  let url = previewUrls.get(file);

  if (!url) {
    url = URL.createObjectURL(file);
    previewUrls.set(file, url);
  }

  return url;
}

/**
 * A document picker with drag-and-drop, a thumbnail of the chosen photo and
 * clear replace/remove actions. The real `<input type="file">` stays in the
 * DOM (visually hidden) so it keeps native keyboard and screen-reader
 * behaviour; the whole empty tile is its `<label>`, so one tap opens the
 * camera or file picker on a phone.
 */
export function DocumentUpload({
  id,
  label,
  description,
  hint,
  maxSize,
  accept,
  file,
  error,
  required,
  busy,
  onChange,
}: {
  id: string;
  label: string;
  /** What a good upload looks like, e.g. "Front side, all corners visible". */
  description?: string;
  hint: string;
  /** The per-file limit, shown on the card instead of the file's own size. */
  maxSize: number;
  accept: string;
  file: File | null;
  error?: string;
  required?: boolean;
  /** The picked file is still being compressed — see `compress-image.ts`. */
  busy?: boolean;
  onChange: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const preview = file ? previewUrlFor(file) : null;
  const messageId = error ? `${id}-error` : `${id}-hint`;

  function pick(next: File | null) {
    onChange(next);

    // Clearing the input lets the same file be picked again after removal.
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const input = (
    <input
      id={id}
      ref={inputRef}
      type="file"
      accept={accept}
      className="sr-only"
      disabled={busy}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={messageId}
      onChange={(event) => pick(event.target.files?.[0] ?? null)}
    />
  );

  const heading = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold">
      {label}
      <span className="text-xs font-normal text-muted-foreground">
        Max {formatMegabytes(maxSize, 0)}
      </span>
      {required ? (
        <span className="sr-only">(required)</span>
      ) : (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Optional
        </span>
      )}
    </span>
  );

  return (
    <div className="space-y-1.5">
      {file && !busy ? (
        /* ---------------- CHOSEN ---------------- */
        <div className="flex items-center gap-3.5 rounded-xl border border-success/40 bg-success/[0.04] p-3 sm:p-3.5">
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
            {preview ? (
              // A local blob preview: next/image can't optimise it.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <FileText className="size-6" aria-hidden="true" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {heading}
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {file.name}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={() => inputRef.current?.click()}
              aria-label={`Replace ${label}`}
              title="Replace"
              className="text-muted-foreground"
            >
              <RefreshCw />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={() => pick(null)}
              aria-label={`Remove ${label}`}
              title="Remove"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>

          {input}
        </div>
      ) : (
        /* ---------------- EMPTY / BUSY ---------------- */
        <label
          htmlFor={id}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);

            const dropped = event.dataTransfer.files?.[0];

            if (dropped && !busy) {
              pick(dropped);
            }
          }}
          className={cn(
            "flex cursor-pointer items-center gap-3.5 rounded-xl border border-dashed p-3 transition-colors sm:p-3.5",
            "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
            error
              ? "border-destructive/60 bg-destructive/[0.04]"
              : dragging
                ? "border-primary bg-primary/5"
                : "border-input hover:border-primary/50 hover:bg-primary/[0.03]",
            busy && "cursor-progress"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-lg",
              error
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            )}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : error ? (
              <AlertCircle className="size-5" />
            ) : (
              <ImageUp className="size-5" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            {heading}
            <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">
              {busy ? "Optimising your photo…" : (description ?? hint)}
            </span>
          </span>

          <span
            aria-hidden="true"
            className="hidden shrink-0 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium shadow-xs sm:inline-block"
          >
            {dragging ? "Drop file" : "Browse"}
          </span>

          {input}
        </label>
      )}

      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="sr-only">
          {hint}
        </p>
      )}
    </div>
  );
}
