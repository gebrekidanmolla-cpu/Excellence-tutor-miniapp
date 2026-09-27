"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, Link2Off, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CopyButton } from "@/components/shared/CopyButton";
import { FormError } from "@/components/shared/ErrorState";

interface TutorShareLinkProps {
  tutorId: string;
  initialToken: string | null;
  /**
   * Everything before the token — the parent subdomain in production. From
   * `profileShareLinkBase`, resolved on the server so the link is absolute.
   */
  linkBase: string;
}

/**
 * The public profile link an admin sends to parents. Creating and resetting
 * are the same request — a fresh token — so a reset kills every copy of the
 * old link. See `src/lib/tutor-profile.ts`.
 */
export default function TutorShareLink({
  tutorId,
  initialToken,
  linkBase,
}: TutorShareLinkProps) {
  const router = useRouter();

  const [token, setToken] = useState(initialToken);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function issueToken() {
    const response = await fetch(`/api/admin/tutors/${tutorId}/share`, {
      method: "POST",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to create the profile link.");
    }

    setToken(result.token);
    router.refresh();
  }

  async function create() {
    setError("");
    setCreating(true);

    try {
      await issueToken();
      toast.success("Profile link created.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong."
      );
    } finally {
      setCreating(false);
    }
  }

  async function reset() {
    await issueToken();
    toast.success("New profile link created. The old one no longer works.");
  }

  async function turnOff() {
    const response = await fetch(`/api/admin/tutors/${tutorId}/share`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to turn off the profile link.");
    }

    setToken(null);
    toast.success("Profile link turned off.");
    router.refresh();
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <FormError message={error} />

        <Button size="xl" onClick={create} disabled={creating}>
          <Link2 data-icon="inline-start" aria-hidden="true" />
          {creating ? "Creating…" : "Create profile link"}
        </Button>
      </div>
    );
  }

  const url = `${linkBase}/${token}`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/60 p-3">
        <p className="font-mono text-xs break-all">{url}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <CopyButton value={url} size="xl" successMessage="Profile link copied">
          Copy link
        </CopyButton>

        <Button
          render={<a href={url} target="_blank" rel="noopener noreferrer" />}
          variant="outline"
          size="xl"
        >
          <ExternalLink data-icon="inline-start" aria-hidden="true" />
          Preview
        </Button>

        <ConfirmDialog
          trigger={
            <Button variant="outline" size="xl">
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Reset link
            </Button>
          }
          title="Reset the profile link?"
          description="A new link is created and the current one stops working immediately — anyone you already sent it to will no longer be able to open it."
          confirmLabel="Reset link"
          onConfirm={reset}
        />

        <ConfirmDialog
          trigger={
            <Button variant="outline" size="xl">
              <Link2Off data-icon="inline-start" aria-hidden="true" />
              Turn off
            </Button>
          }
          title="Turn off the profile link?"
          description="The link stops working immediately, including for anyone you already sent it to. You can create a new one later."
          confirmLabel="Turn off link"
          variant="destructive"
          onConfirm={turnOff}
        />
      </div>
    </div>
  );
}
