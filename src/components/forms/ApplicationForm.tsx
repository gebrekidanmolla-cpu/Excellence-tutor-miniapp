"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/shared/ErrorState";

interface ApplicationFormProps {
  jobCode: string;
}

export default function ApplicationForm({ jobCode }: ApplicationFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    if (loading) return;

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
