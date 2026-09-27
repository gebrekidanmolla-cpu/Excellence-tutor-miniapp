"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/shared/ErrorState";

interface SheetSyncButtonProps {
  /** One job's row. Omit to sync every job — the backfill. */
  jobId?: string;

  size?: "default" | "xl";
  variant?: "default" | "outline";
}

/**
 * Mirroring is automatic; this is the recovery path for when it did
 * not work, and the backfill for jobs that predate it. No confirmation:
 * both routes rewrite rows in place and cannot lose or duplicate
 * anything.
 */
export default function SheetSyncButton({
  jobId,
  size = "xl",
  variant = "default",
}: SheetSyncButtonProps) {
  const router = useRouter();

  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  async function sync() {
    setError("");
    setIsSyncing(true);

    try {
      const response = await fetch(
        jobId
          ? `/api/admin/jobs/${jobId}/sheet`
          : "/api/admin/jobs/sheet-sync",
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to reach Google Sheets."
        );
      }

      toast.success(result.message);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Failed to reach Google Sheets."
      );
    } finally {
      setIsSyncing(false);

      // Refresh either way: a partial sync-all still changed some
      // rows' recorded status.
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={sync}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <Loader2
            data-icon="inline-start"
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Sheet data-icon="inline-start" aria-hidden="true" />
        )}

        {isSyncing
          ? "Syncing…"
          : jobId
            ? "Sync to sheet"
            : "Sync all to sheet"}
      </Button>

      <FormError message={error} />
    </div>
  );
}
