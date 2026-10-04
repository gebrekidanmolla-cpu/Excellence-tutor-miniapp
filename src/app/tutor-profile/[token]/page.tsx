import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Briefcase,
  Building2,
  CalendarDays,
  GraduationCap,
  Layers,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { getObjectContentType } from "@/lib/r2";
import {
  profileDocumentPath,
  type PublicProfileDocument,
} from "@/lib/tutor-profile";
import { findSharedTutor } from "@/lib/tutor-profile-server";
import { Wordmark } from "@/components/layout/Wordmark";
import {
  DocumentGallery,
  type GalleryDocument,
} from "@/components/shared/DocumentGallery";
import { formatDateLong, formatEnum } from "@/lib/format";
import { fraunces } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

/* Reachable by anyone holding the link, so keep it out of search engines
   and keep the token out of the Referer sent to other hosts. */
export const metadata: Metadata = {
  title: "Tutor profile",
  robots: {
    index: false,
    follow: false,
  },
  referrer: "no-referrer",
};

/**
 * The profile an admin sends to parents (see `src/lib/tutor-profile.ts`).
 * Contact details and the exact address are left out on purpose: parents
 * reach the tutor through the agency.
 *
 * It links nowhere else on the site — no nav, no tutor-facing footer — since
 * on the parent subdomain every other path is a 404 (see `src/proxy.ts`).
 * An unknown, revoked or expired token is a 404 too.
 */
