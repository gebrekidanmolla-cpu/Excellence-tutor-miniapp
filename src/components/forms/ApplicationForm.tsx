"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApplicationFormProps {
  jobCode: string;
}

export default function ApplicationForm({
  jobCode,
}: ApplicationFormProps) {
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
        setError(
          data.message || "Unable to submit application."
        );
        setLoading(false);
        return;
      }

      router.push(
        `/application-success?jobCode=${encodeURIComponent(jobCode)}`
      );
      router.refresh();
    } catch (error) {
      console.error("Application error:", error);

      setError(
        "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleApply}
        disabled={loading}
        className="w-full rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting Application..." : "Apply Now"}
      </button>
    </div>
  );
}