import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TutorDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const tutor = await prisma.tutor.findUnique({
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
    },
  });

  if (!tutor) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/admin/tutors"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
      >
        <ArrowLeft size={16} />
        Back to Tutors
      </Link>

      {/* Profile Header */}
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="bg-gray-950 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold ring-1 ring-white/20">
                {tutor.fullName.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {tutor.fullName}
                  </h1>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/10">
                    {tutor.tutorStatus === "STUDENT"
                      ? "Student"
                      : "Graduate"}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-300">
                  Registered{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(tutor.createdAt)}
                </p>
              </div>
            </div>

            <Link
              href={`/admin/tutors/${tutor.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100"
            >
              <Pencil size={17} />
              Edit Tutor
            </Link>
          </div>
        </div>

        {/* Profile Stats */}
        <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ProfileStat
            icon={BriefcaseBusiness}
            label="Applications"
            value={tutor.applications.length}
          />

          <ProfileStat
            icon={CheckCircle2}
            label="Accepted"
            value={
              tutor.applications.filter(
                (application) =>
                  application.status === "ACCEPTED"
              ).length
            }
          />

          <ProfileStat
            icon={GraduationCap}
            label="Entrance Score"
            value={`${tutor.entrancePercentage}%`}
          />
        </div>
      </section>

      {/* Main Content */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 xl:col-span-2">
          {/* Account Information */}
          <Section
            icon={User}
            title="Account Information"
            description="Basic account and contact information"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoItem
                label="Full Name"
                value={tutor.fullName}
              />

              <InfoItem
                label="Gender"
                value={formatGender(tutor.gender)}
              />

              <InfoItem
                label="Email"
                value={tutor.email}
                icon={Mail}
              />

              <InfoItem
                label="Phone"
                value={tutor.phone}
                icon={Phone}
              />

              <InfoItem
                label="Email Verification"
                value={
                  tutor.emailVerified
                    ? "Verified"
                    : "Not verified"
                }
                icon={ShieldCheck}
              />
            </div>
          </Section>

          {/* Location */}
          <Section
            icon={MapPin}
            title="Location"
            description="Tutor's registered location"
          >
            <div className="grid gap-5 sm:grid-cols-3">
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
          </Section>

          {/* About */}
          <Section
            icon={User}
            title="About Tutor"
            description="Personal introduction"
          >
            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600">
                {tutor.aboutMe ||
                  "No information provided."}
              </p>
            </div>
          </Section>

          {/* Education */}
          <Section
            icon={GraduationCap}
            title="Education"
            description={
              tutor.tutorStatus === "STUDENT"
                ? "Current student information"
                : "Graduate information"
            }
          >
            {tutor.tutorStatus === "STUDENT" ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <InfoItem
                  label="University"
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
                    tutor.currentGPA !== null &&
                    tutor.currentGPA !== undefined
                      ? tutor.currentGPA.toFixed(2)
                      : null
                  }
                />
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
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
                    tutor.CGPA !== null &&
                    tutor.CGPA !== undefined
                      ? tutor.CGPA.toFixed(2)
                      : null
                  }
                />

                <InfoItem
                  label="Employment Status"
                  value={formatEmploymentStatus(
                    tutor.employmentStatus
                  )}
                />

                <InfoItem
                  label="Current Job"
                  value={tutor.currentJob}
                />
              </div>
            )}
          </Section>

          {/* Entrance Examination */}
          <Section
            icon={GraduationCap}
            title="Entrance Examination"
            description="Entrance examination performance"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <ScoreCard
                label="Score"
                value={tutor.entranceScore}
              />

              <ScoreCard
                label="Total"
                value={tutor.entranceTotal}
              />

              <ScoreCard
                label="Percentage"
                value={`${tutor.entrancePercentage}%`}
              />
            </div>
          </Section>

          {/* Application History */}
          <Section
            icon={BriefcaseBusiness}
            title="Application History"
            description="Jobs this tutor has applied for"
          >
            {tutor.applications.length === 0 ? (
              <EmptyState message="This tutor has not applied for any jobs yet." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-175 text-left">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">
                        Job
                      </th>

                      <th className="px-4 py-3">
                        Subject
                      </th>

                      <th className="px-4 py-3">
                        Grade
                      </th>

                      <th className="px-4 py-3">
                        Salary
                      </th>

                      <th className="px-4 py-3">
                        Status
                      </th>

                      <th className="px-4 py-3">
                        Applied
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {tutor.applications.map(
                      (application) => (
                        <tr
                          key={application.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-4 py-4">
                            <Link
                              href={`/admin/jobs/${application.job.id}`}
                              className="font-semibold text-gray-950 hover:underline"
                            >
                              #{application.job.jobCode}
                            </Link>
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">
                            {application.job.subject}
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">
                            {application.job.grade}
                          </td>

                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {application.job.salary.toLocaleString()}{" "}
                            ETB
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={
                                application.status
                              }
                            />
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Intl.DateTimeFormat(
                              "en",
                              {
                                dateStyle: "medium",
                              }
                            ).format(
                              application.createdAt
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Documents */}
          <Section
            icon={FileText}
            title="Documents"
            description="Uploaded tutor documents"
          >
            <div className="space-y-3">
              <DocumentItem
                label="Transcript"
                tutorId={tutor.id}
                documentType="transcript"
                available={Boolean(
                  tutor.transcriptUrl
                )}
              />

              <DocumentItem
                label="Entrance Result"
                tutorId={tutor.id}
                documentType="entranceResult"
                available={Boolean(
                  tutor.entranceResultUrl
                )}
              />

              <DocumentItem
                label="Graduation Document"
                tutorId={tutor.id}
                documentType="graduationDocument"
                available={Boolean(
                  tutor.graduationDocumentUrl
                )}
              />

              <DocumentItem
                label="Curriculum Vitae"
                tutorId={tutor.id}
                documentType="cv"
                available={Boolean(tutor.cvUrl)}
              />

              <DocumentItem
                label="Government ID"
                tutorId={tutor.id}
                documentType="governmentId"
                available={Boolean(
                  tutor.governmentIdUrl
                )}
              />
            </div>
          </Section>

          {/* Profile Summary */}
          <Section
            icon={Users}
            title="Profile Summary"
            description="Quick tutor overview"
          >
            <div className="space-y-4">
              <SummaryRow
                label="Tutor Type"
                value={
                  tutor.tutorStatus === "STUDENT"
                    ? "University Student"
                    : "Graduate"
                }
              />

              <SummaryRow
                label="Applications"
                value={String(
                  tutor.applications.length
                )}
              />

              <SummaryRow
                label="Email Status"
                value={
                  tutor.emailVerified
                    ? "Verified"
                    : "Unverified"
                }
              />

              <SummaryRow
                label="Registered"
                value={new Intl.DateTimeFormat(
                  "en",
                  {
                    dateStyle: "medium",
                  }
                ).format(tutor.createdAt)}
              />
            </div>
          </Section>

          {/* Admin Actions */}
          <div className="rounded-2xl border bg-gray-950 p-5 text-white shadow-sm">
            <h3 className="font-semibold">
              Tutor Management
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Update this tutor's registered
              information from the administrative
              editor.
            </p>

            <Link
              href={`/admin/tutors/${tutor.id}/edit`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100"
            >
              <Pencil size={16} />
              Edit Tutor Information
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Components */
/* -------------------------------------------------------------------------- */

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
          <Icon size={18} />
        </div>

        <div>
          <h2 className="font-semibold tracking-tight text-gray-950">
            {title}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ElementType;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        {Icon && (
          <Icon
            size={15}
            className="shrink-0 text-gray-400"
          />
        )}

        <p className="wrap-words text-sm font-medium text-gray-900">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function ProfileStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-600">
        <Icon size={18} />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 text-lg font-bold text-gray-950">
          {value}
        </p>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Secure Document Link */
/* -------------------------------------------------------------------------- */

function DocumentItem({
  label,
  tutorId,
  documentType,
  available,
}: {
  label: string;
  tutorId: string;
  documentType:
    | "transcript"
    | "entranceResult"
    | "graduationDocument"
    | "cv"
    | "governmentId";
  available: boolean;
}) {
  if (!available) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <FileText
            size={17}
            className="text-gray-400"
          />

          <span className="text-sm font-medium text-gray-500">
            {label}
          </span>
        </div>

        <span className="text-xs text-gray-400">
          Not uploaded
        </span>
      </div>
    );
  }

  const documentUrl = `/api/admin/tutors/${tutorId}/documents/${documentType}`;

  return (
    <a
      href={documentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-xl border px-4 py-3 transition hover:bg-gray-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
          <FileText size={17} />
        </div>

        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-gray-800">
            {label}
          </span>

          <span className="block text-xs text-gray-400">
            Open document
          </span>
        </div>
      </div>

      <ExternalLink
        size={15}
        className="shrink-0 text-gray-400 transition group-hover:text-gray-950"
      />
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Summary */
/* -------------------------------------------------------------------------- */

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-gray-900">
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Application Status */
/* -------------------------------------------------------------------------- */

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
      "bg-amber-50 text-amber-700 ring-amber-200",
    REVIEWED:
      "bg-blue-50 text-blue-700 ring-blue-200",
    ACCEPTED:
      "bg-green-50 text-green-700 ring-green-200",
    REJECTED:
      "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[status]}`}
    >
      {status.charAt(0) +
        status.slice(1).toLowerCase()}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty State */
/* -------------------------------------------------------------------------- */

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-gray-50 p-8 text-center">
      <BriefcaseBusiness
        size={24}
        className="mx-auto text-gray-300"
      />

      <p className="mt-3 text-sm text-gray-500">
        {message}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Formatters */
/* -------------------------------------------------------------------------- */

function formatGender(gender: string) {
  if (gender === "ANY") return "Any";
  if (gender === "MALE") return "Male";
  if (gender === "FEMALE") return "Female";

  return gender;
}

function formatEmploymentStatus(
  status: string | null | undefined
) {
  if (!status) return "Not provided";

  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}