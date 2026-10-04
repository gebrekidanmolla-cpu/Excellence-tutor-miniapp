"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Maximize2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GalleryDocument = {
  id: string;
  title: string;
  /** Short line under the title on the card. */
  caption: string;
  href: string;
  /**
   * Where the preview `<img>` loads from, when that differs from `href`.
   * The admin application page passes a URL signed while it rendered, so
   * its previews cost no request to the app; `href` stays the route that
   * signs a fresh URL, for "Open original".
   */
  previewSrc?: string;
  /** Images open in the lightbox; a PDF opens in a new tab. */
  kind: "image" | "pdf";
};

/**
 * A tutor's documents, each shown whole on the page, with a lightbox for a
 * closer look that steps through with the arrow buttons or the keyboard. A
 * PDF (only ever the CV) cannot be previewed reliably on phones, so its card
 * opens it in a new tab instead. Used by the public tutor profile and the
 * admin application page.
 *
 * Plain <img>s throughout: `next/image` would copy these private documents
 * into the optimizer's cache, where they would outlive a revoked link.
 */
export function DocumentGallery({
  documents,
}: {
  documents: GalleryDocument[];
}) {
  const images = documents.filter((document) => document.kind === "image");

  const [active, setActive] = React.useState<number | null>(null);

  const current = active === null ? null : images[active];

  const step = React.useCallback(
    (delta: number) =>
      setActive((index) =>
        index === null
          ? index
          : (index + delta + images.length) % images.length
      ),
    [images.length]
  );

  return (
    <>
      {/* Masonry columns: every document is shown whole at its own aspect
          ratio, so nothing is cropped and tall scans don't stretch a row. */}
      <ul className="columns-1 gap-5 lg:columns-2 [&>li]:mb-5 [&>li]:break-inside-avoid">
        {documents.map((document) => (
          <li key={document.id}>
            {document.kind === "image" ? (
              <button
                type="button"
                onClick={() =>
                  setActive(
                    images.findIndex((image) => image.id === document.id)
                  )
                }
                className="group block w-full overflow-hidden rounded-2xl bg-card text-left ring-1 ring-foreground/10 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
              >
                <CardLabel
                  document={document}
                  action={
                    <>
                      <Maximize2 className="size-3" aria-hidden="true" />
                      <span className="sr-only min-[400px]:not-sr-only">
                        Enlarge
                      </span>
                    </>
                  }
                />

                <div className="border-t bg-muted/60 p-2 sm:p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={document.previewSrc ?? document.href}
                    alt={document.title}
                    loading="lazy"
                    className="mx-auto block h-auto min-h-32 w-full rounded-lg bg-muted object-contain"
                  />
                </div>
              </button>
            ) : (
              <a
                href={document.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-2xl bg-gradient-to-br from-primary/[0.07] via-card to-highlight/10 ring-1 ring-foreground/10 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
              >
                <CardLabel
                  document={document}
                  icon={
                    <span className="font-mono text-[0.625rem] font-semibold tracking-wider">
                      PDF
                    </span>
                  }
                  action={
                    <>
                      <ExternalLink className="size-3" aria-hidden="true" />
                      <span className="sr-only min-[400px]:not-sr-only">
                        Open
                      </span>
                    </>
                  }
                />
              </a>
            )}
          </li>
        ))}
      </ul>

      <Dialog
        open={current !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <DialogContent
          className="gap-3 p-3 sm:max-w-4xl sm:p-4"
          onKeyDown={(event) => {
            if (images.length < 2) return;
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
          }}
        >
          {current ? (
            <>
              <div className="flex items-center gap-3 pr-10">
                <DialogTitle className="truncate">{current.title}</DialogTitle>
                {images.length > 1 ? (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {(active ?? 0) + 1} / {images.length}
                  </span>
                ) : null}
              </div>

              <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={current.id}
                  src={current.previewSrc ?? current.href}
                  alt={current.title}
                  className="max-h-[75svh] w-auto max-w-full object-contain animate-in fade-in duration-300"
                />

                {images.length > 1 ? (
                  <>
                    <NavButton side="left" onClick={() => step(-1)} />
                    <NavButton side="right" onClick={() => step(1)} />
                  </>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button
                  render={
                    <a
                      href={current.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  variant="outline"
                  size="lg"
                >
                  <ExternalLink data-icon="inline-start" aria-hidden="true" />
                  Open original
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CardLabel({
  document,
  icon,
  action,
}: {
  document: GalleryDocument;
  icon?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-4">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        {icon ?? <FileText className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{document.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {document.caption}
        </p>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1.5 text-xs min-[400px]:px-3 min-[400px]:py-1 font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {action}
      </span>
    </div>
  );
}

function NavButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous document" : "Next document"}
      className={cn(
        "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md ring-1 ring-foreground/10 backdrop-blur-sm transition-colors hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        side === "left" ? "left-2" : "right-2"
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
