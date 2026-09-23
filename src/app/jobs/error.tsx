"use client";

import { RouteError } from "@/components/layout/RouteError";

export default function JobsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteError error={error} retry={unstable_retry} description="We could not load the job listings right now." />;
}
