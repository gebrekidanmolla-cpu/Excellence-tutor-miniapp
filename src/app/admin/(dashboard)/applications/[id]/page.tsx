import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import StatusActions from "@/components/admin/StatusActions";

interface ApplicationDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ApplicationDetailsPage({
  params,
}: ApplicationDetailsPageProps) {
  const { id } = await params;

  const application =
    await prisma.application.findUnique({
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
  const hasAssignedTutor =
    Boolean(job.assignedTutorId);

  const applicationIsAccepted =
    application.status === "ACCEPTED";

  const canReview =
    !jobIsClosed &&
    !hasAssignedTutor &&
    !applicationIsAccepted;

  return (
    <div className="space-y-8 pb-10">
      {/* =========================================
          BACK BUTTON
      ========================================== */}

      <div>
        <Link
          href="/admin/applications"
          className="inline-flex items-center text-sm font-medium text-gray-600 transition hover:text-black"
        >
          ← Back to Applications
        </Link>
      </div>

      {/* =========================================
          PAGE HEADER
      ========================================== */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Application Details
            </h1>

            <StatusBadge
              status={application.status}
            />
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Application ID: {application.id}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Submitted on{" "}
            {formatDate(application.createdAt)}
          </p>
        </div>

        {/* Job assignment indicator */}
        <div className="flex flex-wrap items-center gap-2">
          {hasAssignedTutor && (
            <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              Tutor Assigned
            </span>
          )}

          {jobIsClosed && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
              Job Closed
            </span>
          )}
        </div>
      </div>

      {/* =========================================
          TUTOR ACCOUNT INFORMATION
      ========================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Account Information"
          description="Tutor account and contact information."
        />

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Full Name"
            value={tutor.fullName}
          />

          <InfoItem
            label="Email"
            value={tutor.email}
          />

          <InfoItem
            label="Phone Number"
            value={tutor.phone}
          />

          <InfoItem
            label="Gender"
            value={formatEnum(tutor.gender)}
          />

          <InfoItem
            label="Tutor Status"
            value={formatEnum(tutor.tutorStatus)}
          />

          <InfoItem
            label="Telegram ID"
            value={tutor.telegramId}
          />
        </div>
      </section>

      {/* =========================================
          LOCATION
      ========================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Location"
          description="Tutor's current residential location."
        />

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="City"
            value={tutor.city}
          />

          <InfoItem
            label="Subcity"
            value={tutor.subcity}
          />

          <InfoItem
            label="Exact Place"
            value={tutor.exactPlace}
          />
        </div>
      </section>

      {/* =========================================
          EDUCATION
      ========================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Education"
          description={
            tutor.tutorStatus === "STUDENT"
              ? "Current student education information."
              : "Graduate education information."
          }
        />

        {tutor.tutorStatus === "STUDENT" ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="University / College"
              value={tutor.university}
            />

            <InfoItem
              label="Department"
              value={tutor.department}
            />

            <InfoItem
              label="Current Year"
              value={tutor.currentYear}
            />

            <InfoItem
              label="Current GPA"
              value={
                tutor.currentGPA !== null
                  ? tutor.currentGPA.toFixed(2)
                  : null
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="Field of Graduation"
              value={tutor.fieldOfGraduation}
            />

            <InfoItem
              label="University Graduated From"
              value={
                tutor.universityGraduatedFrom
              }
            />

            <InfoItem
              label="CGPA"
              value={
                tutor.CGPA !== null
                  ? tutor.CGPA.toFixed(2)
                  : null
              }
            />

            <InfoItem
              label="Employment Status"
              value={formatEnum(
                tutor.employmentStatus
              )}
            />

            <InfoItem
              label="Current Job"
              value={tutor.currentJob}
            />
          </div>
        )}
      </section>

      {/* =========================================
          ENTRANCE EXAMINATION
      ========================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Entrance Examination"
          description="Applicant's entrance examination result."
        />

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Entrance Score"
            value={tutor.entranceScore}
          />

          <InfoItem
            label="Maximum Score"
            value={tutor.entranceTotal}
          />

          <InfoItem
            label="Normalized Percentage"
            value={`${tutor.entrancePercentage.toFixed(
              2
            )}%`}
          />
        </div>

        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">
            Entrance Result
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {tutor.entranceScore} /{" "}
            {tutor.entranceTotal} (
            {tutor.entrancePercentage.toFixed(
              2
            )}
            %)
          </p>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            The percentage is calculated using the
            applicant's actual maximum score, allowing
            results out of 600 and 700 to be compared
            fairly.
          </p>
        </div>
      </section>

      {/* =========================================
          JOB INFORMATION
      ========================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Job Information"
          description="The tutoring position this application is for."
        />

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Job Code"
            value={job.jobCode}
          />

          <InfoItem
            label="Gender Requirement"
            value={formatEnum(job.gender)}
          />

          <InfoItem
            label="Grade"
            value={job.grade}
          />

          <InfoItem
            label="Subject"
            value={job.subject}
          />

          <InfoItem
            label="Salary"
            value={`${job.salary.toLocaleString()} ETB`}
          />

          <InfoItem
            label="Job Status"
            value={formatEnum(job.status)}
          />

          <InfoItem
            label="Tutor Assignment"
            value={
              hasAssignedTutor
                ? "Tutor assigned"
                : "No tutor assigned"
            }
          />
        </div>
      </section>

      {/* =========================================
          APPLICATION INFORMATION
      ========================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Application Information"
          description="Information provided specifically for this job application."
        />

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <InfoItem
            label="Application Status"
            value={formatEnum(application.status)}
          />

          <InfoItem
            label="Application Date"
            value={formatDate(
              application.createdAt
            )}
          />

          <InfoItem
            label="Last Updated"
            value={formatDate(
              application.updatedAt
            )}
          />
        </div>
      </section>

      {/* =========================================
          DOCUMENTS
      ========================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Documents"
          description="Documents uploaded by the tutor during registration."
        />

        <div className="mt-6 space-y-4">
          <DocumentRow
            title="Transcript"
            tutorId={tutor.id}
            documentType="transcript"
            available={Boolean(
              tutor.transcriptUrl
            )}
            required
          />

          <DocumentRow
            title="Entrance Result"
            tutorId={tutor.id}
            documentType="entranceResult"
            available={Boolean(
              tutor.entranceResultUrl
            )}
            required
          />

          {tutor.tutorStatus === "GRADUATE" && (
            <DocumentRow
              title="Temporary / Original Graduation Document"
              tutorId={tutor.id}
              documentType="graduationDocument"
              available={Boolean(
                tutor.graduationDocumentUrl
              )}
              required
            />
          )}

          <DocumentRow
            title="CV / Resume"
            tutorId={tutor.id}
            documentType="cv"
            available={Boolean(tutor.cvUrl)}
          />

          <DocumentRow
            title="Government ID"
            tutorId={tutor.id}
            documentType="governmentId"
            available={Boolean(
              tutor.governmentIdUrl
            )}
          />
        </div>
      </section>

      {/* =========================================
          APPLICATION ACTIONS
      ========================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Application Actions"
          description="Review the application and manage its status."
        />

        <div className="mt-6">
          {applicationIsAccepted ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                Tutor Accepted
              </p>

              <p className="mt-1 text-sm text-green-700">
                This application has been accepted and
                the tutor has been assigned to this job.
              </p>
            </div>
          ) : jobIsClosed ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Job Closed
              </p>

              <p className="mt-1 text-sm text-gray-500">
                This job has already been closed and its
                applications can no longer be changed.
              </p>
            </div>
          ) : hasAssignedTutor ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Tutor Already Assigned
              </p>

              <p className="mt-1 text-sm text-gray-500">
                A tutor has already been assigned to this
                job. This application can no longer be
                modified.
              </p>
            </div>
          ) : (
            <StatusActions
              applicationId={application.id}
              currentStatus={application.status}
            />
          )}
        </div>

        {/* Workflow explanation */}
        {canReview && (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">
              Assignment workflow
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              Mark the application as Reviewed first.
              After review, use Assign Tutor to accept the
              tutor. Assignment will automatically accept
              the selected tutor, reject the other
              applicants, assign the tutor to the job, and
              close the job.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================
   SECTION HEADER
========================================= */

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================
   INFORMATION ITEM
========================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const displayValue =
    value === null ||
    value === undefined ||
    value === ""
      ? "—"
      : String(value);

  return (
    <div>
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 wrap-words font-medium text-gray-900">
        {displayValue}
      </p>
    </div>
  );
}

/* =========================================
   STATUS BADGE
========================================= */

function StatusBadge({
  status,
}: {
  status:
    | "PENDING"
    | "REVIEWED"
    | "ACCEPTED"
    | "REJECTED";
}) {
  const styles = {
    PENDING:
      "bg-yellow-100 text-yellow-800",

    REVIEWED:
      "bg-blue-100 text-blue-800",

    ACCEPTED:
      "bg-green-100 text-green-800",

    REJECTED:
      "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${styles[status]}`}
    >
      {formatEnum(status)}
    </span>
  );
}

/* =========================================
   SECURE DOCUMENT ROW
========================================= */

function DocumentRow({
  title,
  tutorId,
  documentType,
  available,
  required = false,
}: {
  title: string;
  tutorId: string;
  documentType:
    | "transcript"
    | "entranceResult"
    | "graduationDocument"
    | "cv"
    | "governmentId";
  available: boolean;
  required?: boolean;
}) {
  if (!available) {
    return (
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">
              {title}
            </p>

            {required ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Required
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                Optional
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Document not available
          </p>
        </div>

        <span className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500">
          Not Available
        </span>
      </div>
    );
  }

  /*
   * IMPORTANT:
   * Do not expose the Supabase storage path directly.
   *
   * The admin document API verifies the admin session,
   * generates a temporary signed URL, and redirects
   * the browser to the actual document.
   */
  const documentUrl = `/api/admin/tutors/${tutorId}/documents/${documentType}`;

  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900">
            {title}
          </p>

          {required ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Required
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              Optional
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-gray-500">
          Document uploaded
        </p>
      </div>

      <a
        href={documentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold transition hover:bg-gray-50"
      >
        View Document
      </a>
    </div>
  );
}

/* =========================================
   ENUM FORMATTER
========================================= */

function formatEnum(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/* =========================================
   DATE FORMATTER
========================================= */

function formatDate(
  date: Date | string
) {
  return new Date(date).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}
