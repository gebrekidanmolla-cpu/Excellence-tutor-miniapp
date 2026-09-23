import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MapPin,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { formatEnum, formatSalary } from "@/lib/format";
import styles from "./page.module.css";

export const revalidate = 60;

async function getLiveJobs() {
  const [jobs, openCount] = await Promise.all([
    prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        jobCode: true,
        subject: true,
        grade: true,
        place: true,
        salary: true,
        gender: true,
      },
    }),
    prisma.job.count({ where: { status: "OPEN" } }),
  ]);

  return { jobs, openCount };
}

export default async function HomePage() {
  const { jobs, openCount } = await getLiveJobs();

  return (
    <>
      <PublicHeader />

      <main className="flex-1 overflow-hidden">
        <Hero openCount={openCount} />
        {jobs.length > 0 ? <LiveJobsMarquee jobs={jobs} /> : null}
        <UniversityShowcase />
        <ValueBand />
        <WhyUs />
        <Testimonials />
        <HowItWorks />
        <FinalCta />
      </main>

      <PublicFooter />
    </>
  );
}

/* =========================================================
   SHARED
========================================================= */

function SectionIndex({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
      <span className="font-serif text-sm text-highlight tabular-nums">
        {index}
      </span>
      <span aria-hidden="true" className="h-px w-7 bg-border" />
      {children}
    </p>
  );
}

function Grain({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" className={styles.grain}>
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

/* =========================================================
   HERO
========================================================= */

function Hero({ openCount }: { openCount: number }) {
  return (
    <section className="relative isolate min-h-180 overflow-hidden border-b">
      <div aria-hidden="true" className={styles.auroraLayer}>
        <span className={styles.auroraOrbA} />
        <span className={styles.auroraOrbB} />
      </div>

      <Grain id="grain-hero" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-50 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--color-border)_55%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--color-border)_35%,transparent)_1px,transparent_1px)] bg-size-[5.5rem_5.5rem] mask-[linear-gradient(to_bottom,black,transparent_85%)]"
      />

      <div className="mx-auto grid max-w-7xl gap-14 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="relative z-10 lg:col-span-7 lg:pt-8">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3.5 py-2 text-xs font-semibold tracking-[0.16em] uppercase shadow-lg shadow-primary/5 backdrop-blur-xl">
              <Sparkles className="size-3.5 text-highlight" />
              Ethiopia&apos;s tutor opportunity platform
            </div>
          </ScrollReveal>

          <ScrollReveal delay={70}>
            <h1 className="mt-7 max-w-4xl font-heading text-[clamp(3.2rem,8vw,6.9rem)] leading-[0.88] font-semibold tracking-[-0.055em] text-balance">
              Your knowledge
              <span className="mt-2 block">
                deserves a{" "}
                <span className="font-serif font-normal italic text-primary">
                  bigger stage.
                </span>
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={140}>
            <p className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Excellence Tutor connects qualified tutors with real teaching
              opportunities—beautifully organized, simple to discover, and
              built around your growth.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Magnetic>
                <Button
                  render={<Link href="/jobs" />}
                  size="xl"
                  className="group shadow-xl shadow-primary/20"
                >
                  Explore opportunities
                  <ArrowRight
                    data-icon="inline-end"
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Button>
              </Magnetic>

              <Magnetic>
                <Button
                  render={<Link href="/register" />}
                  variant="outline"
                  size="xl"
                  className="bg-background/60 backdrop-blur-md"
                >
                  Become a tutor
                </Button>
              </Magnetic>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={260}>
            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              {["One professional profile", "Easy applications", "Track your journey"].map(
                (item, index) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-highlight" />
                    <span>{item}</span>
                    {index < 2 ? (
                      <span className="hidden h-4 w-px bg-border sm:inline-block" />
                    ) : null}
                  </span>
                ),
              )}
            </div>
          </ScrollReveal>
        </div>

        <div className="relative lg:col-span-5">
          <ScrollReveal delay={130} className="h-full">
            <HeroVisual openCount={openCount} />
          </ScrollReveal>
        </div>
      </div>

      <div className="pointer-events-none absolute right-[7%] bottom-8 hidden select-none font-serif text-[10rem] leading-none text-primary/[0.035] italic lg:block">
        ET
      </div>
    </section>
  );
}