export default async function TutorProfilePage({ params }: PageProps) {
  const { token } = await params;

  const tutor = await findSharedTutor(token, {
    fullName: true,
    gender: true,
    tutorStatus: true,
    city: true,
    subcity: true,
    aboutMe: true,

    university: true,
    department: true,
    currentYear: true,
    currentGPA: true,

    fieldOfGraduation: true,
    universityGraduatedFrom: true,
    CGPA: true,
    employmentStatus: true,
    currentJob: true,

    entranceScore: true,
    entranceTotal: true,
    entrancePercentage: true,

    transcriptUrl: true,
    entranceResultUrl: true,
    graduationDocumentUrl: true,
    governmentIdUrl: true,
    cvUrl: true,
    profilePhotoUrl: true,

    createdAt: true,
    profileShareExpiresAt: true,
  });

  if (!tutor) {
    notFound();
  }

  const isStudent = tutor.tutorStatus === "STUDENT";

  // Keys carry no extension; the stored Content-Type says whether the CV
  // is an image (lightbox) or a PDF (new tab). A failed lookup falls back
  // to the new tab, which works for either.
  const cvContentType = tutor.cvUrl
    ? await getObjectContentType(tutor.cvUrl).catch((error) => {
        console.error("Failed to read the CV content type:", error);
        return null;
      })
    : null;

  const area = [tutor.subcity, tutor.city].filter(Boolean).join(", ");

  const institution = isStudent
    ? tutor.university
    : tutor.universityGraduatedFrom;

  const field = isStudent ? tutor.department : tutor.fieldOfGraduation;

  const gpa = isStudent ? tutor.currentGPA : tutor.CGPA;

  const firstName = tutor.fullName.trim().split(/\s+/)[0];

  const documents: GalleryDocument[] = [];

  const addDocument = (
    id: PublicProfileDocument,
    key: string | null,
    title: string,
    caption: string,
    kind: GalleryDocument["kind"] = "image"
  ) => {
    if (key) {
      documents.push({
        id,
        title,
        caption,
        kind,
        href: profileDocumentPath(token, id),
      });
    }
  };

  addDocument(
    "transcript",
    tutor.transcriptUrl,
    "Transcript",
    "Academic record"
  );
  addDocument(
    "entranceResult",
    tutor.entranceResultUrl,
    "Entrance exam result",
    "National higher-education entrance exam"
  );
  addDocument(
    "graduationDocument",
    tutor.graduationDocumentUrl,
    "Graduation document",
    "Temporary or original degree"
  );
  addDocument(
    "governmentId",
    tutor.governmentIdUrl,
    "Government ID",
    "Identity document"
  );
  addDocument(
    "cv",
    tutor.cvUrl,
    "CV / Resume",
    cvContentType?.startsWith("image/") ? "Curriculum vitae" : "PDF document",
    cvContentType?.startsWith("image/") ? "image" : "pdf"
  );

  return (
    <div
      className={cn(
        fraunces.variable,
        "flex min-h-svh flex-col bg-[oklch(0.985_0.004_264)]"
      )}
    >
      {/* -----------------------------------------------------
          HEADER
      ----------------------------------------------------- */}
      <header className="relative z-10 border-b border-white/10 bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark
            href={null}
            className="[&>span:first-child]:bg-white [&>span:first-child]:text-primary"
          />

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15 backdrop-blur-sm">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Shared privately</span>
            <span className="sm:hidden">Private</span>
          </span>
        </div>
      </header>

      {/* -----------------------------------------------------
          HERO
      ----------------------------------------------------- */}
      <section className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-64 overflow-hidden bg-primary sm:h-72"
        >
          <div className="absolute -top-24 -right-16 size-80 rounded-full bg-highlight/45 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-chart-5/60 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,oklch(1_0_0/0.14)_1px,transparent_1px)] [background-size:22px_22px]" />
          <p className="absolute -right-4 bottom-2 font-serif text-[6.5rem] leading-none text-white/[0.06] italic select-none sm:text-[10rem]">
            Excellence
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-10 sm:px-6 sm:pt-14">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both motion-reduce:animate-none">
            <p className="text-xs font-medium tracking-[0.2em] text-white/70 uppercase">
              Tutor profile
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              Meet{" "}
              <span className="font-serif font-normal text-highlight italic">
                {firstName}
              </span>
              , your prospective tutor
            </h1>
          </div>

          {/* Identity card, overlapping the band. */}
          <div className="mt-8 rounded-3xl bg-card p-6 shadow-xl ring-1 shadow-primary/10 ring-foreground/5 animate-in fade-in slide-in-from-bottom-4 delay-100 duration-700 fill-mode-both motion-reduce:animate-none sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative w-fit shrink-0">
                {tutor.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a 302 to a presigned R2 URL, which next/image can't optimise
                  <img
                    src={profileDocumentPath(token, "profilePhoto")}
                    alt={`Photo of ${tutor.fullName}`}
                    className="size-24 rounded-2xl object-cover shadow-lg shadow-primary/25 sm:size-28"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-5 text-white shadow-lg shadow-primary/25 sm:size-28">
                    <UserRound className="size-11 sm:size-12" aria-hidden="true" />
                  </div>
                )}
                <span
                  aria-hidden="true"
                  className="absolute -right-2 -bottom-2 flex size-9 items-center justify-center rounded-xl bg-highlight text-highlight-foreground shadow-md ring-4 ring-card"
                >
                  <GraduationCap className="size-4.5" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                  {tutor.fullName}
                </h2>

                {field || institution ? (
                  <p className="mt-1 text-sm text-pretty text-muted-foreground sm:text-base">
                    {[field, institution].filter(Boolean).join(" · ")}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip tone="primary">
                    <GraduationCap aria-hidden="true" />
                    {isStudent ? "Student tutor" : "Graduate tutor"}
                  </Chip>
                  <Chip>
                    <UserRound aria-hidden="true" />
                    {formatEnum(tutor.gender)}
                  </Chip>
                  {area ? (
                    <Chip>
                      <MapPin aria-hidden="true" />
                      {area}
                    </Chip>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground sm:flex-col sm:items-end sm:gap-0.5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                <span className="text-xs tracking-wide uppercase">
                  Member since
                </span>
                <span className="font-medium text-foreground">
                  {formatDateLong(tutor.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* -----------------------------------------------------
            HIGHLIGHTS
        ----------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatCard delay="delay-150" className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-4">
              <ScoreRing percentage={tutor.entrancePercentage} />
              <div className="min-w-0">
                <StatLabel>Entrance exam</StatLabel>
                <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                  {tutor.entranceScore}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {tutor.entranceTotal}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  National entrance score
                </p>
              </div>
            </div>
          </StatCard>

          <StatCard delay="delay-200">
            <StatLabel>{isStudent ? "Current GPA" : "Cumulative GPA"}</StatLabel>
            <p className="mt-2 font-heading text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {gpa !== null && gpa !== undefined ? gpa.toFixed(2) : "—"}
              {gpa !== null && gpa !== undefined ? (
                <span className="ml-1 text-sm font-normal text-muted-foreground sm:text-base">
                  / 4.00
                </span>
              ) : null}
            </p>
            {gpa !== null && gpa !== undefined ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2"
                  style={{
                    width: `${Math.min(100, Math.max(0, (gpa / 4) * 100))}%`,
                  }}
                />
              </div>
            ) : null}
          </StatCard>

          <StatCard delay="delay-300">
            {isStudent ? (
              <>
                <StatLabel>Year of study</StatLabel>
                <p className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  {tutor.currentYear ? `Year ${tutor.currentYear}` : "—"}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  <span className="truncate">
                    {tutor.university ?? "University student"}
                  </span>
                </p>
              </>
            ) : (
              <>
                <StatLabel>Currently</StatLabel>
                <p className="mt-2 font-heading text-xl font-semibold tracking-tight break-words sm:text-2xl">
                  {formatEnum(tutor.employmentStatus)}
                </p>
                {tutor.currentJob ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="size-3.5" aria-hidden="true" />
                    <span className="truncate">{tutor.currentJob}</span>
                  </p>
                ) : null}
              </>
            )}
          </StatCard>
        </div>

        {/* -----------------------------------------------------
            ABOUT + EDUCATION
        ----------------------------------------------------- */}
        <div
          className={cn(
            "grid gap-6",
            tutor.aboutMe && "lg:grid-cols-5"
          )}
        >
          {tutor.aboutMe ? (
            <section className="relative overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-foreground/5 animate-in fade-in slide-in-from-bottom-4 delay-300 duration-700 fill-mode-both motion-reduce:animate-none sm:p-8 lg:col-span-3">
              <Quote
                aria-hidden="true"
                className="absolute -top-2 -right-2 size-28 rotate-180 text-primary/[0.06]"
              />
              <SectionTitle icon={<Sparkles />}>
                In {firstName}&apos;s words
              </SectionTitle>
              <blockquote className="relative mt-5 border-l-4 border-highlight pl-5 font-serif text-xl leading-relaxed text-pretty whitespace-pre-line text-foreground/90 italic sm:text-2xl">
                {tutor.aboutMe}
              </blockquote>
            </section>
          ) : null}

          <section
            className={cn(
              "rounded-3xl bg-card p-6 ring-1 ring-foreground/5 animate-in fade-in slide-in-from-bottom-4 delay-300 duration-700 fill-mode-both motion-reduce:animate-none sm:p-8",
              tutor.aboutMe && "lg:col-span-2"
            )}
          >
            <SectionTitle icon={<GraduationCap />}>
              {isStudent ? "Education" : "Education & work"}
            </SectionTitle>

            <dl
              className={cn(
                "mt-5 grid gap-5",
                !tutor.aboutMe && "sm:grid-cols-2"
              )}
            >
              {isStudent ? (
                <>
                  <Detail
                    icon={<Building2 />}
                    label="University / College"
                    value={tutor.university}
                  />
                  <Detail
                    icon={<Layers />}
                    label="Department"
                    value={tutor.department}
                  />
                  <Detail
                    icon={<CalendarDays />}
                    label="Current year"
                    value={tutor.currentYear}
                  />
                </>
              ) : (
                <>
                  <Detail
                    icon={<Layers />}
                    label="Field of graduation"
                    value={tutor.fieldOfGraduation}
                  />
                  <Detail
                    icon={<Building2 />}
                    label="Graduated from"
                    value={tutor.universityGraduatedFrom}
                  />
                  <Detail
                    icon={<Briefcase />}
                    label="Current job"
                    value={tutor.currentJob}
                  />
                </>
              )}
            </dl>
          </section>
        </div>

        {/* -----------------------------------------------------
            DOCUMENTS
        ----------------------------------------------------- */}
        {documents.length > 0 ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 delay-500 duration-700 fill-mode-both motion-reduce:animate-none">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-heading text-2xl font-semibold tracking-tight">
                  Supporting{" "}
                  <span className="font-serif font-normal text-primary italic">
                    documents
                  </span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tap a document to enlarge it.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary tabular-nums">
                {documents.length}{" "}
                {documents.length === 1 ? "document" : "documents"}
              </span>
            </div>

            <DocumentGallery documents={documents} />
          </section>
        ) : null}
      </main>

      {/* -----------------------------------------------------
          FOOTER
      ----------------------------------------------------- */}
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
            Shared privately by Excellence Tutor
            {tutor.profileShareExpiresAt
              ? ` · link valid until ${formatDateLong(tutor.profileShareExpiresAt)}`
              : ""}
          </p>
          <p>© {new Date().getFullYear()} Excellence Tutor</p>
        </div>
      </footer>
    </div>
  );
}

function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "primary" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium [&>svg]:size-3.5",
        tone === "primary"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-foreground/80"
      )}
    >
      {children}
    </span>
  );
}

function StatCard({
  delay,
  className,
  children,
}: {
  /** A tw-animate delay class, so the tiles arrive one after another. */
  delay: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-3xl bg-card p-5 ring-1 sm:p-6 ring-foreground/5 transition-shadow hover:shadow-lg hover:shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both motion-reduce:animate-none",
        delay,
        className
      )}
    >
      {children}
    </div>
  );
}

function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold tracking-tight">
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-4"
      >
        {icon}
      </span>
      {children}
    </h2>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </dt>
        <dd
          className={cn(
            "mt-0.5 font-medium break-words",
            !value && "text-muted-foreground"
          )}
        >
          {value || "—"}
        </dd>
      </div>
    </div>
  );
}

/** Entrance percentage as a ring; the arc is drawn with stroke-dasharray. */
function ScoreRing({ percentage }: { percentage: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="score-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--highlight)" />
          </linearGradient>
        </defs>
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="8"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="url(#score-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-heading text-lg font-semibold tabular-nums">
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}
