import Link from "next/link";
import { Compass, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/Wordmark";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Wordmark />

      <div className="space-y-3">
        <p className="font-mono text-sm font-medium text-muted-foreground">
          404
        </p>

        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          We couldn&apos;t find that page
        </h1>

        <p className="mx-auto max-w-md text-sm text-muted-foreground text-pretty">
          The link may be out of date, or the job you are looking for may have
          been closed.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button render={<Link href="/" />} size="xl">
          <Home data-icon="inline-start" aria-hidden="true" />
          Go home
        </Button>

        <Button render={<Link href="/jobs" prefetch={false} />} variant="outline" size="xl">
          <Compass data-icon="inline-start" aria-hidden="true" />
          Browse jobs
        </Button>
      </div>
    </main>
  );
}
