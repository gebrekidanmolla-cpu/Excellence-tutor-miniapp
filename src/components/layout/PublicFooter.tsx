import Link from "next/link";

import { Wordmark } from "@/components/layout/Wordmark";

/**
 * Deliberately thin: the app has no social accounts, legal pages or partner
 * logos, so the footer links only to routes that actually exist.
 */
export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 lg:px-8">
        <div className="max-w-sm space-y-3">
          <Wordmark />

          <p className="text-sm text-muted-foreground text-pretty">
            Excellence Tutor connects qualified tutors with families looking for
            quality home tutoring.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:gap-x-16">
          <span className="col-span-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            For tutors
          </span>

          <Link
            href="/jobs"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Find jobs
          </Link>

          <Link
            href="/register"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Register
          </Link>

          <Link
            href="/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
        </nav>
      </div>

      <div className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Excellence Tutor. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
