"use client";

import "./globals.css";

import { ThemeSync } from "@/components/layout/ThemeSync";

/**
 * Only reached when the root layout itself throws. It replaces the document,
 * so it has to bring its own `<html>` / `<body>` and stylesheet, and it cannot
 * export metadata — hence the plain `<title>`. Its `<html>` arrives without
 * the theme class, which `ThemeSync` puts back.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <title>Something went wrong · Excellence Tutor</title>
        <ThemeSync />

        <div className="space-y-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>

          <p className="mx-auto max-w-md text-sm text-muted-foreground text-pretty">
            Excellence Tutor ran into an unexpected problem. Please try again.
          </p>

          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground/80">
              Reference: {error.digest}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
