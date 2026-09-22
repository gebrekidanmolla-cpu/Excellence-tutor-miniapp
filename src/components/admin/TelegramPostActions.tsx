"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormError } from "@/components/shared/ErrorState";

interface TelegramPostActionsProps {
  jobId: string;

  /** Whether the job already owns a message in the channel. */
  hasMessage: boolean;

  /** False when the bot token or channel id is unset. */
  configured: boolean;
}

/**
 * Publishing is automatic; this is the recovery path for the times it
 * did not work — a bad token, the bot not yet an admin of the channel,
 * or someone deleting the post.
 *
 * Unlike close/re-open, the primary action needs no confirmation:
 * re-syncing is idempotent and cannot lose anything. Re-posting can —
 * it abandons the existing channel post — so that one is behind a
 * `ConfirmDialog`.
 */
export default function TelegramPostActions({
  jobId,
  hasMessage,
  configured,
}: TelegramPostActionsProps) {
  const router = useRouter();

  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  async function callTelegramRoute(body: {
    force?: boolean;
    repost?: boolean;
  }) {
    const response = await fetch(
      `/api/admin/jobs/${jobId}/telegram`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to reach Telegram."
      );
    }

    toast.success(result.message);

    router.refresh();
  }

  async function sync() {
    setError("");
    setIsSyncing(true);

    try {
      // The route forces by default; nothing to pass.
      await callTelegramRoute({});
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Failed to reach Telegram."
      );
    } finally {
      setIsSyncing(false);
    }
  }

  /** Throws so `ConfirmDialog` keeps itself open and shows the reason. */
  async function repost() {
    setError("");

    await callTelegramRoute({ repost: true });
  }

  if (!configured) {
    return (
      <p className="text-sm text-muted-foreground text-pretty">
        Set <code>TELEGRAM_BOT_TOKEN</code> and{" "}
        <code>TELEGRAM_CHANNEL_ID</code> to publish jobs to the channel
        automatically.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          size="xl"
          onClick={sync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2
              data-icon="inline-start"
              className="animate-spin"
              aria-hidden="true"
            />
          ) : hasMessage ? (
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
          ) : (
            <Send data-icon="inline-start" aria-hidden="true" />
          )}

          {isSyncing
            ? "Working…"
            : hasMessage
              ? "Sync Telegram post"
              : "Post to Telegram"}
        </Button>

        {hasMessage ? (
          <ConfirmDialog
            title="Post as a new message?"
            description="The existing channel post is left where it is and will keep showing whatever it shows now — delete it in Telegram yourself. Only do this if the original post was removed."
            confirmLabel="Post a new message"
            onConfirm={repost}
            trigger={
              <Button
                type="button"
                size="xl"
                variant="outline"
                disabled={isSyncing}
              >
                <Send data-icon="inline-start" aria-hidden="true" />
                Re-post as new
              </Button>
            }
          />
        ) : null}
      </div>

      <FormError message={error} />
    </div>
  );
}
