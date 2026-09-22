import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Check,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
  X,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { formatDate, formatEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "My profile",
};

/**
 * Read-only by design.
 *
 * Documents show only whether they were submitted, with no link: the single
 * document route is `GET /api/admin/tutors/[id]/documents/[document]`, which
 * is admin-gated. A tutor-facing equivalent would be a new API route, which is
 * outside the scope of this redesign.
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="My profile"
        description="The information Excellence Tutor holds for your tutor account."
      />

      {/* -----------------------------------------------------
          IDENTITY
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <UserRound className="size-7" />
          </span>

          <div className="min-w-0">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
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
        </div>

        <Separator className="my-5" />

        <InfoGrid>
          <InfoItem label="Email" value={tutor.email} icon={<Mail />} />
          <InfoItem
            label="Phone"
            value={tutor.phone}
            icon={<Phone />}
          />
          <InfoItem label="Gender" value={formatEnum(tutor.gender)} />
          <InfoItem
            label="Member since"
            value={formatDate(tutor.createdAt)}
          />
        </InfoGrid>
      </section>

      {/* -----------------------------------------------------
          LOCATION
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Location</h2>

        <InfoGrid className="mt-5" columns={3}>
          <InfoItem label="City" value={tutor.city} icon={<MapPin />} />
          <InfoItem label="Subcity" value={tutor.subcity} />
          <InfoItem label="Exact place" value={tutor.exactPlace} />
        </InfoGrid>

        {tutor.aboutMe ? (
          <>
            <Separator className="my-5" />
            <InfoItem label="About me" value={tutor.aboutMe} />
          </>
        ) : null}
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
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Documents</h2>

        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
          These were submitted when you registered. Contact the Excellence
          Tutor team if something needs to change.
        </p>

        <ul className="mt-5 space-y-3">
          <DocumentRow label="Transcript" submitted={tutor.transcriptUrl} />
          <DocumentRow
            label="Entrance result"
            submitted={tutor.entranceResultUrl}
          />
          <DocumentRow
            label="Government ID"
            submitted={extra?.governmentIdUrl}
          />
          {!isStudent ? (
            <DocumentRow
              label="Graduation document"
              submitted={tutor.graduationDocumentUrl}
            />
          ) : null}
          <DocumentRow label="CV / Resume" submitted={tutor.cvUrl} optional />
        </ul>
      </section>
    </div>
  );
}

function DocumentRow({
  label,
  submitted,
  optional,
}: {
  label: string;
  submitted?: string | null;
  optional?: boolean;
}) {
  const present = Boolean(submitted);

  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4",
          present
            ? "bg-success/10 text-success"
            : "bg-muted text-muted-foreground"
        )}
      >
        <FileText />
      </span>

      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>

      <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
        {present ? (
          <>
            <Check className="size-4 text-success" aria-hidden="true" />
            Submitted
          </>
        ) : (
          <>
            <X className="size-4" aria-hidden="true" />
            {optional ? "Not provided" : "Missing"}
          </>
        )}
      </span>
    </li>
  );
}
