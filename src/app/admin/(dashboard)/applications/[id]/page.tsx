import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Send,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { JobStatusBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { AddressInfo } from "@/components/shared/AddressInfo";
import { CopyButton } from "@/components/shared/CopyButton";
import {
  DocumentGallery,
  type GalleryDocument,
} from "@/components/shared/DocumentGallery";
import StatusActions from "@/components/admin/StatusActions";
import TutorShareLink from "@/components/admin/TutorShareLink";
import {
  adminDocumentHref,
  documentLabel,
  type TutorDocumentKind,
} from "@/lib/admin-documents";
import { getObjectContentType, getSignedDownloadUrl } from "@/lib/r2";
import {
  getProfileShareLinkBase,
  isProfileShareExpired,
} from "@/lib/tutor-profile-server";
import { PROFILE_LINK_LIFETIME_DAYS } from "@/lib/tutor-profile";
import {
  formatDateTime,
  formatEnum,
  formatSalary,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface ApplicationDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

/** Matches the admin document route's links, so a preview never outlives them. */
const PREVIEW_URL_SECONDS = 60 * 10;

type DocumentSlot = {
  kind: TutorDocumentKind;
  key: string | null;
  caption: string;
  required: boolean;
};

/**
 * The tutor's documents as gallery cards, each preview signed here rather
 * than loaded through the admin document route: one `<img>` per document
 * would otherwise be one more function invocation and two more queries.
 * Signing is local (no request to R2); only the CV costs a lookup, because
 * its key carries no extension and it is the one file that may be a PDF.
 *
 * A failed signing leaves `previewSrc` unset, so that card falls back to the
 * route, which works either way.
 */
async function loadDocuments(tutorId: string, slots: DocumentSlot[]) {
  const uploaded = slots.filter(
    (slot): slot is DocumentSlot & { key: string } => Boolean(slot.key)
  );

  const cvKey = uploaded.find((slot) => slot.kind === "cv")?.key;

  const [previews, cvContentType] = await Promise.all([
    Promise.all(
      uploaded.map((slot) =>
        getSignedDownloadUrl(slot.key, PREVIEW_URL_SECONDS).catch((error) => {
          console.error(`Failed to sign the ${slot.kind} preview:`, error);
          return undefined;
        })
      )
    ),
    cvKey
      ? getObjectContentType(cvKey).catch((error) => {
          console.error("Failed to read the CV content type:", error);
          return null;
        })
      : null,
  ]);

  const documents: GalleryDocument[] = uploaded.map((slot, index) => {
    // An unknown CV type opens in a new tab, which works for either.
    const isPdf =
      slot.kind === "cv" && !cvContentType?.startsWith("image/");

    return {
      id: slot.kind,
      title: documentLabel(slot.kind),
      caption: isPdf ? "PDF document" : slot.caption,
      kind: isPdf ? "pdf" : "image",
      href: adminDocumentHref(tutorId, slot.kind),
      previewSrc: isPdf ? undefined : previews[index],
    };
  });

  const missing = slots
    .filter((slot) => !slot.key)
    .map((slot) => ({ kind: slot.kind, required: slot.required }));

  return { documents, missing };
}

export default async function ApplicationDetailsPage({
  params,
}: ApplicationDetailsPageProps) {
  await requireAdmin();

  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: {
      id,
    },
    include: {
      tutor: true,
      job: true,
    },
  });

  if (!application) {
    notFound();
  }

  const tutor = application.tutor;
  const job = application.job;

  const jobIsClosed = job.status === "CLOSED";
  const hasAssignedTutor = Boolean(job.assignedTutorId);
  const applicationIsAccepted = application.status === "ACCEPTED";

  const canReview =
    !jobIsClosed && !hasAssignedTutor && !applicationIsAccepted;

  const isStudent = tutor.tutorStatus === "STUDENT";

  const [linkBase, { documents, missing }] = await Promise.all([
    getProfileShareLinkBase(),
    loadDocuments(tutor.id, [
      {
        kind: "transcript",
        key: tutor.transcriptUrl,
        caption: "Academic record",
        required: true,
      },
      {
        kind: "entranceResult",
        key: tutor.entranceResultUrl,
        caption: `${tutor.entranceScore} / ${tutor.entranceTotal} · ${tutor.entrancePercentage.toFixed(1)}%`,
        required: true,
      },
      {
        kind: "governmentId",
        key: tutor.governmentIdUrl,
        caption: "Identity document",
        required: true,
      },
      // Only graduates are asked for one.
      ...(isStudent
        ? []
        : [
            {
              kind: "graduationDocument" as const,
              key: tutor.graduationDocumentUrl,
              caption: "Temporary or original degree",
              required: true,
            },
          ]),
      {
        kind: "cv",
        key: tutor.cvUrl,
        caption: "Curriculum vitae",
        required: false,
      },
    ]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/applications"
        backLabel="Back to applications"
        title={tutor.fullName}
        description={`Applied ${formatDateTime(application.createdAt)} · ${job.jobCode}`}
        actions={
          <>
            <StatusBadge status={application.status} size="lg" />

            {hasAssignedTutor ? (
              <Badge variant="secondary">Tutor assigned</Badge>
            ) : null}

            {jobIsClosed ? (
              <Badge variant="secondary">Job closed</Badge>
            ) : null}
          </>
        }
      />

      {/* -----------------------------------------------------
          ACTIONS — first, since this is what the page is for
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Application actions</h2>

        <p className="mt-0.5 text-sm text-muted-foreground">
          Review the application and manage its status.
        </p>

        <div className="mt-5">
          {applicationIsAccepted ? (
            <Notice
              tone="success"
              title="Tutor accepted"
              description={
                <>
                  This application has been accepted and the tutor has been
                  assigned to this job. <JobLink jobId={job.id} /> to unassign
                  them and put every applicant back to pending.
                </>
              }
            />
          ) : jobIsClosed ? (
            <Notice
              tone="muted"
              title="Job closed"
              description={
                <>
                  This job is closed, so its applications cannot be changed.{" "}
                  <JobLink jobId={job.id} /> to pick a tutor from its pool.
                </>
              }
            />
          ) : hasAssignedTutor ? (
            <Notice
              tone="muted"
              title="Tutor already assigned"
              description={
                <>
                  Another tutor has been assigned to this job.{" "}
                  <JobLink jobId={job.id} /> to choose again.
                </>
              }
            />
          ) : canReview ? (
            <StatusActions
              applicationId={application.id}
              currentStatus={application.status}
              tutorName={tutor.fullName}
              jobCode={job.jobCode}
            />
          ) : null}
        </div>
      </section>

      {/* -----------------------------------------------------
          JOB — with the parent to call, which the job page
          otherwise keeps a click away
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-medium">
              Job{" "}
              <span className="font-mono">{job.jobCode}</span>
            </h2>
            <JobStatusBadge
              status={job.status}
              hasAssignedTutor={hasAssignedTutor}
            />
          </div>

          <Button
            render={<Link href={`/admin/jobs/${job.id}`} prefetch={false} />}
            variant="outline"
            size="lg"
          >
            Open job
            <ExternalLink data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-5 grid gap-4 rounded-lg bg-muted/60 p-4 sm:grid-cols-2">
          <InfoItem
            label="Parent name"
            value={job.parentName}
            icon={<UserRound />}
          />
          <InfoItem
            label="Parent phone"
            value={
              job.parentPhone ? (
                <CopyButton
                  value={job.parentPhone}
                  variant="ghost"
                  size="sm"
                  successMessage="Parent phone copied"
                  className="-ml-2 font-medium tabular-nums"
                >
                  {job.parentPhone}
                </CopyButton>
              ) : undefined
            }
            icon={<Phone />}
          />
        </div>

        <InfoGrid className="mt-5" columns={3}>
          <InfoItem label="Subject" value={job.subject} icon={<BookOpen />} />
          <InfoItem
            label="Grade"
            value={job.grade}
            icon={<GraduationCap />}
          />
          <InfoItem label="Place" value={job.place} icon={<MapPin />} />
          <InfoItem
            label="Salary"
            value={formatSalary(job.salary)}
            icon={<Wallet />}
          />
          <InfoItem
            label="Schedule"
            value={`${job.daysPerWeek} days/week · ${job.hoursPerDay} hrs/day`}
            icon={<Clock />}
          />
          <InfoItem
            label="Tutor gender"
            value={formatEnum(job.gender)}
            icon={<Users />}
          />
          <InfoItem
            label="Tutor assignment"
            value={
              job.assignedTutorId === tutor.id
                ? "This tutor"
                : hasAssignedTutor
                  ? "Another tutor"
                  : "Not assigned"
            }
          />
          <InfoItem
            label="Last updated"
            value={formatDateTime(application.updatedAt)}
            icon={<CalendarDays />}
          />
        </InfoGrid>

        {job.additionalDetails ? (
          <div className="mt-5 border-t pt-5">
            <InfoItem
              label="Additional details"
              value={job.additionalDetails}
            />
          </div>
        ) : null}
      </section>

      {/* -----------------------------------------------------
          TUTOR — account, education and the parent link side
          by side on a wide screen
      ----------------------------------------------------- */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading font-medium">Account information</h2>

            <Button
              render={
                <Link href={`/admin/tutors/${tutor.id}`} prefetch={false} />
              }
              variant="ghost"
              size="sm"
            >
              Tutor profile
              <ExternalLink data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>

          <InfoGrid className="mt-5" columns={2}>
            <InfoItem
              label="Full name"
              value={tutor.fullName}
              icon={<UserRound />}
            />
            <InfoItem
              label="Phone"
              value={
                <CopyButton
                  value={tutor.phone}
                  variant="ghost"
                  size="sm"
                  successMessage="Phone number copied"
                  className="-ml-2 font-medium tabular-nums"
                >
                  {tutor.phone}
                </CopyButton>
              }
              icon={<Phone />}
            />
            <InfoItem label="Email" value={tutor.email} icon={<Mail />} />
            <InfoItem
              label="Telegram ID"
              value={tutor.telegramId}
              icon={<Send />}
            />
            <InfoItem label="Gender" value={formatEnum(tutor.gender)} />
            <InfoItem
              label="Tutor status"
              value={formatEnum(tutor.tutorStatus)}
            />
          </InfoGrid>

          <Separator className="my-5" />

          <AddressInfo tutor={tutor} />

          <Separator className="my-5" />

          <h3 className="text-sm font-medium">
            {isStudent ? "Education" : "Graduation & employment"}
          </h3>

          <InfoGrid className="mt-4" columns={2}>
            {isStudent ? (
              <>
                <InfoItem
                  label="University / College"
                  value={tutor.university}
                  icon={<Building2 />}
                />
                <InfoItem label="Department" value={tutor.department} />
                <InfoItem label="Current year" value={tutor.currentYear} />
                <InfoItem
                  label="Current GPA"
                  value={tutor.currentGPA?.toFixed(2)}
                />
              </>
            ) : (
              <>
                <InfoItem
                  label="University graduated from"
                  value={tutor.universityGraduatedFrom}
                  icon={<Building2 />}
                />
                <InfoItem
                  label="Field of graduation"
                  value={tutor.fieldOfGraduation}
                />
                <InfoItem label="CGPA" value={tutor.CGPA?.toFixed(2)} />
                <InfoItem
                  label="Employment status"
                  value={formatEnum(tutor.employmentStatus)}
                />
                <InfoItem label="Current job" value={tutor.currentJob} />
              </>
            )}
          </InfoGrid>

          <div className="mt-5 rounded-lg bg-muted/60 p-4">
            <p className="text-sm font-medium">Entrance result</p>

            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {tutor.entrancePercentage.toFixed(2)}%
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {tutor.entranceScore} / {tutor.entranceTotal}
              </span>
            </p>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground text-pretty">
              The percentage is calculated using the applicant&apos;s actual
              maximum score, allowing results out of 600 and 700 to be
              compared fairly.
            </p>
          </div>

          {tutor.aboutMe ? (
            <>
              <Separator className="my-5" />
              <InfoItem label="About me" value={tutor.aboutMe} />
            </>
          ) : null}
        </section>

        <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <h2 className="font-heading font-medium">Parent link</h2>

          <p className="mt-0.5 mb-5 text-sm text-muted-foreground text-pretty">
            The profile page to send this job&apos;s parent: education,
            entrance result and documents, without the tutor&apos;s phone,
            email or exact address. It works for{" "}
            {PROFILE_LINK_LIFETIME_DAYS} days after it is created or reset.
          </p>

          <TutorShareLink
            tutorId={tutor.id}
            initialToken={tutor.profileShareToken}
            initialExpiresAt={
              tutor.profileShareExpiresAt?.toISOString() ?? null
            }
            initialExpired={isProfileShareExpired(
              tutor.profileShareExpiresAt
            )}
            linkBase={linkBase}
          />
        </section>
      </div>

      {/* -----------------------------------------------------
          DOCUMENTS — previewed in place
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Documents</h2>

        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
          Tap a document to enlarge it; &ldquo;Open original&rdquo; opens the
          full file in a new tab.
        </p>

        {missing.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Not uploaded:</span>
            {missing.map((document) => (
              <Badge
                key={document.kind}
                variant="outline"
                className={cn(
                  "font-normal",
                  document.required &&
                    "border-destructive/30 bg-destructive/5 text-[color-mix(in_oklch,var(--destructive),var(--foreground)_30%)]"
                )}
              >
                {documentLabel(document.kind)}
                {document.required ? " (required)" : ""}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-5">
          {documents.length > 0 ? (
            <DocumentGallery documents={documents} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This tutor has not uploaded any documents.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/** Every blocked state above is resolved in the same place: the job page. */
function JobLink({ jobId }: { jobId: string }) {
  return (
    <Link
      href={`/admin/jobs/${jobId}#applicants`} prefetch={false}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      Open the job
    </Link>
  );
}

function Notice({
  tone,
  title,
  description,
}: {
  tone: "success" | "muted";
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        tone === "success"
          ? "border-success/30 bg-success/5"
          : "border-border bg-muted/50"
      )}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        {description}
      </p>
    </div>
  );
}
