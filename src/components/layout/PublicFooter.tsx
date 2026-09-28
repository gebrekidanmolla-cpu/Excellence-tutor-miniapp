import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Wordmark } from "@/components/layout/Wordmark";

/**
 * Links only to routes that actually exist; the app has no legal pages or
 * social accounts. The Telegram link appears only when
 * `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` is set.
 */
const COLUMNS = [
  {
    title: "For tutors",
    links: [
      { href: "/register", label: "Create a profile" },
      { href: "/jobs", label: "Find jobs" },
      { href: "/login", label: "Sign in" },
      { href: "/forgot-password", label: "Reset password" },
    ],
  },
  {
    title: "Learn more",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#why-us", label: "Why tutors use it" },
      { href: "/#faq", label: "Questions" },
    ],
  },
];

export function PublicFooter() {
  const channelUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim();

  return (
    <footer className="bg-paper">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-12">
          <div className="max-w-sm lg:col-span-5">
            <Wordmark />
            <p className="mt-5 text-sm leading-6 text-muted-foreground text-pretty">
              Excellence Tutor connects qualified university students and
              graduates with families across Ethiopia looking for quality home
              tutoring.
            </p>
            {channelUrl ? (
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium"
              >
                Follow new jobs on Telegram
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            ) : null}
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-10 lg:col-span-6 lg:col-start-7"
          >
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold">{column.title}</p>
                <ul className="mt-4 space-y-3 text-sm">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-foreground/15 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Excellence Tutor. All rights reserved.</p>
          <p>Home tutoring across Ethiopia.</p>
        </div>
      </div>
    </footer>
  );
}
