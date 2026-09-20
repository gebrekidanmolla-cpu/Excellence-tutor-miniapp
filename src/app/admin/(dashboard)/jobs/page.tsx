import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminJobsPage() {
  const jobs = await prisma.job.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div>
          <h1 className="text-3xl font-bold">
            Jobs
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Manage tutoring jobs and applications.
          </p>
        </div>

        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
        >
          + Create Job
        </Link>

      </div>

      {/* Jobs */}

      {jobs.length === 0 ? (

        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">

          <h2 className="text-lg font-semibold">
            No jobs yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Create your first tutoring job.
          </p>

          <Link
            href="/admin/jobs/new"
            className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            Create Job
          </Link>

        </div>

      ) : (

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-225">

              <thead className="border-b bg-gray-50">

                <tr className="text-left text-sm text-gray-500">

                  <th className="px-6 py-4 font-medium">
                    Job Code
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Gender
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Grade
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Subject
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Place
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Salary
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Applications
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Status
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y">

                {jobs.map((job) => (

                  <tr
                    key={job.id}
                    className="text-sm"
                  >

                    <td className="px-6 py-4 font-semibold">
                      {job.jobCode}
                    </td>

                    <td className="px-6 py-4">
                      {job.gender}
                    </td>

                    <td className="px-6 py-4">
                      {job.grade}
                    </td>

                    <td className="px-6 py-4">
                      {job.subject}
                    </td>

                    <td className="px-6 py-4">
                      {job.place}
                    </td>

                    <td className="px-6 py-4">
                      {job.salary.toLocaleString()} ETB
                    </td>

                    <td className="px-6 py-4">
                      {job._count.applications}
                    </td>

                    <td className="px-6 py-4">

                      <JobStatusBadge
                        status={job.status}
                      />

                    </td>

                    <td className="px-6 py-4">

                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="font-semibold hover:underline"
                      >
                        View
                      </Link>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

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