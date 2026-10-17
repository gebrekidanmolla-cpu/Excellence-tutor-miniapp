"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "@/components/shared/ErrorState";

interface ApplicationFormProps {
  jobCode: string;
}

/**
 * The apply button, behind a confirmation that the tutor has read the
 * agency's terms (`ApplyNote`, rendered just above). The button stays
 * enabled: pressing it unconfirmed says why and moves focus to the
 * checkbox, where a disabled button would give no reason at all.
 *
 * The confirmation is checked here only; the API does not record it.
 */
export default function ApplicationForm({ jobCode }: ApplicationFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const confirmationRef = useRef<HTMLElement>(null);

  async function handleApply() {
    if (loading) return;

    if (!confirmed) {
      setNeedsConfirmation(true);
      confirmationRef.current?.focus();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to submit application.");
        setLoading(false);
        return;
      }

      router.push(
        `/application-success?jobCode=${encodeURIComponent(jobCode)}`
      );
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label
          htmlFor="apply-confirmation"
          className="flex cursor-pointer gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-primary/5 has-data-checked:border-primary/40"
        >
          <Checkbox
            id="apply-confirmation"
            ref={confirmationRef}
            checked={confirmed}
            onCheckedChange={(checked) => {
              setConfirmed(checked === true);

              if (checked === true) {
                setNeedsConfirmation(false);
              }
            }}
            aria-invalid={needsConfirmation || undefined}
            aria-describedby={
              needsConfirmation ? "apply-confirmation-error" : undefined
            }
            className="mt-0.5"
          />

          <span className="text-sm leading-relaxed text-pretty">
            I have read the information above and agree to these terms,
            including the one-time commission of up to 45% of one month&rsquo;s
            salary and the refund policy.
          </span>
        </label>

        {needsConfirmation ? (
          <p id="apply-confirmation-error" className="text-sm text-destructive">
            Please confirm that you have read and agree to the terms above.
          </p>
        ) : null}
      </div>

      <FormError message={error} />

      <Button
        type="button"
        onClick={handleApply}
        disabled={loading}
        size="xl"
        className="w-full"
      >
        {loading ? (
          <Loader2
            className="animate-spin"
            data-icon="inline-start"
            aria-hidden="true"
          />
        ) : (
          <Send data-icon="inline-start" aria-hidden="true" />
        )}
        {loading ? "Submitting application…" : "Apply now"}
      </Button>
    </div>
  );
}
