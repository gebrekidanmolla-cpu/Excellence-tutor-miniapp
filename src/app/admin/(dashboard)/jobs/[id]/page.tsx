import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import JobActions from "@/components/admin/JobActions";
import JobPostPreview from "@/components/admin/JobPostPreview";

interface JobDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JobDetailsPage({
  params,
}: JobDetailsPageProps) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  if (!job) {
    notFound();
  }

  return (
    <div className="space-y-8">

      {/* Back */}

      <div>
        <Link
          href="/admin/jobs"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Back to Jobs
        </Link>
      </div>

      {/* Header */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

        <div>
          <div className="flex items-center gap-3">

            <h1 className="text-3xl font-bold">
              {job.jobCode}
            </h1>

            <JobStatusBadge
              status={job.status}
            />

          </div>

          <p className="mt-2 text-sm text-gray-500">
            Created{" "}
            {new Date(
              job.createdAt
            ).toLocaleDateString()}
          </p>
        </div>

        <Link
          href={`/admin/jobs/${job.id}/edit`}
          className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-gray-50"
        >
          Edit Job
        </Link>

      </div>

      {/* Job Information */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold">
          Job Information
        </h2>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

          <InfoItem
            label="Job Code"
            value={job.jobCode}
          />

          <InfoItem
            label="Tutor Gender"
            value={job.gender}
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
            label="Place"
            value={job.place}
          />

          <InfoItem
            label="Salary"
            value={`${job.salary.toLocaleString()} ETB`}
          />

          <InfoItem
            label="Applications"
            value={String(
              job._count.applications
            )}
          />

        </div>

      </section>

      {/* Job Post Preview */}
      <JobPostPreview
        job={{
          jobCode: job.jobCode,
          gender: job.gender,
          grade: job.grade,
          subject: job.subject,
          place: job.place,
          salary: job.salary,
        }}
      />
      {/* Application Link */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold">
          Tutor Application Link
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Use this URL for the Apply Here button
          in Telegram.
        </p>

        <div className="mt-4 rounded-xl bg-gray-50 p-4">

          <code className="break-all text-sm">
            /apply/{job.jobCode}
          </code>

        </div>

      </section>

      {/* Job Actions */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold">
          Job Status
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Closing a job prevents it from accepting
          new applications.
        </p>

        <div className="mt-6">

          <JobActions
            jobId={job.id}
            currentStatus={job.status}
          />

        </div>

      </section>

    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-medium wrap-words">
        {value}
      </p>
    </div>
  );
}

function JobStatusBadge({
  status,
}: {
  status: "OPEN" | "CLOSED";
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        status === "OPEN"
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}