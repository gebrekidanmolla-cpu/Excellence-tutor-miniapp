import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Briefcase,
  Building2,
  ExternalLink,
  FileText,
  GraduationCap,
  MapPin,
  UserRound,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getObjectContentType } from "@/lib/r2";
import {
  PROFILE_TOKEN_PATTERN,
  profileDocumentPath,
  type PublicProfileDocument,
} from "@/lib/tutor-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wordmark } from "@/components/layout/Wordmark";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { formatDate, formatEnum } from "@/lib/format";

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
 * Contact details, the exact address and the government ID are left out on
 * purpose: parents reach the tutor through the agency.
 *
 * It links nowhere else on the site — no nav, no tutor-facing footer — since
 * on the parent subdomain every other path is a 404 (see `src/proxy.ts`).
 */
export default async function TutorProfilePage({ params }: PageProps) {
  const { token } = await params;

  // `src/proxy.ts` rewrites every non-token path on the parent subdomain
  // here, so reject malformed tokens without a database round-trip.
  if (!PROFILE_TOKEN_PATTERN.test(token)) {
    notFound();
  }

  const tutor = await prisma.tutor.findUnique({
    where: {
      profileShareToken: token,
    },
    select: {
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
      cvUrl: true,

      createdAt: true,
    },
  });

  if (!tutor) {
    notFound();
  }

  const isStudent = tutor.tutorStatus === "STUDENT";

  // Keys carry no extension; the stored Content-Type says whether the CV
  // can be shown as an image. A failed lookup only costs the preview.
  const cvContentType = tutor.cvUrl
    ? await getObjectContentType(tutor.cvUrl).catch((error) => {
        console.error("Failed to read the CV content type:", error);
        return null;
      })
    : null;

  const area = [tutor.subcity, tutor.city].filter(Boolean).join(", ");

  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Wordmark href={null} />
        </div>
      </header>

      <main className="flex-1 bg-muted/30 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 sm:px-6">
          {/* -----------------------------------------------------
              IDENTITY
          ----------------------------------------------------- */}
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <UserRound className="size-7" />
              </span>

              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Tutor profile
                </p>

                <h1 className="font-heading text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                  {tutor.fullName}
                </h1>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {isStudent ? "Student Tutor" : "Graduate Tutor"}
                  </Badge>
                  <Badge variant="outline">{formatEnum(tutor.gender)}</Badge>
                </div>
              </div>
            </div>

            <InfoGrid className="mt-6" columns={2}>
              <InfoItem label="Area" value={area} icon={<MapPin />} />
              <InfoItem
                label="Member since"
                value={formatDate(tutor.createdAt)}
              />
            </InfoGrid>

            {tutor.aboutMe ? (
              <>
                <Separator className="my-5" />
                <InfoItem
                  label="About"
                  value={
                    <span className="font-normal whitespace-pre-line">
                      {tutor.aboutMe}
                    </span>
                  }
                />
              </>
            ) : null}
          </section>

          {/* -----------------------------------------------------
              EDUCATION
          ----------------------------------------------------- */}
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <h2 className="font-heading font-medium">
              {isStudent ? "Education" : "Education & employment"}
            </h2>

            <InfoGrid className="mt-5" columns={2}>
              {isStudent ? (
                <>
                  <InfoItem
                    label="University / College"
                    value={tutor.university}
                    icon={<Building2 />}
                  />
                  <InfoItem
                    label="Department"
                    value={tutor.department}
                    icon={<GraduationCap />}
                  />
                  <InfoItem label="Current year" value={tutor.currentYear} />
                  <InfoItem
                    label="Current GPA"
                    value={tutor.currentGPA?.toFixed(2)}
                  />
                </>
              ) : (
                <>
                  <InfoItem
                    label="Field of graduation"
                    value={tutor.fieldOfGraduation}
                    icon={<GraduationCap />}
                  />
                  <InfoItem
                    label="University graduated from"
                    value={tutor.universityGraduatedFrom}
                    icon={<Building2 />}
                  />
                  <InfoItem label="CGPA" value={tutor.CGPA?.toFixed(2)} />
                  <InfoItem
                    label="Employment status"
                    value={formatEnum(tutor.employmentStatus)}
                    icon={<Briefcase />}
                  />
                  <InfoItem label="Current job" value={tutor.currentJob} />
                </>
              )}
            </InfoGrid>

            <Separator className="my-5" />

            <div className="rounded-lg bg-muted/60 p-4">
              <p className="text-sm font-medium">
                National entrance examination
              </p>

              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                {tutor.entrancePercentage.toFixed(2)}%
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {tutor.entranceScore} / {tutor.entranceTotal}
                </span>
              </p>
            </div>
          </section>

          {/* -----------------------------------------------------
              DOCUMENTS
          ----------------------------------------------------- */}
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <h2 className="font-heading font-medium">Documents</h2>

            <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
              Tap a document to open it at full size.
            </p>

            <div className="mt-5 space-y-6">
              <DocumentImage
                token={token}
                document="transcript"
                title="Transcript"
                available={Boolean(tutor.transcriptUrl)}
              />

              <DocumentImage
                token={token}
                document="entranceResult"
                title="Entrance examination result"
                available={Boolean(tutor.entranceResultUrl)}
              />

              {!isStudent || tutor.graduationDocumentUrl ? (
                <DocumentImage
                  token={token}
                  document="graduationDocument"
                  title="Graduation document"
                  available={Boolean(tutor.graduationDocumentUrl)}
                />
              ) : null}

              {tutor.cvUrl ? (
                cvContentType === "application/pdf" ? (
                  <CvPdf token={token} />
                ) : cvContentType?.startsWith("image/") ? (
                  <DocumentImage
                    token={token}
                    document="cv"
                    title="CV / Resume"
                    available
                  />
                ) : (
                  <DocumentFrame title="CV / Resume">
                    <OpenDocumentButton token={token} document="cv">
                      Open CV
                    </OpenDocumentButton>
                  </DocumentFrame>
                )
              ) : null}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Excellence Tutor
        </div>
      </footer>
    </>
  );
}

function DocumentFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="space-y-3">
      <figcaption className="flex items-center gap-2 text-sm font-medium">
        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
        {title}
      </figcaption>
      {children}
    </figure>
  );
}

function DocumentImage({
  token,
  document,
  title,
  available,
}: {
  token: string;
  document: PublicProfileDocument;
  title: string;
  available: boolean;
}) {
  if (!available) {
    return (
      <DocumentFrame title={title}>
        <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
          Not provided.
        </p>
      </DocumentFrame>
    );
  }

  const src = profileDocumentPath(token, document);

  return (
    <DocumentFrame title={title}>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {/* A plain <img>: `next/image` would push the private document
            through the optimizer and its cache, outliving a revoked link. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          loading="lazy"
          className="mx-auto h-auto max-h-[80vh] w-full object-contain"
        />
      </a>
    </DocumentFrame>
  );
}

/**
 * Inline PDF viewers are desktop-only in practice — most phone browsers,
 * Telegram's included, show a blank frame — so the open button is always
 * there and the embed is hidden below `sm`.
 */
function CvPdf({ token }: { token: string }) {
  return (
    <DocumentFrame title="CV / Resume">
      <iframe
        src={profileDocumentPath(token, "cv")}
        title="CV / Resume"
        className="hidden h-[80vh] w-full rounded-lg border sm:block"
      />

      <OpenDocumentButton token={token} document="cv">
        Open CV (PDF)
      </OpenDocumentButton>
    </DocumentFrame>
  );
}

function OpenDocumentButton({
  token,
  document,
  children,
}: {
  token: string;
  document: PublicProfileDocument;
  children: React.ReactNode;
}) {
  return (
    <Button
      render={
        <a
          href={profileDocumentPath(token, document)}
          target="_blank"
          rel="noopener noreferrer"
        />
      }
      variant="outline"
      size="lg"
    >
      <ExternalLink data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  );
}