function HeroVisual({ openCount }: { openCount: number }) {
  return (
    <div className="relative mx-auto flex min-h-130 w-full max-w-127.5 items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute inset-[8%] rounded-[3rem] bg-primary/10 blur-3xl"
      />

      <div className="absolute top-5 right-0 z-20 hidden rounded-2xl border bg-background/80 p-4 shadow-xl backdrop-blur-xl sm:block">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-highlight/15 text-highlight">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Open now</p>
            <p className="font-heading text-lg font-semibold tabular-nums">
              {openCount}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 z-20 rounded-2xl border bg-background/80 p-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Profile ready</p>
            <p className="text-xs text-muted-foreground">
              Apply with confidence
            </p>
          </div>
        </div>
      </div>

      <div className="relative w-[88%] rotate-2 overflow-hidden rounded-[2rem] border bg-card shadow-[0_35px_90px_-25px_color-mix(in_oklch,var(--color-primary)_35%,transparent)] transition-transform duration-700 hover:rotate-0">
        <div className="relative aspect-4/5 overflow-hidden bg-muted">
          <Image
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=85"
            alt="Students collaborating and learning together"
            fill
            priority
            sizes="(min-width: 1024px) 460px, 90vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/5 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/65 uppercase">
              Excellence Tutor
            </p>
            <p className="mt-2 max-w-sm font-heading text-2xl font-semibold leading-tight sm:text-3xl">
              Teach what you know. Build what comes next.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x border-t bg-background">
          <div className="p-4">
            <p className="text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
              Applications
            </p>
            <p className="mt-1 font-heading font-semibold">Organized</p>
          </div>
          <div className="p-4">
            <p className="text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
              Opportunities
            </p>
            <p className="mt-1 font-heading font-semibold">Real-time</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LIVE JOBS
========================================================= */

type LiveJob = {
  id: string;
  jobCode: string;
  subject: string;
  grade: string;
  place: string;
  salary: number;
  gender: "MALE" | "FEMALE" | "ANY";
};

function LiveJobsMarquee({ jobs }: { jobs: LiveJob[] }) {
  const cards = jobs.map((job) => <JobTicket key={job.id} job={job} />);
  const duplicateCards = jobs.map((job) => (
    <JobTicket key={job.id} job={job} duplicate />
  ));

  return (
    <section
      aria-label="Currently open tutoring positions"
      className="border-b bg-muted/25 py-10 sm:py-12"
    >
      <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Live opportunities
        </p>

        <Link
          href="/jobs"
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View all
          <ArrowUpRight
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>

      <div className={styles.marqueeViewport}>
        <div
          className={styles.marqueeTrack}
          style={
            {
              "--marquee-duration": `${jobs.length * 6}s`,
            } as React.CSSProperties
          }
        >
          <div className="flex gap-4 pr-4">{cards}</div>
          <div aria-hidden="true" className="flex gap-4 pr-4">
            {duplicateCards}
          </div>
        </div>
      </div>
    </section>
  );
}

function JobTicket({
  job,
  duplicate = false,
}: {
  job: LiveJob;
  duplicate?: boolean;
}) {
  return (
    <Link
      href={`/apply/${job.jobCode}`}
      tabIndex={duplicate ? -1 : undefined}
      className="group flex w-80 shrink-0 flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs text-muted-foreground">
          {job.jobCode}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[0.65rem] font-semibold text-muted-foreground">
          {formatEnum(job.gender)}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
          <BookOpen className="size-4" />
        </span>

        <div className="min-w-0">
          <p className="truncate font-heading font-semibold">{job.subject}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Grade {job.grade}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{job.place || "Flexible"}</span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5 font-semibold tabular-nums">
          <Wallet className="size-3.5" aria-hidden="true" />
          {formatSalary(job.salary)}
        </span>
      </div>
    </Link>
  );
}

/* =========================================================
   UNIVERSITY SHOWCASE
========================================================= */

const UNIVERSITIES = [
  { name: "Addis Ababa University", domain: "aau.edu.et", short: "AAU" },
  { name: "Haramaya University", domain: "haramaya.edu.et", short: "HU" },
  { name: "Jimma University", domain: "ju.edu.et", short: "JU" },
  { name: "Bahir Dar University", domain: "bdu.edu.et", short: "BDU" },
  { name: "Mekelle University", domain: "mu.edu.et", short: "MU" },
  { name: "Debre Markos University", domain: "dmu.edu.et", short: "DMU" },
];

function UniversityShowcase() {
  return (
    <section className="relative border-b bg-background py-14 sm:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex flex-col gap-3 text-center">
            <p className="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              A growing tutor community
            </p>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Talent comes from every corner of Ethiopia.
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground">
              Talented tutors from leading universities across Ethiopia,
              bringing diverse knowledge, experience, and academic excellence
              to every learning opportunity.
            </p>
          </div>
        </ScrollReveal>

        <div className={styles.marqueeViewport}>
          <div
            className={styles.marqueeTrack}
            style={{ "--marquee-duration": "32s" } as React.CSSProperties}
          >
            {[UNIVERSITIES, UNIVERSITIES].map((set, setIndex) => (
              <div
                key={setIndex}
                aria-hidden={setIndex === 1 || undefined}
                className="flex gap-4 pr-4"
              >
                {set.map((university, index) => (
                  <div
                    key={`${university.short}-${setIndex}-${index}`}
                    className="group flex min-w-60 items-center gap-4 rounded-2xl border bg-card/70 px-5 py-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg"
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background p-2 shadow-sm">
                      <Image
                        src={`https://www.google.com/s2/favicons?domain=${university.domain}&sz=128`}
                        alt={`${university.name} logo`}
                        width={32}
                        height={32}
                        unoptimized
                        className="size-8 object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-semibold">
                        {university.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {university.short} · Tutor community
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   VALUE BAND
========================================================= */

const VALUES = [
  {
    icon: <UserRound />,
    title: "One professional profile",
    description: "Keep your qualifications, experience, and documents organized.",
  },
  {
    icon: <Search />,
    title: "Find the right opportunity",
    description: "Discover tutoring jobs that match your skills and availability.",
  },
  {
    icon: <ShieldCheck />,
    title: "Apply with confidence",
    description: "Submit your application with a clear, professional profile.",
  },
];

function ValueBand() {
  return (
    <section className="border-b bg-muted/20">
      <div className="mx-auto grid max-w-7xl divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {VALUES.map((value, index) => (
          <ScrollReveal key={value.title} delay={index * 90}>
            <div className="group px-5 py-10 sm:px-7 lg:px-9 lg:py-12">
              <span className="relative inline-flex size-12 items-center justify-center rounded-2xl border bg-background text-muted-foreground shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/20 group-hover:text-primary group-hover:shadow-lg">
                {value.icon}
              </span>

              <h3 className="mt-5 font-heading font-semibold tracking-tight">
                {value.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </div>
          </ScrollReveal>
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
    title: "One professional profile",
    description:
      "Your education, experience, contact information, and documents stay organized in one place.",
    icon: <UserRound />,
  },
  {
    title: "Explore real opportunities",
    description:
      "Browse available tutoring positions and discover jobs that fit your qualifications.",
    icon: <Search />,
  },
  {
    title: "Simple applications",
    description:
      "Apply without repeatedly entering the same personal and academic information.",
    icon: <ClipboardCheck />,
  },
  {
    title: "Manage your journey",
    description:
      "Keep track of your applications and stay organized throughout the process.",
    icon: <Sparkles />,
  },
];

function WhyUs() {
  return (
    <section
      id="why-us"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32"
    >
      <div className="grid gap-14 lg:grid-cols-[minmax(0,0.8fr)_1.2fr] lg:gap-24">
        <ScrollReveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionIndex index="01">Why Excellence Tutor</SectionIndex>

          <h2 className="mt-6 font-heading text-[clamp(2.2rem,4.5vw,4rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance">
            Built to make your next opportunity feel{" "}
            <span className="font-serif font-normal text-primary italic">
              closer.
            </span>
          </h2>

          <p className="mt-6 max-w-lg leading-7 text-muted-foreground">
            Less repetition. Better organization. More time focused on
            teaching, growing, and finding the right opportunities.
          </p>

          <div className="mt-8 flex items-center gap-3 text-sm font-medium">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UsersRound className="size-4" />
            </span>
            Designed around tutors
          </div>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 80}>
              <article className="group relative h-full overflow-hidden rounded-3xl border bg-card p-7 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 lg:p-8">
                <div className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/5 blur-2xl transition-transform duration-700 group-hover:scale-150" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary [&>svg]:size-5">
                      {feature.icon}
                    </span>
                    <span className="font-serif text-3xl text-muted-foreground/20">
                      0{index + 1}
                    </span>
                  </div>

                  <h3 className="mt-12 font-heading text-lg font-semibold tracking-tight">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   TESTIMONIALS
========================================================= */

type TestimonialTone = "primary" | "highlight" | "success" | "info";

const TONE_CLASSES: Record<TestimonialTone, string> = {
  primary: "bg-primary/10 text-primary",
  highlight: "bg-highlight/15 text-highlight",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

/** Illustrative sample quotes — a preview of the voices feature, not
 *  attributed to specific real, verified individuals. */
const TESTIMONIALS: {
  initials: string;
  name: string;
  role: string;
  tone: TestimonialTone;
  quote: string;
}[] = [
  {
    initials: "ST",
    name: "Selam T.",
    role: "Mathematics Tutor",
    tone: "primary",
    quote:
      "Everything lives in one place — my profile, my documents, my applications. I don't explain my background over and over again.",
  },
  {
    initials: "DA",
    name: "Daniel A.",
    role: "Physics Tutor",
    tone: "highlight",
    quote:
      "I found a position that matched my schedule within days. The whole process felt organized and respectful of my time.",
  },
  {
    initials: "RM",
    name: "Ruth M.",
    role: "English Tutor",
    tone: "success",
    quote:
      "Applying used to mean retyping the same details everywhere. Now I build my profile once and apply in a couple of clicks.",
  },
  {
    initials: "YG",
    name: "Yonas G.",
    role: "Chemistry Tutor",
    tone: "info",
    quote:
      "I like knowing exactly where my application stands. No guessing, and no waiting around for a reply that never comes.",
  },
  {
    initials: "BK",
    name: "Bethlehem K.",
    role: "Biology Tutor",
    tone: "primary",
    quote:
      "As a graduate tutor, I wanted something that felt genuinely professional — the whole experience reflects that.",
  },
  {
    initials: "MF",
    name: "Mikiyas F.",
    role: "General Tutor",
    tone: "highlight",
    quote:
      "Simple to sign up, simple to apply, simple to track. Exactly what I needed while juggling more than one student.",
  },
];

function Testimonials() {
  return (
    <section className="relative overflow-hidden border-y bg-primary/[0.035] py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-128 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <SectionIndex index="02">Tutor voices</SectionIndex>
          <h2 className="mx-auto mt-6 max-w-3xl font-heading text-[clamp(2.1rem,4.5vw,3.5rem)] leading-none font-semibold tracking-[-0.04em]">
            Built around what tutors actually say they need.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            A preview of the tutor-voices experience — real stories will
            replace these as the community grows.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <ScrollReveal key={testimonial.name} delay={index * 70}>
              <article className="group relative flex h-full flex-col rounded-3xl border bg-background/80 p-7 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl">
                <Quote
                  className="absolute top-6 right-6 size-8 text-muted-foreground/10 transition-colors duration-300 group-hover:text-primary/10"
                  aria-hidden="true"
                />

                <div className="flex text-highlight">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className="size-3.5 fill-current"
                      aria-hidden="true"
                    />
                  ))}
                  <span className="sr-only">5 out of 5</span>
                </div>

                <p className="relative mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="mt-6 flex items-center gap-3 border-t pt-5">
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold ${TONE_CLASSES[testimonial.tone]}`}
                  >
                    {testimonial.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {testimonial.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </article>
            </ScrollReveal>
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
      className="scroll-mt-20 py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="max-w-2xl">
          <SectionIndex index="03">How it works</SectionIndex>

          <h2 className="mt-6 font-heading text-[clamp(2.2rem,4.5vw,3.5rem)] leading-none font-semibold tracking-[-0.04em] text-balance">
            From your profile to your{" "}
            <span className="font-serif font-normal text-primary italic">
              next opportunity.
            </span>
          </h2>

          <p className="mt-6 leading-7 text-muted-foreground">
            A simple experience designed to help you spend less time filling
            forms and more time teaching.
          </p>
        </ScrollReveal>

        <ol className="mt-14 grid overflow-hidden rounded-3xl border bg-card shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <ScrollReveal key={step.number} delay={index * 90}>
              <li className="group relative h-full border-b p-7 transition-colors duration-300 hover:bg-primary/[0.035] sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0 lg:p-8">
                <span className="font-serif text-5xl leading-none text-primary/25 transition-colors duration-300 group-hover:text-primary/70">
                  {step.number}
                </span>

                <h3 className="mt-8 font-heading font-semibold tracking-tight">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>

                {index < STEPS.length - 1 ? (
                  <ArrowRight className="mt-7 hidden size-4 text-muted-foreground/40 lg:block" />
                ) : null}
              </li>
            </ScrollReveal>
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
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div
        aria-hidden="true"
        className={`${styles.auroraLayer} opacity-90`}
        style={{ filter: "saturate(1.35)" }}
      >
        <span
          className={styles.auroraOrbB}
          style={{ left: "4%", right: "auto" }}
        />
        <span
          className={styles.auroraOrbA}
          style={{ left: "auto", right: "3%" }}
        />
      </div>

      <Grain id="grain-cta" />

      <ScrollReveal className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8 lg:py-32">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 backdrop-blur">
          <GraduationCap className="size-6" />
        </span>

        <h2 className="mx-auto mt-8 max-w-4xl font-heading text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
          Your next teaching opportunity{" "}
          <span className="font-serif font-normal italic">
            starts here.
          </span>
        </h2>

        <p className="mx-auto mt-7 max-w-xl leading-7 text-primary-foreground/75">
          Create your tutor profile and start exploring opportunities through
          Excellence Tutor.
        </p>

        <div className="mt-11 flex flex-col justify-center gap-3 sm:flex-row">
          <Magnetic>
            <Button
              render={<Link href="/register" />}
              size="xl"
              className="group bg-background text-foreground shadow-2xl hover:bg-background/90"
            >
              Create your profile
              <ArrowRight
                data-icon="inline-end"
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Button>
          </Magnetic>

          <Magnetic>
            <Button
              render={<Link href="/jobs" />}
              variant="outline"
              size="xl"
              className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <BookOpen data-icon="inline-start" aria-hidden="true" />
              Explore jobs
            </Button>
          </Magnetic>
        </div>
      </ScrollReveal>
    </section>
  );
}
