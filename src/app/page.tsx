import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Serif_Ethiopic } from "next/font/google";
import { ArrowRight, ArrowUpRight, Send } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { IntentLink } from "@/components/shared/IntentLink";
import { JsonLd } from "@/components/shared/JsonLd";
import { fraunces } from "@/lib/fonts";
import {
  SITE_ALTERNATE_NAME,
  SITE_DESCRIPTION,
  SITE_LOGO_URL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import { cn } from "@/lib/utils";
import { formatSalary } from "@/lib/format";
import {
  renderJobChannelPost,
  type JobForChannelPost,
} from "@/lib/telegram-post";
import styles from "./page.module.css";

// Rebuilt when a job changes (`refreshPublicJobPages`); the hour is only a
// backstop for edits made outside the app, e.g. in Prisma Studio.
export const revalidate = 3600;

/* Only the Ge'ez numerals that mark each section use this face. It is not
   preloaded: `unicode-range` means the browser fetches the Ethiopic file
   only once one of those glyphs is actually on screen. */
const ethiopic = Noto_Serif_Ethiopic({
  subsets: ["ethiopic"],
  weight: "400",
  preload: false,
  display: "swap",
});

async function getLiveJobs() {
  const [jobs, openCount, latestPost] = await Promise.all([
    prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        jobCode: true,
        subject: true,
        grade: true,
        place: true,
        salary: true,
      },
    }),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.job.findFirst({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      select: {
        jobCode: true,
        gender: true,
        grade: true,
        subject: true,
        place: true,
        salary: true,
        daysPerWeek: true,
        hoursPerDay: true,
      },
    }),
  ]);

  return { jobs, openCount, latestPost };
}

type LiveJob = Awaited<ReturnType<typeof getLiveJobs>>["jobs"][number];

/* The title, description and Open Graph tags are the root layout's. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Who runs the site, and what to call it. Google reads the `WebSite` node
 * for the site name above the result — it only looks for it on the home
 * page — and the `Organization` node for the logo.
 */
function siteJsonLd() {
  const channelUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAME,
        description:
          "Excellence Tutor connects qualified university students and graduates with families across Ethiopia looking for quality home tutoring.",
        logo: {
          "@type": "ImageObject",
          url: SITE_LOGO_URL,
          width: 180,
          height: 180,
        },
        areaServed: { "@type": "Country", name: "Ethiopia" },
        ...(channelUrl ? { sameAs: [channelUrl] } : {}),
      },
    ],
  };
}

export default async function HomePage() {
  const { jobs, openCount, latestPost } = await getLiveJobs();

  return (
    <>
      <JsonLd data={siteJsonLd()} />

      <PublicHeader />

      <main className={cn(fraunces.variable, "flex-1 overflow-x-clip")}>
        <Hero jobs={jobs} openCount={openCount} />
        <SubjectBand />
        <Universities />
        <HowItWorks />
        <TelegramFeed job={latestPost} openCount={openCount} />
        <Principles />
        <Standards />
        <Faq />
        <Closing />
      </main>

      <PublicFooter />
    </>
  );
}

/* =========================================================
   SHARED
========================================================= */

const container = "mx-auto w-full max-w-7xl px-5 sm:px-8";

/** Sets the stagger index read by the CSS module's animation delays. */
function stagger(index: number) {
  return { "--i": index } as React.CSSProperties;
}

/** Section marker: a Ge'ez numeral beside a short label. */
function Marker({ numeral, children }: { numeral: string; children: React.ReactNode }) {
  return (
    <p className="flex items-baseline gap-3 text-[0.8125rem] font-medium text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn(ethiopic.className, "text-xl leading-none text-highlight")}
      >
        {numeral}
      </span>
      <span aria-hidden="true" className="h-px w-8 self-center bg-foreground/20" />
      {children}
    </p>
  );
}

function Arrow() {
  return (
    <ArrowRight
      aria-hidden="true"
      className="size-4 transition-transform duration-300 group-hover:translate-x-1"
    />
  );
}

