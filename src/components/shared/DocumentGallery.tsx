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
  /** Images open in the lightbox; a PDF opens in a new tab. */
  kind: "image" | "pdf";
};

/**
 * Thumbnail grid with a lightbox for the public tutor profile. Images step
 * through with the arrow buttons or the keyboard; a PDF (only ever the CV)
 * cannot be previewed reliably on phones, so its card opens it in a new tab
 * instead.
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
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                className="group block w-full overflow-hidden rounded-2xl bg-card text-left ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={document.href}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/0 to-foreground/0 opacity-70 transition-opacity group-hover:opacity-100" />

                  <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm">
                    <Maximize2 className="size-3" aria-hidden="true" />
                    View
                  </span>
                </div>

                <CardLabel document={document} />
              </button>
            ) : (
              <a
                href={document.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-br from-primary/10 via-muted to-highlight/15">
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-card text-primary shadow-md ring-1 ring-foreground/5 transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                    <FileText className="size-7" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-card/80 px-2.5 py-0.5 font-mono text-[0.6875rem] font-medium tracking-wider text-muted-foreground uppercase">
                    PDF
                  </span>

                  <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm">
                    <ExternalLink className="size-3" aria-hidden="true" />
                    Open
                  </span>
                </div>

                <CardLabel document={document} />
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
                  src={current.href}
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

function CardLabel({ document }: { document: GalleryDocument }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
      >
        <FileText className="size-4" />
      </span>

      <div className="min-w-0">
        <p className="truncate font-medium">{document.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {document.caption}
        </p>
      </div>
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
