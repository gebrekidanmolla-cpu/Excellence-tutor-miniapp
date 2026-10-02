import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Check,
  FileText,
  Mail,
  Pencil,
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
import { EmptyState } from "@/components/shared/EmptyState";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import DeleteTutorButton from "@/components/admin/DeleteTutorButton";
import TutorShareLink from "@/components/admin/TutorShareLink";
import { profileShareLinkBase } from "@/lib/tutor-profile";
import { isProfileShareExpired } from "@/lib/tutor-profile-server";
import {
  formatDate,
  formatEnum,
  formatSalary,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface PageProps {
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

type TutorWithApplications = NonNullable<
  Awaited<ReturnType<typeof loadTutor>>
>;

type ApplicationRow = TutorWithApplications["applications"][number];

async function loadTutor(id: string) {
  return prisma.tutor.findUnique({
    where: {
      id,
    },
    include: {
      applications: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          job: true,
        },
      },
      assignedJobs: {
        select: {
          jobCode: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export default async function TutorDetailsPage({ params }: PageProps) {
  const { id } = await params;

  const tutor = await loadTutor(id);

  if (!tutor) {
    notFound();
  }

  const isStudent = tutor.tutorStatus === "STUDENT";

  // The share link is copied into chats, so it has to be absolute. Without
  // the parent subdomain configured it falls back to this request's own
  // host, which is right in every environment.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : "";

  const applicationColumns: DataTableColumn<ApplicationRow>[] = [
    {
      id: "job",
      header: "Job",
      mobileTitle: true,
      cell: (application) => (
        <Link
          href={`/admin/jobs/${application.job.id}`} prefetch={false}
          className="font-mono font-medium text-primary underline-offset-4 hover:underline"
        >
          {application.job.jobCode}
        </Link>
      ),
    },
    {
      id: "subject",
      header: "Subject",
      cell: (application) => application.job.subject,
    },
    {
      id: "grade",
      header: "Grade",
      cell: (application) => application.job.grade,
    },
    {
      id: "place",
      header: "Place",
      cell: (application) => application.job.place || "—",
    },
    {
      id: "salary",
      header: "Salary",
      cellClassName: "tabular-nums",
      cell: (application) => formatSalary(application.job.salary),
    },
    {
      id: "status",
      header: "Status",
      cell: (application) => <StatusBadge status={application.status} />,
    },
    {
      id: "applied",
      header: "Applied",
      cell: (application) => formatDate(application.createdAt),
    },
    {
      id: "actions",
      header: "",
      hideOnMobile: true,
      headClassName: "text-right",
      cellClassName: "text-right",
      cell: (application) => (
        <Button
          render={<Link href={`/admin/applications/${application.id}`} prefetch={false} />}
          variant="outline"
          size="sm"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/tutors"
        backLabel="Back to tutors"
        title={tutor.fullName}
        description={`Registered ${formatDate(tutor.createdAt)}`}
        actions={
          <>
            <Badge variant="secondary">
              {isStudent ? "Student Tutor" : "Graduate Tutor"}
            </Badge>

            {tutor.emailVerified ? (
              <Badge
                variant="outline"
                className="gap-1 border-transparent bg-success/10 text-[color-mix(in_oklch,var(--success),var(--foreground)_35%)]"
              >
                <BadgeCheck className="size-3" aria-hidden="true" />
                Email verified
              </Badge>
            ) : (
              <Badge variant="outline">Email unverified</Badge>
            )}

            <Button
              render={<Link href={`/admin/tutors/${tutor.id}/edit`} prefetch={false} />}
              variant="outline"
              size="xl"
            >
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Edit tutor
            </Button>

            <DeleteTutorButton
              tutorId={tutor.id}
              tutorName={tutor.fullName}
              applicationCount={tutor.applications.length}
              assignedJobCodes={tutor.assignedJobs.map((job) => job.jobCode)}
            />
          </>
        }
      />

      {/* -----------------------------------------------------
          SUMMARY
      ----------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Tutor type"
          value={isStudent ? "Student" : "Graduate"}
        />
        <SummaryTile
          label="Applications"
          value={String(tutor.applications.length)}
        />
        <SummaryTile
          label="Entrance"
          value={`${tutor.entrancePercentage.toFixed(1)}%`}
        />
        <SummaryTile
          label="GPA / CGPA"
          value={
            (isStudent ? tutor.currentGPA : tutor.CGPA)?.toFixed(2) ?? "—"
          }
        />
      </div>

      {/* -----------------------------------------------------
          PUBLIC PROFILE LINK
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Public profile link</h2>

        <p className="mt-0.5 mb-5 text-sm text-muted-foreground text-pretty">
          A page you can send to parents: education, entrance result, and the
          transcript, entrance result, graduation document, government ID and
          CV. It leaves out the tutor&apos;s phone, email and exact address.
          Anyone with the link can open it until it expires, 30 days after it
          is created or reset.
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
          linkBase={profileShareLinkBase(origin)}
        />
      </section>

      {/* -----------------------------------------------------
          ACCOUNT
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading font-medium">Account information</h2>

          {tutor.profilePhotoUrl ? (
            <a
              href={`/api/admin/tutors/${tutor.id}/documents/profilePhoto`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a 302 to a presigned R2 URL */}
              <img
                src={`/api/admin/tutors/${tutor.id}/documents/profilePhoto`}
                alt={`Profile photo of ${tutor.fullName}`}
                className="size-14 rounded-full object-cover ring-1 ring-foreground/10"
              />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">No profile photo</span>
          )}
        </div>

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
            label="Telegram ID"
            value={tutor.telegramId}
            icon={<Send />}
          />
          <InfoItem
            label="Last updated"
            value={formatDate(tutor.updatedAt)}
          />
        </InfoGrid>

        <Separator className="my-5" />

        <AddressInfo tutor={tutor} />

        {tutor.aboutMe ? (
          <>
            <Separator className="my-5" />
            <InfoItem label="About tutor" value={tutor.aboutMe} />
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
          <p className="text-sm font-medium">Entrance examination</p>

          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
            {tutor.entrancePercentage.toFixed(2)}%
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {tutor.entranceScore} / {tutor.entranceTotal}
            </span>
          </p>
        </div>
      </section>

      {/* -----------------------------------------------------
          APPLICATION HISTORY
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Application history</h2>

        <p className="mt-0.5 text-sm text-muted-foreground">
          Jobs this tutor has applied for.
        </p>

        <div className="mt-5">
          <DataTable
            items={tutor.applications}
            columns={applicationColumns}
            getRowKey={(application) => application.id}
            caption="Application history"
            empty={
              <EmptyState
                icon={<FileText />}
                title="No applications"
                description="This tutor has not applied for any jobs yet."
              />
            }
          />
        </div>
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
        {value}
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
