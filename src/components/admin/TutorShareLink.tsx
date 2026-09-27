"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ExternalLink,
  Link2,
  Link2Off,
  RefreshCw,
  TimerOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CopyButton } from "@/components/shared/CopyButton";
import { FormError } from "@/components/shared/ErrorState";
import { formatDate } from "@/lib/format";
import { PROFILE_LINK_LIFETIME_DAYS } from "@/lib/tutor-profile";

interface TutorShareLinkProps {
  tutorId: string;
  initialToken: string | null;
  /** ISO timestamp; a link stops working at this moment. */
  initialExpiresAt: string | null;
  /** Decided on the server, so rendering never reads the clock. */
  initialExpired: boolean;
  /**
   * Everything before the token — the parent subdomain in production. From
   * `profileShareLinkBase`, resolved on the server so the link is absolute.
   */
  linkBase: string;
}

/**
 * The public profile link an admin sends to parents. Creating, resetting and
 * renewing an expired link are the same request — a fresh token with a fresh
 * 30-day expiry — so each one kills every copy of the old link. See
 * `src/lib/tutor-profile.ts`.
 */
export default function TutorShareLink({
  tutorId,
  initialToken,
  initialExpiresAt,
  initialExpired,
  linkBase,
}: TutorShareLinkProps) {
  const router = useRouter();

  const [token, setToken] = useState(initialToken);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [expired, setExpired] = useState(initialExpired);
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
    setExpiresAt(result.expiresAt);
    setExpired(false);
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
    setExpiresAt(null);
    toast.success("Profile link turned off.");
    router.refresh();
  }

  if (!token || expired) {
    return (
      <div className="space-y-4">
        {token && expired ? (
          <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-3 ring-1 ring-warning/25">
            <TimerOff
              className="mt-0.5 size-4 shrink-0 text-warning-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-pretty text-warning-foreground">
              The last link expired
              {expiresAt ? ` on ${formatDate(expiresAt)}` : ""}. Parents who
              open it see that it is no longer available.
            </p>
          </div>
        ) : null}

        <FormError message={error} />

        <Button size="xl" onClick={create} disabled={creating}>
          <Link2 data-icon="inline-start" aria-hidden="true" />
          {creating
            ? "Creating…"
            : token
              ? "Create a new link"
              : "Create profile link"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Links stay valid for {PROFILE_LINK_LIFETIME_DAYS} days.
        </p>
      </div>
    );
  }

  const url = `${linkBase}/${token}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg bg-muted/60 p-3">
        <p className="font-mono text-xs break-all">{url}</p>

        {expiresAt ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Works until {formatDate(expiresAt)}. Reset it for another{" "}
            {PROFILE_LINK_LIFETIME_DAYS} days.
          </p>
        ) : null}
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
          description={`A new link is created, valid for ${PROFILE_LINK_LIFETIME_DAYS} days, and the current one stops working immediately — anyone you already sent it to will no longer be able to open it.`}
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
