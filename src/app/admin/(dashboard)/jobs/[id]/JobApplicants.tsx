import Link from "next/link";
import { Users } from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ExpandableDisclosure } from "@/components/shared/ExpandableRow";
import { formatDate, formatDateTime, formatEnum } from "@/lib/format";
import ApplicationRowActions from "../../applications/ApplicationRowActions";

export type JobApplicant = {
  id: string;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  tutor: {
    id: string;
    fullName: string;
    phone: string;
    gender: "ANY" | "MALE" | "FEMALE";
    tutorStatus: "STUDENT" | "GRADUATE";
    university: string | null;
    department: string | null;
    currentGPA: number | null;
    CGPA: number | null;
    entranceScore: number;
    entranceTotal: number;
    entrancePercentage: number;
  };
};

type Props = {
  applicants: readonly JobApplicant[];
  jobCode: string;
  jobStatus: "OPEN" | "CLOSED";
  hasAssignedTutor: boolean;
};

function formatGPA(applicant: JobApplicant): string {
  const { tutorStatus, currentGPA, CGPA } = applicant.tutor;

  if (tutorStatus === "STUDENT") {
    return currentGPA !== null ? currentGPA.toFixed(2) : "—";
  }

  return CGPA !== null ? CGPA.toFixed(2) : "—";
}

/** The label/value pairs revealed by the row chevron. */
function DetailPanel({ applicant }: { applicant: JobApplicant }) {
  const { tutor } = applicant;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Phone</dt>
        <dd>
          <CopyButton
            value={tutor.phone}
            variant="ghost"
            size="sm"
            successMessage="Phone number copied"
            className="-ml-2 font-normal"
          >
            {tutor.phone}
          </CopyButton>
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Gender</dt>
        <dd className="mt-0.5 font-medium">{formatEnum(tutor.gender)}</dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">University</dt>
        <dd className="mt-0.5 font-medium break-words">
          {tutor.university || "—"}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Department</dt>
        <dd className="mt-0.5 font-medium break-words">
          {tutor.department || "—"}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Entrance result</dt>
        <dd className="mt-0.5 font-medium tabular-nums">
          {tutor.entranceScore}/{tutor.entranceTotal}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Tutor profile</dt>
        <dd className="mt-0.5">
          <Link
            href={`/admin/tutors/${tutor.id}`} prefetch={false}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Open profile
          </Link>
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Applied</dt>
        <dd className="mt-0.5 font-medium">
          {formatDateTime(applicant.createdAt)}
        </dd>
      </div>
    </dl>
  );
}

/**
 * This job's pool, on the job page.
 *
 * Before this, the job page showed only a count linking to the global
 * `/admin/applications` list, where finding this job meant typing its code
 * into a search box. That is exactly the moment re-opening a job creates: the
 * pool comes back as pending and the admin has to pick one of those tutors.
 *
 * The rows reuse `ApplicationRowActions` — the same assign / review / reject
 * menu the applications list uses — so those calls have one implementation,
 * not two. Sorting is done by the page's query (best entrance result first),
 * which is why there are no sort controls here.
 */
export default function JobApplicants({
  applicants,
  jobCode,
  jobStatus,
  hasAssignedTutor,
}: Props) {
  /* Mirrors the guards in the assign route: it refuses a closed job, a job
     that already has a tutor, and an already-accepted application. */
  const canAssignToJob = jobStatus !== "CLOSED" && !hasAssignedTutor;

  function rowActionsFor(applicant: JobApplicant) {
    return (
      <ApplicationRowActions
        applicationId={applicant.id}
        status={applicant.status}
        tutorName={applicant.tutor.fullName}
        tutorPhone={applicant.tutor.phone}
        jobCode={jobCode}
        canAssign={canAssignToJob && applicant.status !== "ACCEPTED"}
        canChangeStatus={canAssignToJob}
      />
    );
  }

  const columns: DataTableColumn<JobApplicant>[] = [
    {
      id: "tutor",
      header: "Tutor",
      mobileTitle: true,
      cellClassName: "whitespace-normal",
      cell: (applicant) => (
        <div className="min-w-0">
          <Link
            href={`/admin/applications/${applicant.id}`} prefetch={false}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {applicant.tutor.fullName}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatEnum(applicant.tutor.tutorStatus)}
          </p>
        </div>
      ),
    },
    {
      id: "entrance",
      header: "Entrance",
      cellClassName: "tabular-nums font-medium",
      cell: (applicant) => `${applicant.tutor.entrancePercentage.toFixed(1)}%`,
    },
    {
      id: "gpa",
      header: "GPA",
      cellClassName: "tabular-nums",
      cell: formatGPA,
    },
    {
      id: "applied",
      header: "Applied",
      cellClassName: "text-muted-foreground",
      cell: (applicant) => formatDate(applicant.createdAt),
    },
    {
      id: "status",
      header: "Status",
      cell: (applicant) => <StatusBadge status={applicant.status} />,
    },
    {
      id: "actions",
      header: "",
      hideOnMobile: true,
      headClassName: "w-px",
      cellClassName: "text-right",
      cell: rowActionsFor,
    },
  ];

  return (
    <DataTable
      items={applicants}
      columns={columns}
      getRowKey={(applicant) => applicant.id}
      caption={`Applicants for ${jobCode}`}
      renderExpanded={(applicant) => <DetailPanel applicant={applicant} />}
      getExpandLabel={(applicant) =>
        `Show more details for ${applicant.tutor.fullName}`
      }
      renderMobileCard={(applicant) => (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/admin/applications/${applicant.id}`} prefetch={false}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {applicant.tutor.fullName}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatEnum(applicant.tutor.tutorStatus)}
              </p>
            </div>

            <StatusBadge status={applicant.status} />
          </div>

          <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Entrance</dt>
              <dd className="font-medium tabular-nums">
                {applicant.tutor.entrancePercentage.toFixed(1)}%
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted-foreground">GPA</dt>
              <dd className="font-medium tabular-nums">
                {formatGPA(applicant)}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted-foreground">Applied</dt>
              <dd className="font-medium">{formatDate(applicant.createdAt)}</dd>
            </div>
          </dl>

          <ExpandableDisclosure>
            <DetailPanel applicant={applicant} />
          </ExpandableDisclosure>

          <div className="border-t pt-3">{rowActionsFor(applicant)}</div>
        </div>
      )}
      empty={
        <EmptyState
          icon={<Users />}
          title="No applicants yet"
          description={
            jobStatus === "OPEN"
              ? "Tutors who apply through the application link will appear here."
              : "This job closed without receiving any applications."
          }
        />
      }
    />
  );
}
