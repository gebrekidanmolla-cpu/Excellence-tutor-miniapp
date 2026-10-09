"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PhotoCropDialog } from "@/components/shared/PhotoCropDialog";
import { PHOTO_MAX_DIMENSION, compressImage } from "@/lib/compress-image";
import {
  ALLOWED_DOCUMENT_TYPES,
  CV_ACCEPT,
  DOCUMENT_ACCEPT,
  PHOTO_ACCEPT,
  pickedFileProblem,
  type DocumentKind,
} from "@/lib/document-rules";
import {
  TUTOR_DOCUMENTS,
  adminDocumentHref,
  isRequiredDocument,
  type TutorDocumentKind,
} from "@/lib/admin-documents";
import { cn } from "@/lib/utils";

/** Past this, decoding for the cropper could stall the browser. */
const MAX_PICKED_SIZE = 25 * 1024 * 1024;

const ACCEPT: Record<DocumentKind, string> = {
  document: DOCUMENT_ACCEPT,
  cv: CV_ACCEPT,
  photo: PHOTO_ACCEPT,
};

const FORMAT_HINT: Record<DocumentKind, string> = {
  document: "Image, up to 2 MB",
  cv: "Image or PDF, up to 3 MB",
  photo: "Image, cropped square",
};

/* The photo leads: it is what the tutor is recognised by. */
const ROWS = [
  ...TUTOR_DOCUMENTS.filter(({ kind }) => kind === "profilePhoto"),
  ...TUTOR_DOCUMENTS.filter(({ kind }) => kind !== "profilePhoto"),
];

/**
 * Every file on a tutor's account, each uploaded, replaced or removed on its
 * own request to `/api/admin/tutors/[id]/documents/[kind]` — so a change is
 * saved the moment it is made, independent of the edit form's Save button.
 * Required files (see `isRequiredDocument`) can only be replaced.
 *
 * `hrefs` holds the versioned GET URL of every file the tutor has; the
 * storage keys themselves stay on the server.
 */
export default function TutorDocumentsEditor({
  tutorId,
  tutorStatus,
  hrefs,
}: {
  tutorId: string;
  /** The saved type, which decides whether the graduation document is required. */
  tutorStatus: string;
  hrefs: Partial<Record<TutorDocumentKind, string>>;
}) {
  return (
    <ul className="space-y-3">
      {ROWS.map(({ kind, label, rules }) => (
        <DocumentRow
          key={kind}
          tutorId={tutorId}
          kind={kind}
          label={label}
          rules={rules}
          href={hrefs[kind] ?? null}
          required={isRequiredDocument(kind, tutorStatus)}
          graduatesOnly={kind === "graduationDocument" && tutorStatus !== "GRADUATE"}
        />
      ))}
    </ul>
  );
}

async function readResult(response: Response) {
  return (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
  } | null;
}

function DocumentRow({
  tutorId,
  kind,
  label,
  rules,
  href,
  required,
  graduatesOnly,
}: {
  tutorId: string;
  kind: TutorDocumentKind;
  label: string;
  rules: DocumentKind;
  href: string | null;
  required: boolean;
  graduatesOnly: boolean;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const isPhoto = kind === "profilePhoto";
  const present = Boolean(href);
  const endpoint = adminDocumentHref(tutorId, kind);

  /* Object URL of the photo being cropped; the crop dialog is open while set. */
  const [cropSource, setCropSource] = React.useState<string | null>(null);

  React.useEffect(
    () => () => {
      if (cropSource) {
        URL.revokeObjectURL(cropSource);
      }
    },
    [cropSource]
  );

  /** Resolves to whether the file was saved; failures are toasted here. */
  async function upload(picked: File): Promise<boolean> {
    setUploading(true);

    try {
      const file = await compressImage(picked, {
        maxDimension: isPhoto ? PHOTO_MAX_DIMENSION : undefined,
      });

      const problem = pickedFileProblem(file, rules);

      if (problem) {
        toast.error(`${label}: ${problem}`);
        return false;
      }

      const body = new FormData();
      body.append("file", file);

      const response = await fetch(endpoint, { method: "POST", body });
      const result = await readResult(response);

      if (!response.ok || !result?.success) {
        toast.error(result?.message || "Couldn't save the file. Please try again.");
        return false;
      }

      toast.success(result.message || `${label} saved.`);
      router.refresh();

      return true;
    } catch {
      toast.error("Network error. Check your connection and try again.");
      return false;
    } finally {
      setUploading(false);
    }
  }

  /** Throws on failure, for `ConfirmDialog` to show in place. */
  async function remove() {
    const response = await fetch(endpoint, { method: "DELETE" });
    const result = await readResult(response);

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message || "Couldn't remove the file. Please try again."
      );
    }

    toast.success(result.message || `${label} removed.`);
    router.refresh();
  }

  function handlePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";

    if (!picked) {
      return;
    }

    if (!isPhoto) {
      void upload(picked);
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

  const missingRequired = required && !present;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-3",
        missingRequired && "border-highlight/60 bg-highlight/5"
      )}
    >
      {isPhoto && href ? (
        // eslint-disable-next-line @next/next/no-img-element -- a 302 to a presigned R2 URL
        <img
          src={href}
          alt=""
          className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4",
            present
              ? "bg-success/10 text-success"
              : missingRequired
                ? "bg-highlight/15 text-[color-mix(in_oklch,var(--highlight),var(--foreground)_35%)]"
                : "bg-muted text-muted-foreground"
          )}
        >
          {isPhoto ? <UserRound /> : <FileText />}
        </span>
      )}

      <span className="min-w-0 flex-1 basis-40">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
          {label}
          <Badge variant="outline" className="font-normal">
            {required ? "Required" : graduatesOnly ? "Graduates only" : "Optional"}
          </Badge>
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {present ? "Uploaded" : missingRequired ? "Missing" : "Not uploaded"} ·{" "}
          {FORMAT_HINT[rules]}
        </span>
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[rules]}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handlePicked}
      />

      {isPhoto ? (
        <PhotoCropDialog
          imageUrl={cropSource}
          onCancel={() => setCropSource(null)}
          onConfirm={async (cropped) => {
            // On failure the dialog stays open, so the admin can retry.
            if (await upload(cropped)) {
              setCropSource(null);
            }
          }}
          title="Crop the profile photo"
          description="Drag to position the tutor's face in the square, and zoom to fit."
        />
      ) : null}

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
          variant={missingRequired ? "default" : "outline"}
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload data-icon="inline-start" aria-hidden="true" />
          )}
          {uploading ? "Uploading…" : present ? "Replace" : "Upload"}
          <span className="sr-only"> {label}</span>
        </Button>

        {present && !required ? (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={uploading}
                aria-label={`Remove ${label}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            }
            title="Remove this file?"
            description={
              <>
                The tutor&apos;s <strong>{label}</strong> is deleted
                permanently. It disappears from their profile and from any
                shared profile link.
              </>
            }
            confirmLabel="Remove file"
            variant="destructive"
            onConfirm={remove}
          />
        ) : null}
      </div>
    </li>
  );
}
