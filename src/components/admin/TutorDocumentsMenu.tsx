"use client";

import { ChevronDown, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminDocumentHref,
  documentLabel,
  type TutorDocumentKind,
} from "@/lib/admin-documents";

/**
 * A tutor's uploaded files, one tap from a list row. Each item opens the
 * admin document route in a new tab, which signs a short-lived URL — the
 * same route the tutor page links to.
 */
export function TutorDocumentsMenu({
  tutorId,
  tutorName,
  documents,
  compact = false,
  className,
  labelClassName,
}: {
  tutorId: string;
  tutorName: string;
  documents: readonly TutorDocumentKind[];
  /** Icon-only, for table rows. */
  compact?: boolean;
  className?: string;
  /** Lets a narrow card hide the word "Docs", leaving the icon. */
  labelClassName?: string;
}) {
  if (documents.length === 0) {
    return (
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon-sm" : "lg"}
        disabled
        aria-label={`${tutorName} has no documents`}
        className={className}
      >
        <FileText data-icon="inline-start" aria-hidden="true" />
        {compact ? null : <span className={labelClassName}>Docs</span>}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={compact ? "icon-sm" : "lg"}
            aria-label={`Documents for ${tutorName}`}
            title={compact ? "Documents" : undefined}
            className={className}
          />
        }
      >
        <FileText data-icon="inline-start" aria-hidden="true" />
        {compact ? null : (
          <span
            className={cn("inline-flex items-center gap-1.5", labelClassName)}
          >
            Docs
            <ChevronDown data-icon="inline-end" aria-hidden="true" />
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        {/* A label has to sit inside a group in Base UI, or the menu throws. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Opens in a new tab</DropdownMenuLabel>

          {documents.map((kind) => (
            <DropdownMenuItem
              key={kind}
              render={
                <a
                  href={adminDocumentHref(tutorId, kind)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <FileText aria-hidden="true" />
              {documentLabel(kind)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
