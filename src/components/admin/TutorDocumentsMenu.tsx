"use client";

import { ChevronDown, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
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
}: {
  tutorId: string;
  tutorName: string;
  documents: readonly TutorDocumentKind[];
  /** Icon-only, for table rows. */
  compact?: boolean;
  className?: string;
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
        {compact ? null : "Docs"}
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
          <>
            Docs
            <ChevronDown data-icon="inline-end" aria-hidden="true" />
          </>
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
