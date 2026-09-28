import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Check,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  PenLine,
  Phone,
  X,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { AddressInfo } from "@/components/shared/AddressInfo";
import { formatDate, formatEnum } from "@/lib/format";
import { profileStrength } from "@/lib/profile-strength";
import { tutorFileHref, type TutorFileKind } from "@/lib/tutor-files";
import { cn } from "@/lib/utils";
import { ProfileStrengthCard } from "./components/ProfileStrengthCard";
import { ProfilePhotoEditor } from "./components/ProfilePhotoEditor";
import { CvRow } from "./components/CvRow";

export const metadata = {
  title: "My profile",
};

/**
 * The tutor's own profile. The photo and CV are managed right here; a short
 * list of text fields (phone, address, "About me", year / employment) is
 * edited on `/tutor/profile/edit`. Everything the documents vouch for stays
 * read-only — see `src/lib/tutor-profile-edit.ts`.
 *
 * Documents open through `/api/tutor/files/[kind]`, which checks the tutor's
 * own session.
 */
export default async function TutorProfilePage() {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  /* `getCurrentTutor()` selects neither of these. */
  const extra = await prisma.tutor.findUnique({
    where: { id: tutor.id },
    select: { governmentIdUrl: true, emailVerified: true },
  });

  const isStudent = tutor.tutorStatus === "STUDENT";
  const strength = profileStrength(tutor);

  const initials = tutor.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="My profile"
        description="The information Excellence Tutor holds for your tutor account."
        actions={
          <Button render={<Link href="/tutor/profile/edit" />} size="lg">
            <PenLine data-icon="inline-start" aria-hidden="true" />
            Edit profile
          </Button>
        }
      />

      <ProfileStrengthCard strength={strength} />

      {/* -----------------------------------------------------
          IDENTITY
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <ProfilePhotoEditor
          photoUrl={tutorFileHref("photo", tutor.profilePhotoUrl)}
          initials={initials}
        >
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-semibold tracking-tight break-words">
              {tutor.fullName}
            </h2>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {isStudent ? "Student Tutor" : "Graduate Tutor"}
              </Badge>

              {extra?.emailVerified ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-transparent bg-success/10 text-[color-mix(in_oklch,var(--success),var(--foreground)_35%)]"
                >
                  <BadgeCheck className="size-3" aria-hidden="true" />
                  Email verified
                </Badge>
              ) : null}
            </div>
          </div>
        </ProfilePhotoEditor>

        <Separator className="my-5" />

        <InfoGrid>
          <InfoItem label="Email" value={tutor.email} icon={<Mail />} />
          <InfoItem label="Phone" value={tutor.phone} icon={<Phone />} />
          <InfoItem label="Gender" value={formatEnum(tutor.gender)} />
          <InfoItem
            label="Member since"
            value={formatDate(tutor.createdAt)}
          />
        </InfoGrid>
      </section>

      {/* -----------------------------------------------------
          LOCATION + ABOUT
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Location</h2>

        <div className="mt-5">
          <AddressInfo tutor={tutor} />
        </div>

        <Separator className="my-5" />

        {tutor.aboutMe ? (
          <InfoItem label="About me" value={tutor.aboutMe} />
        ) : (
          <Link
            href="/tutor/profile/edit#about"
            className="group flex items-center gap-3 rounded-lg border border-dashed p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <PenLine className="size-4" />
            </span>
            <span className="min-w-0 text-sm">
              <span className="block font-medium">Introduce yourself</span>
              <span className="block text-muted-foreground text-pretty">
                A few sentences about your subjects and teaching style. It is
                the first thing families read.
              </span>
            </span>
          </Link>
        )}
      </section>

      {/* -----------------------------------------------------
          EDUCATION
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">
          {isStudent ? "Education" : "Graduation & employment"}
        </h2>

        <InfoGrid className="mt-5">
          {isStudent ? (
            <>
              <InfoItem
                label="University / College"
                value={tutor.university}
                icon={<Building2 />}
              />
              <InfoItem label="Department" value={tutor.department} />
              <InfoItem
                label="Current year"
                value={tutor.currentYear ? `Year ${tutor.currentYear}` : ""}
              />
              <InfoItem
                label="Current GPA"
                value={tutor.currentGPA?.toString()}
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
                label="University"
                value={tutor.universityGraduatedFrom}
                icon={<Building2 />}
              />
              <InfoItem label="CGPA" value={tutor.CGPA?.toString()} />
              <InfoItem
                label="Employment"
                value={formatEnum(tutor.employmentStatus)}
              />
              {tutor.currentJob ? (
                <InfoItem label="Current job" value={tutor.currentJob} />
              ) : null}
            </>
          )}
        </InfoGrid>

        <Separator className="my-5" />

        <InfoGrid columns={3}>
          <InfoItem
            label="Entrance score"
            value={`${tutor.entranceScore} / ${tutor.entranceTotal}`}
          />
          <InfoItem
            label="Percentage"
            value={`${tutor.entrancePercentage.toFixed(1)}%`}
          />
        </InfoGrid>
      </section>

      {/* -----------------------------------------------------
          DOCUMENTS
      ----------------------------------------------------- */}
      <section
        id="documents"
        className="scroll-mt-24 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
      >
        <h2 className="font-heading font-medium">Documents</h2>

        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
          Your CV is yours to add or replace. The other documents were
          checked when you registered — contact the Excellence Tutor team if
          one of them needs to change.
        </p>

        <ul className="mt-5 space-y-3">
          <DocumentRow
            label="Transcript"
            kind="transcript"
            storedKey={tutor.transcriptUrl}
          />
          <DocumentRow
            label="Entrance result"
            kind="entranceResult"
            storedKey={tutor.entranceResultUrl}
          />
          <DocumentRow
            label="Government ID"
            kind="governmentId"
            storedKey={extra?.governmentIdUrl}
          />
          {!isStudent ? (
            <DocumentRow
              label="Graduation document"
              kind="graduationDocument"
              storedKey={tutor.graduationDocumentUrl}
            />
          ) : null}
          <CvRow href={tutorFileHref("cv", tutor.cvUrl)} />
        </ul>
      </section>
    </div>
  );
}

function DocumentRow({
  label,
  kind,
  storedKey,
}: {
  label: string;
  kind: TutorFileKind;
  storedKey?: string | null;
}) {
  const href = tutorFileHref(kind, storedKey);

  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4",
          href ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        )}
      >
        <FileText />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {href ? (
            <>
              <Check className="size-3.5 text-success" aria-hidden="true" />
              Submitted
            </>
          ) : (
            <>
              <X className="size-3.5" aria-hidden="true" />
              Missing
            </>
          )}
        </span>
      </span>

      {href ? (
        <Button
          render={<a href={href} target="_blank" rel="noopener noreferrer" />}
          variant="ghost"
          size="sm"
          className="shrink-0"
        >
          <ExternalLink data-icon="inline-start" aria-hidden="true" />
          View
        </Button>
      ) : null}
    </li>
  );
}
