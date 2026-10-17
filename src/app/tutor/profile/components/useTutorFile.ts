"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { compressImage } from "@/lib/compress-image";
import { pickedFileProblem } from "@/lib/document-rules";
import {
  EDITABLE_TUTOR_FILES,
  type EditableTutorFileKind,
} from "@/lib/tutor-files";

async function readMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  return body?.message || fallback;
}

/**
 * Upload / remove for one of the tutor's optional files, against
 * `/api/tutor/files/[kind]`. Refreshes the server components afterwards so
 * the profile strength and every avatar pick up the change.
 */
export function useTutorFile(
  kind: EditableTutorFileKind,
  { maxDimension }: { maxDimension?: number } = {}
) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"upload" | "remove" | null>(null);
  const label = EDITABLE_TUTOR_FILES[kind].label;

  /** Resolves to the uploaded (possibly compressed) file, or null on failure. */
  const upload = React.useCallback(
    async (picked: File): Promise<File | null> => {
      setBusy("upload");

      try {
        const file = await compressImage(picked, { maxDimension });
        const problem = pickedFileProblem(file, EDITABLE_TUTOR_FILES[kind].rules);

        if (problem) {
          toast.error(problem);
          return null;
        }

        const body = new FormData();
        body.append("file", file);

        const response = await fetch(`/api/tutor/files/${kind}`, {
          method: "POST",
          body,
        });

        if (!response.ok) {
          toast.error(
            await readMessage(response, `Couldn't save your ${label.toLowerCase()}.`)
          );
          return null;
        }

        toast.success(`${label} saved.`);
        router.refresh();

        return file;
      } catch {
        toast.error("Network error. Check your connection and try again.");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [kind, label, maxDimension, router]
  );

  /** Throws on failure, for `ConfirmDialog` to show in place. */
  const remove = React.useCallback(async () => {
    setBusy("remove");

    try {
      const response = await fetch(`/api/tutor/files/${kind}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(
          await readMessage(response, `Couldn't remove your ${label.toLowerCase()}.`)
        );
      }

      toast.success(`${label} removed.`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }, [kind, label, router]);

  return { upload, remove, busy };
}
