import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";

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
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "REVIEWED":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "ACCEPTED":
      return "bg-green-50 text-green-700 border-green-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function MyApplicationsPage() {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const applications = await prisma.application.findMany({
    where: {
      tutorId: tutor.id,
    },
    orderBy: {
      createdAt: "desc",
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
          place: true,
          salary: true,
          status: true,
        },
      },
    },
  });

  return (
    <main className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-gray-500">
          Tutor Portal
        </p>

        <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              My Applications
            </h1>

            <p className="mt-2 text-gray-600">
              Track the tutoring jobs you have applied for.
            </p>
          </div>

          <Link
            href="/jobs"
            className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Browse Jobs
          </Link>
        </div>
      </div>

      {/* Application count */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Total Applications
        </p>

        <p className="mt-1 text-3xl font-bold text-gray-900">
          {applications.length}
        </p>
      </div>

      {/* Empty state */}
      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl">📋</span>
          </div>

          <h2 className="mt-5 text-xl font-bold text-gray-900">
            No applications yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-gray-600">
            You have not applied for any tutoring jobs yet.
            Browse available jobs and apply with one click.
          </p>

          <Link
            href="/jobs"
            className="mt-6 inline-flex rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Browse Available Jobs
          </Link>
        </div>
      ) : (
        /* Applications */
        <div className="space-y-4">
          {applications.map((application) => (
            <div
              key={application.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                {/* Main information */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-gray-500">
                      Job Code
                    </span>

                    <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-bold text-gray-900">
                      {application.job.jobCode}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        application.status
                      )}`}
                    >
                      {getStatusLabel(application.status)}
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-bold text-gray-900">
                    {application.job.subject}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                    <span>
                      <span className="font-medium text-gray-900">
                        Grade:
                      </span>{" "}
                      {application.job.grade}
                    </span>

                    <span>
                      <span className="font-medium text-gray-900">
                        Gender:
                      </span>{" "}
                      {application.job.gender === "ANY"
                        ? "Any"
                        : application.job.gender}
                    </span>

                    <span>
                      <span className="font-medium text-gray-900">
                        Place:
                      </span>{" "}
                      {application.job.place}
                    </span>

                    <span>
                      <span className="font-medium text-gray-900">
                        Salary:
                      </span>{" "}
                      {application.job.salary.toLocaleString()} ETB
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Applied on {formatDate(application.createdAt)}
                  </p>
                </div>

                {/* Action */}
                <div className="shrink-0">
                  <Link
                    href={`/tutor/applications/${application.id}`}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 sm:w-auto"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}