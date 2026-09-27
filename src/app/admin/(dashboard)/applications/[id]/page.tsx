import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Check,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Send,
  UserRound,
  X,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { AddressInfo } from "@/components/shared/AddressInfo";
import { CopyButton } from "@/components/shared/CopyButton";
import StatusActions from "@/components/admin/StatusActions";
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

type DocumentType =
  | "transcript"
  | "entranceResult"
  | "graduationDocument"
  | "cv"
  | "governmentId";

export default async function ApplicationDetailsPage({
  params,
}: ApplicationDetailsPageProps) {
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
          CONTACT
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Account information</h2>

        <InfoGrid className="mt-5" columns={3}>
          <InfoItem
            label="Full name"
            value={tutor.fullName}
            icon={<UserRound />}
          />
          <InfoItem label="Email" value={tutor.email} icon={<Mail />} />
          <InfoItem
            label="Phone"
            value={
              <CopyButton
                value={tutor.phone}
                variant="ghost"
                size="sm"
                successMessage="Phone number copied"
                className="-ml-2 font-medium"
              >
                {tutor.phone}
              </CopyButton>
            }
            icon={<Phone />}
          />
          <InfoItem label="Gender" value={formatEnum(tutor.gender)} />
          <InfoItem
            label="Tutor status"
            value={formatEnum(tutor.tutorStatus)}
          />
          <InfoItem
            label="Telegram ID"
            value={tutor.telegramId}
            icon={<Send />}
          />
        </InfoGrid>

        <Separator className="my-5" />

        <AddressInfo tutor={tutor} />

        {tutor.aboutMe ? (
          <>
            <Separator className="my-5" />
            <InfoItem label="About me" value={tutor.aboutMe} />
          </>
        ) : null}
      </section>

      {/* -----------------------------------------------------
          EDUCATION + ENTRANCE
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">
          {isStudent ? "Education" : "Graduation & employment"}
        </h2>

        <InfoGrid className="mt-5" columns={3}>
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
                label="Field of graduation"
                value={tutor.fieldOfGraduation}
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
              />
              <InfoItem label="Current job" value={tutor.currentJob} />
            </>
          )}
        </InfoGrid>

        <Separator className="my-5" />

        <div className="rounded-lg bg-muted/60 p-4">
          <p className="text-sm font-medium">Entrance result</p>

          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
            {tutor.entrancePercentage.toFixed(2)}%
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {tutor.entranceScore} / {tutor.entranceTotal}
            </span>
          </p>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground text-pretty">
            The percentage is calculated using the applicant&apos;s actual
            maximum score, allowing results out of 600 and 700 to be compared
            fairly.
          </p>
        </div>
      </section>

      {/* -----------------------------------------------------
          JOB
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading font-medium">Job information</h2>

          <Button
            render={<Link href={`/admin/jobs/${job.id}`} />}
            variant="outline"
            size="sm"
          >
            Open job
            <ExternalLink data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>

        <InfoGrid className="mt-5" columns={3}>
          <InfoItem label="Job code" value={job.jobCode} />
          <InfoItem
            label="Gender requirement"
            value={formatEnum(job.gender)}
          />
          <InfoItem label="Grade" value={job.grade} />
          <InfoItem label="Subject" value={job.subject} />
          <InfoItem label="Place" value={job.place} />
          <InfoItem label="Salary" value={formatSalary(job.salary)} />
          <InfoItem
            label="Job status"
            value={<StatusBadge status={job.status} />}
          />
          <InfoItem
            label="Tutor assignment"
            value={hasAssignedTutor ? "Assigned" : "Not assigned"}
          />
          <InfoItem
            label="Last updated"
            value={formatDateTime(application.updatedAt)}
          />
        </InfoGrid>
      </section>

      {/* -----------------------------------------------------
          DOCUMENTS
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Documents</h2>

        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
          Each link opens through a short-lived signed URL.
        </p>

        <ul className="mt-5 space-y-3">
          <DocumentRow
            title="Transcript"
            tutorId={tutor.id}
            documentType="transcript"
            available={Boolean(tutor.transcriptUrl)}
            required
          />
          <DocumentRow
            title="Entrance result"
            tutorId={tutor.id}
            documentType="entranceResult"
            available={Boolean(tutor.entranceResultUrl)}
            required
          />
          <DocumentRow
            title="Government ID"
            tutorId={tutor.id}
            documentType="governmentId"
            available={Boolean(tutor.governmentIdUrl)}
            required
          />
          {!isStudent ? (
            <DocumentRow
              title="Temporary / Original graduation document"
              tutorId={tutor.id}
              documentType="graduationDocument"
              available={Boolean(tutor.graduationDocumentUrl)}
              required
            />
          ) : null}
          <DocumentRow
            title="CV / Resume"
            tutorId={tutor.id}
            documentType="cv"
            available={Boolean(tutor.cvUrl)}
          />
        </ul>
      </section>
    </div>
  );
}

/** Every blocked state above is resolved in the same place: the job page. */
function JobLink({ jobId }: { jobId: string }) {
  return (
    <Link
      href={`/admin/jobs/${jobId}#applicants`}
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

/**
 * The storage key is never exposed. This links to the admin
 * document route, which checks the session and 302s to a 10-minute signed URL.
 */
function DocumentRow({
  title,
  tutorId,
  documentType,
  available,
  required = false,
}: {
  title: string;
  tutorId: string;
  documentType: DocumentType;
  available: boolean;
  required?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between",
        !available && "bg-muted/40"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4",
            available
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground"
          )}
        >
          {available ? <Check /> : <X />}
        </span>

        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {title}
            <Badge variant="outline" className="font-normal">
              {required ? "Required" : "Optional"}
            </Badge>
          </p>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {available ? "Document uploaded" : "Document not available"}
          </p>
        </div>
      </div>

      {available ? (
        <Button
          render={
            <a
              href={`/api/admin/tutors/${tutorId}/documents/${documentType}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          variant="outline"
          size="lg"
          className="shrink-0"
        >
          <FileText data-icon="inline-start" aria-hidden="true" />
          View document
        </Button>
      ) : (
        <span className="shrink-0 text-sm text-muted-foreground">
          Not available
        </span>
      )}
    </li>
  );
}
