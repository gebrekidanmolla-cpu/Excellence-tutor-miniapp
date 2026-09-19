import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending Review";
    case "REVIEWED":
      return "Reviewed";
    case "ACCEPTED":
      return "Accepted";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "REVIEWED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "ACCEPTED":
      return "border-green-200 bg-green-50 text-green-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusDescription(status: string) {
  switch (status) {
    case "PENDING":
      return "Your application has been submitted and is waiting for review by the Excellence Tutor team.";

    case "REVIEWED":
      return "Your application has been reviewed by the Excellence Tutor team.";

    case "ACCEPTED":
      return "Congratulations! Your application has been accepted.";

    case "REJECTED":
      return "Your application was not selected for this tutoring job.";

    default:
      return "Your application status has been updated.";
  }
}

export default async function ApplicationDetailsPage({
  params,
}: PageProps) {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const { id } = await params;

  /*
   * IMPORTANT:
   * We query by BOTH application ID and tutor ID.
   *
   * This prevents one tutor from viewing another tutor's
   * application simply by changing the URL.
   */
  const application = await prisma.application.findFirst({
    where: {
      id,
      tutorId: tutor.id,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: {
          jobCode: true,
          gender: true,
          grade: true,
          subject: true,
          salary: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!application) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8">
      {/* Back navigation */}
      <div>
        <Link
          href="/tutor/applications"
          className="text-sm font-medium text-gray-600 transition hover:text-black"
        >
          ← Back to My Applications
        </Link>
      </div>

      {/* Header */}
      <div>
        <p className="text-sm font-medium text-gray-500">
          Application Details
        </p>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {application.job.subject}
            </h1>

            <p className="mt-2 text-gray-600">
              Job Code:{" "}
              <span className="font-semibold text-gray-900">
                {application.job.jobCode}
              </span>
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold ${getStatusClasses(
              application.status
            )}`}
          >
            {getStatusLabel(application.status)}
          </span>
        </div>
      </div>

      {/* Status */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Application Status
        </h2>

        <div className="mt-5 flex items-start gap-4">
          <div
            className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
              application.status === "ACCEPTED"
                ? "bg-green-500"
                : application.status === "REJECTED"
                  ? "bg-red-500"
                  : application.status === "REVIEWED"
                    ? "bg-blue-500"
                    : "bg-amber-500"
            }`}
          />

          <div>
            <p className="font-semibold text-gray-900">
              {getStatusLabel(application.status)}
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              {getStatusDescription(application.status)}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-gray-100 pt-5 text-sm text-gray-500">
          Applied on {formatDate(application.createdAt)}
        </div>
      </section>

      {/* Job information */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">
            Job Information
          </h2>

          {application.job.status === "OPEN" && (
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              Open
            </span>
          )}

          {application.job.status === "CLOSED" && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
              Closed
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">
              Job Code
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {application.job.jobCode}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Tutor Gender Requirement
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {application.job.gender === "ANY"
                ? "Any"
                : application.job.gender}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Grade
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {application.job.grade}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Subject
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {application.job.subject}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Salary
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {application.job.salary.toLocaleString()} ETB
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Applied
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {formatDate(application.createdAt)}
            </p>
          </div>
        </div>
      </section>

      {/* Tutor information */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Applicant Profile
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              This is the tutor profile associated with this application.
            </p>
          </div>

          <Link
            href="/tutor/profile"
            className="text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600"
          >
            View Profile
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">
              Full Name
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {tutor.fullName}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Email
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {tutor.email}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Phone
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {tutor.phone}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Gender
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {tutor.gender}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Status
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {tutor.tutorStatus === "STUDENT"
                ? "Student"
                : "Graduate"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Location
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {tutor.city}, {tutor.subcity}
            </p>
          </div>
        </div>
      </section>

      {/* Bottom navigation */}
      <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row">
        <Link
          href="/tutor/applications"
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
        >
          ← My Applications
        </Link>

        <Link
          href="/jobs"
          className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Browse Available Jobs
        </Link>
      </div>
    </main>
  );
}