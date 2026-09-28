import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Wordmark } from "@/components/layout/Wordmark";
import { cn } from "@/lib/utils";

/**
 * The layered indigo backdrop behind every auth screen's brand panel: a deep
 * gradient, a dot grid fading out from the top corner, and two soft glows.
 * Purely decorative; the parent must be `relative overflow-hidden`.
 */
export function BrandBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(160deg,oklch(0.46_0.19_266)_0%,oklch(0.36_0.17_270)_55%,oklch(0.27_0.12_274)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.16)_1px,transparent_1px)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_75%_55%_at_15%_0%,black,transparent)]" />
      <div className="absolute -top-32 -left-24 size-96 rounded-full bg-highlight/25 blur-3xl" />
      <div className="absolute -right-32 -bottom-40 size-[28rem] rounded-full bg-[oklch(0.62_0.2_285)]/30 blur-3xl" />
    </div>
  );
}

/** The wordmark as it sits on the dark brand panel. */
export function BrandPanelWordmark() {
  return (
    <Link
      href="/"
      className="flex w-fit items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/40"
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15 ring-1 ring-primary-foreground/25 backdrop-blur"
      >
        <GraduationCap className="size-5" />
      </span>
      <span className="font-heading text-base font-semibold tracking-tight">
        Excellence Tutor
      </span>
    </Link>
  );
}

/**
 * Split layout shared by the tutor sign-in and password-recovery screens.
 * The brand panel is decorative, so small screens drop it entirely rather
 * than shrinking it into a banner; they get the plain wordmark instead.
 *
 * Auth screens deliberately skip `PublicHeader`: its own Log in / Register
 * buttons would be redundant here, and a single exit (the wordmark) keeps
 * the page on task.
 */
export function AuthLayout({
  eyebrow,
  title,
  description,
  highlights,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights?: { icon: React.ComponentType<{ className?: string }>; text: string }[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="flex min-h-svh flex-col bg-background lg:grid lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex xl:p-16">
        <BrandBackdrop />

        <div className="relative">
          <BrandPanelWordmark />
        </div>

        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide text-primary-foreground/85 ring-1 ring-primary-foreground/15">
            <span className="size-1.5 rounded-full bg-highlight" />
            {eyebrow}
          </p>

          <h1 className="mt-6 font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
            {title}
          </h1>

          <p className="mt-5 text-base leading-relaxed text-primary-foreground/75 text-pretty">
            {description}
          </p>

          {highlights?.length ? (
            <ul className="mt-10 space-y-3.5">
              {highlights.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                    <Icon className="size-4 text-highlight" />
                  </span>
                  <span className="text-primary-foreground/90">{text}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <p className="relative text-xs text-primary-foreground/55">
          Excellence Tutor Hub
        </p>
      </aside>

      <div className="relative flex flex-1 flex-col">
        {/* A faint wash so the form side isn't flat white on large screens. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_7%,transparent),transparent)]"
        />

        <header className="relative px-4 pt-5 sm:px-6 lg:hidden">
          <Wordmark />
        </header>

        <div
          className={cn(
            "relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-12",
            className
          )}
        >
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </main>
  );
}

/** The icon-topped heading every auth card opens with. */
export function AuthHeading({
  icon: Icon,
  title,
  description,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: React.ReactNode;
  tone?: "primary" | "success" | "destructive";
}) {
  return (
    <div>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl ring-1",
          tone === "primary" && "bg-primary/10 text-primary ring-primary/15",
          tone === "success" && "bg-success/10 text-success ring-success/20",
          tone === "destructive" &&
            "bg-destructive/10 text-destructive ring-destructive/20"
        )}
      >
        <Icon className="size-6" />
      </span>

      <h2 className="mt-6 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>

      <div className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
        {description}
      </div>
    </div>
  );
}
