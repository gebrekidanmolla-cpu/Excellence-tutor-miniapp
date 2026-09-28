"use client";

import * as React from "react";
import { ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CV_ACCEPT } from "@/lib/document-rules";
import { cn } from "@/lib/utils";
import { useTutorFile } from "./useTutorFile";

/**
 * The one document a tutor manages themselves: optional at registration, so
 * it can be added, replaced or removed here. Same row layout as the
 * read-only document rows beside it.
 */
export function CvRow({ href }: { href: string | null }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { upload, remove, busy } = useTutorFile("cv");
  const present = Boolean(href);

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4",
          present
            ? "bg-success/10 text-success"
            : "bg-highlight/15 text-[color-mix(in_oklch,var(--highlight),var(--foreground)_35%)]"
        )}
      >
        <FileText />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">CV / Resume</span>
        <span className="block text-xs text-muted-foreground">
          {present
            ? "Optional · you can replace it any time"
            : "Optional · image or PDF, up to 3 MB"}
        </span>
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (event) => {
          const picked = event.target.files?.[0];
          event.target.value = "";

          if (picked) {
            await upload(picked);
          }
        }}
      />

      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {href ? (
          <Button
            render={<a href={href} target="_blank" rel="noopener noreferrer" />}
            variant="ghost"
            size="sm"
          >
            <ExternalLink data-icon="inline-start" aria-hidden="true" />
            View
          </Button>
        ) : null}

        <Button
          type="button"
          variant={present ? "outline" : "default"}
          size="sm"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
        >
          {busy === "upload" ? (
            <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload data-icon="inline-start" aria-hidden="true" />
          )}
          {busy === "upload" ? "Uploading…" : present ? "Replace" : "Upload CV"}
        </Button>

        {present ? (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busy !== null}
                aria-label="Remove CV"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            }
            title="Remove your CV?"
            description="Admins and families will no longer see it. You can upload a new one at any time."
            confirmLabel="Remove CV"
            variant="destructive"
            onConfirm={remove}
          />
        ) : null}
      </div>
    </li>
  );
}
