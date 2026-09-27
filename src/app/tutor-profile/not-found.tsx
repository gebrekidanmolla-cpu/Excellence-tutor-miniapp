import { Link2Off } from "lucide-react";

import { Wordmark } from "@/components/layout/Wordmark";

/**
 * Everything on the parent subdomain that is not a live profile lands here —
 * a revoked or mistyped link, and any other path (`src/proxy.ts`). The root
 * not-found invites tutors to browse jobs, which is the wrong audience, so
 * this one speaks to parents and links nowhere.
 */
export default function TutorProfileNotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Wordmark href={null} />

      <div className="space-y-3">
        <span
          aria-hidden="true"
          className="mx-auto flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        >
          <Link2Off className="size-5" />
        </span>

        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          This profile link isn&apos;t available
        </h1>

        <p className="mx-auto max-w-md text-sm text-muted-foreground text-pretty">
          The link may have been mistyped, or it has expired. Please ask
          Excellence Tutor to send you a new one.
        </p>
      </div>
    </main>
  );
}
