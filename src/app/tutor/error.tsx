"use client";

import { RouteError } from "@/components/layout/RouteError";

export default function TutorError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteError error={error} retry={unstable_retry} description="We could not load your portal. Your account and applications are unaffected." />;
}