/* =========================================================
   HERO — the live board is the product, so it sits where a
   mockup usually would.
========================================================= */

const HEADLINE = [
  <>Your knowledge</>,
  <>deserves a</>,
  <em key="em" className="relative font-normal text-primary">
    bigger stage.
    <svg
      aria-hidden="true"
      viewBox="0 0 300 20"
      preserveAspectRatio="none"
      className={cn(styles.underline, "absolute -bottom-[0.04em] left-0 h-[0.16em] w-[96%] text-highlight")}
    >
      <path
        d="M3 14 C 60 5, 130 4, 190 8 S 270 13, 297 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
      />
    </svg>
  </em>,
];

function Hero({ jobs, openCount }: { jobs: LiveJob[]; openCount: number }) {
  return (
    <section className="relative isolate border-b">
      <div aria-hidden="true" className={cn(styles.guides, "hidden lg:block")} />

      <div className={cn(container, "grid gap-14 pt-12 pb-16 sm:pt-16 lg:grid-cols-12 lg:gap-12 lg:pt-24 lg:pb-28")}>
        <div className="lg:col-span-7 lg:pr-6">
          <p
            className={cn(styles.fadeIn, "flex items-center gap-3 text-[0.8125rem] font-medium text-muted-foreground")}
            style={stagger(0)}
          >
            <span aria-hidden="true" className="h-px w-8 bg-highlight" />
            Home tutoring jobs across Ethiopia
          </p>

          <h1 className="mt-7 font-display text-[clamp(2.6rem,7vw,6.5rem)] leading-[0.94] font-light">
            {HEADLINE.map((line, index) => (
              <span key={index} className={styles.line}>
                <span className={styles.lineInner} style={stagger(index)}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            className={cn(styles.fadeIn, "mt-9 max-w-[34rem] text-lg leading-8 text-foreground/70")}
            style={stagger(2)}
          >
            Build one tutor profile, apply to real jobs from families who need
            help at home, and always know where each application stands.
          </p>

          <div
            className={cn(styles.fadeIn, "mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8")}
            style={stagger(3)}
          >
            <IntentLink
              href="/register"
              className="group relative inline-flex h-13 items-center justify-center gap-3 overflow-hidden rounded-md bg-foreground px-7 text-[0.9375rem] font-medium text-background shadow-[0_10px_30px_-12px_color-mix(in_oklch,var(--color-foreground)_60%,transparent)] transition-[background-color,box-shadow] duration-300 hover:bg-primary hover:shadow-[0_14px_36px_-12px_color-mix(in_oklch,var(--color-primary)_70%,transparent)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Create your tutor profile
              <Arrow />
            </IntentLink>
            <Link
              href="/jobs" prefetch={false}
              className="group inline-flex items-center justify-center gap-2 text-[0.9375rem] font-medium"
            >
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-size-[0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-size-[100%_1px]">
                Browse open jobs
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          <p
            className={cn(styles.fadeIn, "mt-14 max-w-md border-l-2 border-highlight pl-4 text-sm leading-6 text-muted-foreground")}
            style={stagger(4)}
          >
            Registration takes about ten minutes. Have your transcript,
            national exam result and a government ID ready — a phone photo
            is fine.
          </p>
        </div>

        <div className={cn(styles.fadeIn, "lg:col-span-5 lg:pt-4")} style={stagger(2)}>
          <JobBoard jobs={jobs} openCount={openCount} />
        </div>
      </div>
    </section>
  );
}

function JobBoard({ jobs, openCount }: { jobs: LiveJob[]; openCount: number }) {
  return (
    <div className="relative">
      {/* A second sheet peeking out behind the board gives it depth. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-5 -bottom-2.5 h-full rounded-lg border bg-paper"
      />

      <div className="relative overflow-hidden rounded-lg border bg-card shadow-[0_30px_60px_-30px_color-mix(in_oklch,var(--color-foreground)_28%,transparent)]">
        <div className="flex items-center justify-between gap-4 border-b bg-paper/60 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight font-normal">Open positions</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              <span>
                <span className="tabular-nums">{openCount}</span> open · refreshed every minute
              </span>
            </p>
          </div>
          <Link
            href="/jobs" prefetch={false}
            className="group -my-2 inline-flex shrink-0 items-center gap-1 rounded-sm py-2 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowUpRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        {jobs.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm leading-6 text-muted-foreground">
            Every position is filled right now.
            <br />
            New jobs are posted regularly — check back soon.
          </p>
        ) : (
          <ul>
            {jobs.map((job, index) => (
              <li
                key={job.id}
                className={cn(styles.fadeIn, "border-b last:border-b-0")}
                style={stagger(index + 3)}
              >
                <Link
                  href={`/apply/${job.jobCode}`} prefetch={false}
                  className={cn(
                    styles.row,
                    "group grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3.5 transition-colors duration-300 hover:bg-paper focus-visible:bg-paper focus-visible:outline-none sm:grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-5"
                  )}
                >
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {job.jobCode}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {job.subject}
                      <span className="font-normal text-muted-foreground">
                        {" "}· Grade {job.grade}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {job.place || "Location flexible"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-right text-sm font-medium tabular-nums">
                    {formatSalary(job.salary)}
                    <ArrowRight
                      aria-hidden="true"
                      className="hidden size-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:block"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SUBJECT BAND
========================================================= */

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Amharic",
  "Afaan Oromo",
  "Economics",
  "Geography",
  "History",
  "Civics",
  "ICT",
];

function SubjectBand() {
  const set = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {SUBJECTS.map((subject) => (
        <li key={subject} className="flex items-center">
          <span className="px-6 font-display text-[clamp(2rem,4.5vw,3.75rem)] leading-none font-light whitespace-nowrap italic sm:px-10">
            {subject}
          </span>
          <span aria-hidden="true" className="size-1.5 rotate-45 bg-highlight" />
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="Subjects families ask for" className="border-b bg-paper py-8 sm:py-10">
      <div className={styles.marquee}>
        <div className={styles.marqueeTrack}>
          {set(false)}
          {set(true)}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   UNIVERSITIES
========================================================= */

/* Floors, not totals: tutors also come from institutions beyond these,
   which is why every figure carries a "+". */
const UNIVERSITY_GROUPS = [
  { key: "public", label: "Public universities", count: 18, swatch: "bg-primary" },
  { key: "private", label: "Private universities & colleges", count: 8, swatch: "bg-highlight" },
] as const;

const UNIVERSITY_TOTAL = UNIVERSITY_GROUPS.reduce((sum, group) => sum + group.count, 0);

function Plus() {
  return <span className="text-highlight">+</span>;
}

function Universities() {
  return (
    <section aria-labelledby="universities-heading" className="border-b">
      <div className={cn(container, "grid gap-12 py-16 lg:grid-cols-12 lg:items-end lg:gap-12 lg:py-24")}>
        <div className={cn(styles.inView, "lg:col-span-7")}>
          <p className="flex items-center gap-3 text-[0.8125rem] font-medium text-muted-foreground">
            <span aria-hidden="true" className="h-px w-8 bg-highlight" />
            Where our tutors learn
          </p>

          <h2
            id="universities-heading"
            className="mt-6 max-w-[16ch] font-display text-[clamp(2.25rem,4.6vw,4rem)] leading-[1.02] font-light"
          >
            Students and graduates of{" "}
            <em className="font-normal whitespace-nowrap text-primary">
              <span className="tabular-nums">{UNIVERSITY_TOTAL}</span>
              <Plus /> universities
            </em>{" "}
            across Ethiopia.
          </h2>

          <p className="mt-7 max-w-md text-[0.9375rem] leading-7 text-foreground/70">
            Our tutors study at, or graduated from, public universities and
            private colleges across the country.
          </p>
        </div>

        <div className={cn(styles.inView, "lg:col-span-5")}>
          {/* Share of each group, drawn to scale. */}
          <div aria-hidden="true" className="flex h-1.5 gap-1 overflow-hidden rounded-full">
            {UNIVERSITY_GROUPS.map((group) => (
              <span
                key={group.key}
                className={cn(group.swatch, "rounded-full")}
                style={{ flexGrow: group.count }}
              />
            ))}
          </div>

          <dl className="mt-6">
            {UNIVERSITY_GROUPS.map((group) => (
              <div
                key={group.key}
                className="flex items-end justify-between gap-6 border-b border-foreground/10 py-5 first:border-t first:border-t-foreground/80"
              >
                <dt className="flex items-center gap-2.5 pb-1.5 text-sm text-foreground/75">
                  <span aria-hidden="true" className={cn(group.swatch, "size-2 shrink-0 rotate-45")} />
                  {group.label}
                </dt>
                <dd className="font-display text-[clamp(3rem,5vw,4.25rem)] leading-none font-light tabular-nums">
                  {group.count}
                  <Plus />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   HOW IT WORKS
========================================================= */

const STEPS = [
  {
    title: "Create your profile",
    body: "Tell us about your studies, add your exam result and upload your documents. You do this once.",
    label: "Time",
    detail: "About 10 minutes",
  },
  {
    title: "Find a job that fits",
    body: "Browse open positions by subject, grade and area — here, or from the posts on our Telegram channel.",
    label: "Where",
    detail: "Web & Telegram",
  },
  {
    title: "Apply",
    body: "Your profile goes with every application, so there is nothing to fill in twice.",
    label: "Effort",
    detail: "One tap",
  },
  {
    title: "Meet your student",
    body: "Follow the decision on your dashboard. If you're selected, the family's contact details arrive by email.",
    label: "Outcome",
    detail: "Sent by email",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b bg-paper">
      <div className={cn(container, "grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:py-36")}>
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Marker numeral="፩">How it works</Marker>
            <h2 className="mt-6 font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.02] font-light text-balance">
              Four steps from sign-up to your first lesson.
            </h2>
            <IntentLink
              href="/register"
              className="group mt-8 hidden items-center gap-2 text-sm font-medium lg:inline-flex"
            >
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-size-[100%_1px] bg-left-bottom bg-no-repeat pb-0.5">
                Start step one
              </span>
              <Arrow />
            </IntentLink>
          </div>
        </div>

        <ol className={cn(styles.steps, "relative pl-7 sm:pl-10 lg:col-span-7 lg:col-start-6")}>
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-foreground/12" />
          <span
            aria-hidden="true"
            className={cn(styles.progress, "absolute inset-y-0 left-0 w-px bg-highlight")}
          />

          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className={cn(
                styles.inView,
                "relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-t border-foreground/12 py-9 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[3.5rem_minmax(0,1fr)_9.5rem] sm:gap-x-6"
              )}
            >
              <span
                aria-hidden="true"
                className="absolute top-11 -left-7 size-2 -translate-x-1/2 rounded-full border border-foreground/40 bg-paper sm:-left-10 [li:first-child>&]:top-2"
              />
              <span className="font-display text-3xl leading-none font-light text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-2xl leading-tight font-normal sm:text-[1.75rem]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-md leading-7 text-foreground/70">
                  {step.body}
                </p>
              </div>
              <dl className="col-start-2 mt-5 flex items-baseline gap-3 sm:col-start-3 sm:mt-1 sm:block sm:text-right">
                <dt className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {step.label}
                </dt>
                <dd className="font-display text-base leading-snug font-normal whitespace-nowrap italic sm:mt-1.5 sm:text-[1.0625rem]">
                  {step.detail}
                </dd>
              </dl>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* =========================================================
   TELEGRAM — the latest job, rendered by the same function
   the bot posts with, so the preview can't drift from what
   the channel actually shows.
========================================================= */

type PostJob = Omit<JobForChannelPost, "additionalDetails" | "status">;

/** Shown only when nothing is open, so the phone is never empty. */
const SAMPLE_POST_JOB: PostJob = {
  jobCode: "E1001",
  gender: "ANY",
  grade: "10",
  subject: "Mathematics",
  place: "Bole",
  salary: 6000,
  daysPerWeek: 3,
  hoursPerDay: 2,
};

function TelegramFeed({
  job,
  openCount,
}: {
  job: PostJob | null;
  openCount: number;
}) {
  const post = renderJobChannelPost({
    ...(job ?? SAMPLE_POST_JOB),
    additionalDetails: null,
    status: "OPEN",
  });

  const channelUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim();

  return (
    <section className="relative isolate overflow-hidden border-b">
      <div className={cn(container, "grid items-center gap-16 py-20 sm:py-28 lg:grid-cols-12 lg:py-32")}>
        <div className={cn(styles.inView, "lg:col-span-6")}>
          <p className="flex items-center gap-3 text-[0.8125rem] font-medium text-muted-foreground">
            <Send aria-hidden="true" className="size-4 text-info" />
            On Telegram
          </p>
          <h2 className="mt-6 font-display text-[clamp(2.25rem,4.5vw,4rem)] leading-[1.02] font-light text-balance">
            New jobs reach you the moment they&apos;re{" "}
            <em className="font-normal text-primary">posted.</em>
          </h2>
          <p className="mt-6 max-w-md leading-7 text-foreground/70">
            Every opening is published to our Telegram channel. Tap{" "}
            <span className="font-medium text-foreground">Apply Now</span> on
            a post and it opens that job here, ready for your application.
          </p>

          <dl className="mt-10 grid max-w-md grid-cols-2 border-t border-foreground/15">
            <div className="border-r border-foreground/15 py-5 pr-5">
              <dt className="text-xs text-muted-foreground">Open right now</dt>
              <dd className="mt-1 font-display text-4xl font-light tabular-nums">
                {openCount}
              </dd>
            </div>
            <div className="py-5 pl-5">
              <dt className="text-xs text-muted-foreground">To apply from a post</dt>
              <dd className="mt-1 font-display text-4xl font-light">1 tap</dd>
            </div>
          </dl>

          {channelUrl ? (
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex h-12 items-center gap-2.5 rounded-md border border-foreground/15 px-5 text-sm font-medium transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
            >
              <Send aria-hidden="true" className="size-4" />
              Join the channel
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          ) : null}
        </div>

        <div className="flex justify-center lg:col-span-5 lg:col-start-8">
          <Phone text={post.text} />
        </div>
      </div>
    </section>
  );
}

function Phone({ text }: { text: string }) {
  return (
    <figure className={cn(styles.parallax, "relative w-[18.5rem] sm:w-[20.5rem]")}>
      <div
        aria-hidden="true"
        className="absolute -inset-16 -z-10 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-info)_14%,transparent),transparent)]"
      />

      <div className="rounded-[2.75rem] bg-foreground p-2.5 shadow-[0_50px_100px_-40px_color-mix(in_oklch,var(--color-foreground)_60%,transparent)] ring-1 ring-foreground/10">
        <div aria-hidden="true" className="overflow-hidden rounded-[2.2rem] bg-[oklch(0.9_0.035_160)]">
          {/* Status bar + channel header */}
          <div className="bg-background px-5 pt-2.5 pb-3">
            <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-foreground" />
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary font-display text-base text-primary-foreground italic">
                E
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Excellence Tutor</p>
                <p className="text-[0.7rem] text-muted-foreground">channel</p>
              </div>
            </div>
          </div>

          {/* The message */}
          <div className="px-3 pt-5 pb-6">
            <div className="rounded-2xl rounded-bl-md bg-background px-3.5 pt-3 pb-2 shadow-sm">
              <p className="text-[0.72rem] leading-[1.4] whitespace-pre-wrap">
                {text.replace(/\n{3,}/g, "\n\n")}
              </p>
              <p className="mt-1 text-right text-[0.6rem] text-muted-foreground">
                just now
              </p>
            </div>
            <div className="mt-1 rounded-xl bg-background/75 py-2 text-center text-[0.75rem] font-medium text-info">
              Apply Now
            </div>
          </div>
        </div>
      </div>

      <figcaption className="sr-only">
        A job post in the Excellence Tutor Telegram channel, with an Apply Now
        button that opens the job on this site.
      </figcaption>
    </figure>
  );
}

/* =========================================================
   PRINCIPLES
========================================================= */

function Principles() {
  return (
    <section id="why-us" className="scroll-mt-20 border-b">
      <div className={cn(container, "py-20 sm:py-28 lg:py-36")}>
        <div className={cn(styles.inView, "grid gap-6 lg:grid-cols-12")}>
          <div className="lg:col-span-5">
            <Marker numeral="፪">Why tutors use it</Marker>
          </div>
          <h2 className="font-display text-[clamp(2.25rem,4.5vw,4rem)] leading-[1.02] font-light text-balance lg:col-span-7">
            Less time on forms. <em className="font-normal text-primary">More time teaching.</em>
          </h2>
        </div>

        <div className="mt-16 grid gap-x-10 gap-y-14 md:grid-cols-3 lg:mt-24">
          <Principle index={0} title="One profile, reused">
            Your education, exam result and documents are entered once and
            travel with every application you send.
          </Principle>

          <Principle index={1} title="Always know where you stand">
            Every application shows its status — pending, reviewed, accepted —
            so you are never left guessing.
            <StatusTrail />
          </Principle>

          <Principle index={2} title="Private by default">
            Your documents are kept in private, secure storage — never posted
            publicly or shared on our Telegram channel.
          </Principle>
        </div>
      </div>
    </section>
  );
}

function Principle({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(styles.inView, "group relative pt-7")}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-foreground/15" />
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 h-0.5 w-12 bg-foreground transition-[width] duration-700 ease-out group-hover:w-full"
      />
      <p className="font-mono text-xs text-muted-foreground tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="mt-4 font-display text-2xl leading-tight font-normal">{title}</h3>
      <div className="mt-3 leading-7 text-foreground/70">{children}</div>
    </div>
  );
}

/** A small status history — the shape tutors see on their dashboard. */
function StatusTrail() {
  const steps = [
    { label: "Submitted", tone: "bg-foreground/30" },
    { label: "Reviewed", tone: "bg-info" },
    { label: "Accepted", tone: "bg-success" },
  ];

  return (
    <ol aria-hidden="true" className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium text-foreground">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", step.tone)} />
          {step.label}
          {index < steps.length - 1 ? (
            <span className="h-px w-5 bg-foreground/20" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/* =========================================================
   STANDARDS
========================================================= */

const DOCUMENTS = [
  { name: "Academic transcript", note: "Required" },
  { name: "National exam result", note: "Required" },
  { name: "Government-issued ID", note: "Required" },
  { name: "Graduation document", note: "Graduates" },
  { name: "CV", note: "Optional" },
];

function Standards() {
  return (
    <section className="border-b bg-paper">
      <div className={cn(container, "grid gap-14 py-20 sm:py-28 lg:grid-cols-12 lg:py-36")}>
        <div className={cn(styles.inView, "lg:col-span-6")}>
          <Marker numeral="፫">Our standard</Marker>
          <h2 className="mt-6 font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.02] font-light text-balance">
            Families trust the tutors they meet here because every profile is
            backed by <em className="font-normal text-primary">documents.</em>
          </h2>
          <p className="mt-6 max-w-md leading-7 text-foreground/70">
            It is also why you can apply with confidence: your qualifications
            speak for you before the first conversation.
          </p>
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:pt-12">
          <p className="text-xs font-medium text-muted-foreground">
            What every profile includes
          </p>
          <ul className="mt-4 border-t border-foreground/15">
            {DOCUMENTS.map((doc, index) => (
              <li
                key={doc.name}
                className={cn(
                  styles.inView,
                  "group flex items-center justify-between gap-4 border-b border-foreground/15 py-4"
                )}
              >
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium transition-transform duration-300 group-hover:translate-x-1">
                    {doc.name}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-xs",
                    doc.note === "Required" ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {doc.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   FAQ
========================================================= */

const FAQS = [
  {
    question: "Who can register as a tutor?",
    answer:
      "University students and graduates. During registration you share your academic background, your national exam result and a few supporting documents.",
  },
  {
    question: "Where do I find tutoring jobs?",
    answer:
      "Sign in and open Available Jobs, or follow our Telegram channel — every post links straight to that job's application page.",
  },
  {
    question: "How will I know if I've been selected?",
    answer:
      "Your dashboard shows the status of every application. When you're accepted, we email you the family's contact details so you can get started.",
  },
  {
    question: "Who can see my documents?",
    answer:
      "Your files are kept in private, secure storage and reviewed by the Excellence Tutor team. They are never posted publicly or shared on our Telegram channel.",
  },
  {
    question: "I forgot my password. What now?",
    answer:
      "Use “Forgot password” on the sign-in page. We'll email you a link to set a new one; it stays valid for 30 minutes.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-b">
      <div className={cn(container, "grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:py-36")}>
        <div className={cn(styles.inView, "lg:col-span-4")}>
          <Marker numeral="፬">Questions</Marker>
          <h2 className="mt-6 font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.02] font-light">
            Before you <em className="font-normal text-primary">start.</em>
          </h2>
        </div>

        <div className="border-t border-foreground/15 lg:col-span-7 lg:col-start-6">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group border-b border-foreground/15">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-lg font-medium tracking-tight transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="relative mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-foreground/20 transition-colors duration-300 group-open:border-foreground group-open:bg-foreground"
                >
                  <span className="absolute h-px w-2.5 bg-foreground transition-colors group-open:bg-background" />
                  <span className="absolute h-2.5 w-px bg-foreground transition-transform duration-300 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-xl pb-7 leading-7 text-foreground/70">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CLOSING
========================================================= */

function Closing() {
  return (
    <section className="relative isolate overflow-hidden bg-foreground text-background">
      <span aria-hidden="true" className={cn(styles.watermark, "font-display font-light italic")}>
        Excellence
      </span>

      <div className={cn(container, "relative z-10 grid gap-12 py-24 sm:py-32 lg:grid-cols-12 lg:items-end lg:py-44")}>
        <div className={cn(styles.inView, "lg:col-span-8")}>
          <p className="flex items-center gap-3 text-[0.8125rem] font-medium text-background/60">
            <span aria-hidden="true" className="h-px w-8 bg-highlight" />
            Join Excellence Tutor
          </p>
          <h2 className="mt-7 font-display text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.98] font-light text-balance">
            Somewhere nearby, a student is waiting for a tutor{" "}
            <em className="font-normal text-highlight">like you.</em>
          </h2>
        </div>

        <div className={cn(styles.inView, "flex flex-col gap-5 lg:col-span-4 lg:items-end")}>
          <IntentLink
            href="/register"
            className="group inline-flex h-13 items-center justify-center gap-3 rounded-md bg-background px-7 text-[0.9375rem] font-medium text-foreground transition-colors duration-300 hover:bg-highlight hover:text-highlight-foreground focus-visible:ring-3 focus-visible:ring-highlight/50 focus-visible:outline-none"
          >
            Create your tutor profile
            <Arrow />
          </IntentLink>
          <p className="text-sm text-background/60">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-background underline decoration-background/30 underline-offset-4 transition-colors hover:decoration-background"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
