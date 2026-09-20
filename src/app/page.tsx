import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { StatusBadge } from "@/components/shared/StatusBadge";

/**
 * The landing page, and the reference for the rest of the redesign:
 * section rhythm (`py-20 sm:py-24 lg:py-28`), container
 * (`max-w-7xl px-4 sm:px-6 lg:px-8`), and card treatment
 * (`rounded-xl bg-card ring-1 ring-foreground/10`) all start here.
 *
 * Kept static on purpose: `PublicHeader` takes an optional `tutor`, and
 * passing it would mean reading the session cookie on every visit and turning
 * this page dynamic. Nothing here is personalised, so it stays prerendered.
 */
export default function HomePage() {
  return (
    <>
      <PublicHeader />

      <main className="flex-1">
        <Hero />
        <ValueStrip />
        <WhyUs />
        <HowItWorks />
        <FinalCta />
      </main>

      <PublicFooter />
    </>
  );
}

/* =========================================================
   HERO
========================================================= */

const TRUST_POINTS = [
  "One profile",
  "Easy applications",
  "Track applications",
];

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* A single restrained wash, rather than the three stacked blur blobs
          that previously carried broken arbitrary sizes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(70%_60%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_8%,transparent),transparent_70%)]"
      />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            <GraduationCap className="size-4" aria-hidden="true" />
            A smarter way to find tutoring opportunities
          </p>

          <h1 className="mt-6 font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Turn your knowledge into{" "}
            <span className="text-primary">opportunity</span>.
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty">
            Excellence Tutor connects qualified tutors with meaningful teaching
            opportunities. Create your profile, discover jobs, and apply with
            confidence.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button render={<Link href="/jobs" />} size="xl">
              Explore jobs
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>

            <Button
              render={<Link href="/register" />}
              variant="outline"
              size="xl"
            >
              Become a tutor
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <CheckCircle2
                  className="size-4 text-success"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <JobPreview />
      </div>
    </section>
  );
}

/**
 * Stands in for the stock photo the markup used to reference. There is no
 * image in `public/`, so rather than invent one this shows the product itself:
 * the fields a real listing carries, and what happens after you apply.
 */
function JobPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:ml-auto">
      <div className="rounded-2xl bg-card p-5 shadow-xl shadow-primary/5 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Job code
            </p>
            <p className="font-heading text-lg font-semibold">ET-1042</p>
          </div>

          <StatusBadge status="OPEN" />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t pt-5 text-sm">
          <PreviewField
            icon={<BookOpen />}
            label="Subject"
            value="Mathematics"
          />
          <PreviewField
            icon={<GraduationCap />}
            label="Grade"
            value="Grade 10"
          />
          <PreviewField icon={<MapPin />} label="Place" value="Bole" />
          <PreviewField
            icon={<Wallet />}
            label="Salary"
            value="5,000 ETB"
          />
        </dl>

        <div className="mt-5 flex items-center gap-3 rounded-lg bg-muted/60 p-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"
          >
            <ClipboardList className="size-4.5" />
          </span>

          <div className="min-w-0">
            <p className="text-sm font-medium">Application submitted</p>
            <p className="text-xs text-muted-foreground">
              Track its progress from your dashboard
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Example listing — real jobs are posted by the Excellence Tutor team
      </p>
    </div>
  );
}

function PreviewField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}

/* =========================================================
   VALUE STRIP
========================================================= */

const VALUES = [
  {
    icon: <UserRound />,
    title: "Build your profile",
    description: "Keep your qualifications and experience organized.",
  },
  {
    icon: <Search />,
    title: "Find the right opportunity",
    description: "Explore tutoring jobs that match your skills.",
  },
  {
    icon: <ShieldCheck />,
    title: "Apply with confidence",
    description: "Submit applications using your saved information.",
  },
];

function ValueStrip() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-px bg-border sm:grid-cols-3">
        {VALUES.map((value) => (
          <div
            key={value.title}
            className="flex gap-4 bg-muted/30 px-4 py-8 sm:px-6 lg:px-8"
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary ring-1 ring-foreground/10 [&>svg]:size-5"
            >
              {value.icon}
            </span>

            <div>
              <h3 className="font-heading font-medium">{value.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   WHY US
========================================================= */

const FEATURES = [
  {
    icon: <UserRound />,
    title: "One professional profile",
    description:
      "Your education, experience, contact information, and documents stay organized in one place.",
  },
  {
    icon: <Search />,
    title: "Explore real opportunities",
    description:
      "Browse available tutoring positions and discover jobs that fit your qualifications.",
  },
  {
    icon: <ShieldCheck />,
    title: "Simple applications",
    description:
      "Apply without repeatedly entering the same personal and academic information.",
  },
  {
    icon: <BookOpen />,
    title: "Manage your journey",
    description:
      "Keep track of your applications and stay organized throughout the process.",
  },
];

function WhyUs() {
  return (
    <section
      id="why-us"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28"
    >
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <SectionEyebrow>Why Excellence Tutor</SectionEyebrow>

          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Everything you need to grow as a tutor.
          </h2>

          <p className="mt-5 max-w-md leading-relaxed text-muted-foreground text-pretty">
            The experience is designed around what tutors actually need: less
            repetition, better organization, and easier access to
            opportunities.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl bg-card p-6 ring-1 ring-foreground/10 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground [&>svg]:size-5"
              >
                {feature.icon}
              </span>

              <h3 className="mt-5 font-heading font-medium">{feature.title}</h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
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
    number: "01",
    title: "Create your account",
    description: "Register and create your professional tutor profile.",
  },
  {
    number: "02",
    title: "Explore jobs",
    description: "Find tutoring opportunities that match your skills.",
  },
  {
    number: "03",
    title: "Apply",
    description: "Review your information and submit your application.",
  },
  {
    number: "04",
    title: "Track",
    description: "Follow your applications from your dashboard.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-y bg-muted/30 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <SectionEyebrow>How it works</SectionEyebrow>

          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            From your profile to your next opportunity.
          </h2>

          <p className="mt-5 leading-relaxed text-muted-foreground text-pretty">
            A simple process designed to help you spend less time filling forms
            and more time teaching.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="rounded-xl bg-card p-6 ring-1 ring-foreground/10"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 font-heading text-sm font-semibold text-primary">
                {step.number}
              </span>

              <h3 className="mt-5 font-heading font-medium">{step.title}</h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* =========================================================
   FINAL CTA
========================================================= */

function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="relative isolate overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12 lg:px-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklch,var(--color-highlight)_22%,transparent),transparent_70%)]"
        />

        <span
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary-foreground/15"
        >
          <GraduationCap className="size-7" />
        </span>

        <h2 className="mx-auto mt-7 max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Your next teaching opportunity starts here.
        </h2>

        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-primary-foreground/80 text-pretty">
          Create your tutor profile today and start exploring opportunities
          through Excellence Tutor.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            render={<Link href="/register" />}
            size="xl"
            className="bg-background text-foreground hover:bg-background/90"
          >
            Create your profile
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>

          <Button
            render={<Link href="/jobs" />}
            size="xl"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            variant="outline"
          >
            Explore jobs
          </Button>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SHARED BITS
========================================================= */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold tracking-wide text-primary uppercase">
      {children}
    </p>
  );
}
