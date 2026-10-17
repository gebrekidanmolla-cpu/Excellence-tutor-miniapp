"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROFILE_LINK_LIFETIME_DAYS } from "@/lib/tutor-profile";

/**
 * Copies the tutor profile link an admin sends to parents, straight from a
 * list row.
 *
 * With a live link it only copies. Without one (never made, or expired) it
 * creates one first — the same `POST .../share` as "Create profile link" on
 * the tutor page — and then refreshes, so every other row for this tutor
 * picks up the new token instead of minting yet another one, which would
 * kill the link just sent.
 */
export function ParentLinkButton({
  tutorId,
  tutorName,
  token,
  linkBase,
  compact = false,
  className,
  iconClassName,
}: {
  tutorId: string;
  tutorName: string;
  /** The live token, or null when a link has to be created first. */
  token: string | null;
  /** From `getProfileShareLinkBase()`: everything before the token. */
  linkBase: string;
  /** Icon-only, for table rows. */
  compact?: boolean;
  className?: string;
  /** Lets a narrow card drop the icon so the label still fits. */
  iconClassName?: string;
}) {
  const router = useRouter();

  const [state, setState] = useState<"idle" | "working" | "copied">("idle");

  async function copy() {
    if (state === "working") {
      return;
    }

    setState("working");

    let created = false;

    try {
      if (token) {
        await navigator.clipboard.writeText(`${linkBase}/${token}`);
        toast.success(`Profile link for ${tutorName} copied.`);
      } else {
        const link = createLink(tutorId).then((newToken) => {
          created = true;
          return `${linkBase}/${newToken}`;
        });

        await writeToClipboard(link);

        toast.success(
          `New profile link for ${tutorName} copied. It works for ${PROFILE_LINK_LIFETIME_DAYS} days.`
        );
      }

      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch (error) {
      setState("idle");

      toast.error(
        created
          ? "The link was created, but your browser blocked copying it. Copy it from the tutor's page."
          : error instanceof Error
            ? error.message
            : "Could not copy the profile link."
      );
    } finally {
      if (created) {
        router.refresh();
      }
    }
  }

  const label = token ? "Parent link" : "Create link";

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "lg"}
      onClick={copy}
      disabled={state === "working"}
      aria-label={`${token ? "Copy" : "Create and copy"} ${tutorName}'s profile link for parents`}
      title={compact ? `${label} — copy ${tutorName}'s profile for parents` : undefined}
      className={className}
    >
      {state === "working" ? (
        <Loader2
          className={cn("animate-spin", iconClassName)}
          data-icon="inline-start"
          aria-hidden="true"
        />
      ) : state === "copied" ? (
        <Check
          data-icon="inline-start"
          aria-hidden="true"
          className={iconClassName}
        />
      ) : (
        <Link2
          data-icon="inline-start"
          aria-hidden="true"
          className={iconClassName}
        />
      )}

      {compact ? null : label}
    </Button>
  );
}

async function createLink(tutorId: string): Promise<string> {
  const response = await fetch(`/api/admin/tutors/${tutorId}/share`, {
    method: "POST",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to create the profile link.");
  }

  return result.token;
}

/**
 * Safari only lets a page write to the clipboard inside the tap that asked
 * for it, and the token arrives after a network round trip. Handing the
 * clipboard a promise keeps the write inside the gesture. Browsers without
 * promise support fall back to writing the text once it arrives.
 */
async function writeToClipboard(text: Promise<string>) {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": text.then(
            (value) => new Blob([value], { type: "text/plain" })
          ),
        }),
      ]);

      return;
    } catch {
      // Fall through: a failed request rethrows below, with its own message.
    }
  }

  await navigator.clipboard.writeText(await text);
}
