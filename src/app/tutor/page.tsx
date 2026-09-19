import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";

export default async function TutorDashboard() {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const [
    availableJobs,
    totalApplications,
    pendingApplications,
    acceptedApplications,
  ] = await Promise.all([
    prisma.job.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
        status: "PENDING",
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
        status: "ACCEPTED",
      },
    }),
  ]);

  const recentApplications =
    await prisma.application.findMany({
      where: {
        tutorId: tutor.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        job: {
          select: {
            jobCode: true,
            grade: true,
            subject: true,
            salary: true,
          },
        },
      },
    });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">

      {/* Header */}
      <div>
        <p className="text-sm font-medium text-gray-500">
          Tutor Dashboard
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Welcome, {tutor.fullName.split(" ")[0]}
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your tutoring opportunities and applications.
        </p>
      </div>

      {/* Quick action */}
      <div className="mt-8 rounded-3xl bg-black p-7 text-white sm:p-8">

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

          <div>
            <p className="text-sm font-medium text-gray-400">
              Looking for your next opportunity?
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Find a tutoring job
            </h2>

            <p className="mt-2 max-w-xl text-sm text-gray-400">
              Browse available tutoring opportunities and apply
              to positions that match your qualifications.
            </p>
          </div>

          <Link
            href="/jobs"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
          >
            Browse Jobs
          </Link>

        </div>

      </div>

      {/* Statistics */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Available Jobs
          </p>

          <p className="mt-3 text-3xl font-bold">
            {availableJobs}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Currently open opportunities
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            My Applications
          </p>

          <p className="mt-3 text-3xl font-bold">
            {totalApplications}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Applications submitted
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Under Review
          </p>

          <p className="mt-3 text-3xl font-bold">
            {pendingApplications}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Awaiting a decision
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Accepted
          </p>

          <p className="mt-3 text-3xl font-bold">
            {acceptedApplications}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Successful applications
          </p>
        </div>

      </div>

      {/* Main sections */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">

        {/* Recent applications */}
        <div className="rounded-2xl border bg-white shadow-sm lg:col-span-2">

          <div className="flex items-center justify-between border-b px-6 py-5">

            <div>
              <h2 className="font-bold text-gray-900">
                Recent Applications
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Track your latest applications.
              </p>
            </div>

            <Link
              href="/tutor/applications"
              className="text-sm font-semibold text-gray-900 hover:underline"
            >
              View all
            </Link>

          </div>

          {recentApplications.length === 0 ? (
            <div className="px-6 py-12 text-center">

              <p className="font-medium text-gray-900">
                No applications yet
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Explore available jobs and submit your first application.
              </p>

              <Link
                href="/jobs"
                className="mt-5 inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Explore Jobs
              </Link>

            </div>
          ) : (
            <div className="divide-y">

              {recentApplications.map(
                (application) => (
                  <div
                    key={application.id}
                    className="flex flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center"
                  >

                    <div>
                      <p className="font-semibold text-gray-900">
                        {application.job.subject}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {application.job.jobCode}
                        {" · "}
                        Grade {application.job.grade}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">

                      <span className="text-sm font-medium text-gray-700">
                        {application.status}
                      </span>

                      <Link
                        href={`/tutor/applications/${application.id}`}
                        className="text-sm font-semibold text-gray-900 hover:underline"
                      >
                        View
                      </Link>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

        {/* Profile card */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Your Profile
          </p>

          <h2 className="mt-2 text-xl font-bold text-gray-900">
            {tutor.fullName}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {tutor.tutorStatus === "STUDENT"
              ? "Student Tutor"
              : "Graduate Tutor"}
          </p>

          <div className="mt-6 space-y-4">

            <div>
              <p className="text-xs text-gray-400">
                Email
              </p>

              <p className="mt-1 truncate text-sm font-medium">
                {tutor.email}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400">
                Location
              </p>

              <p className="mt-1 text-sm font-medium">
                {tutor.city}, {tutor.subcity}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400">
                Status
              </p>

              <p className="mt-1 text-sm font-medium">
                {tutor.tutorStatus === "STUDENT"
                  ? `${tutor.university ?? "Student"} · ${tutor.department ?? ""}`
                  : tutor.fieldOfGraduation ?? "Graduate"}
              </p>
            </div>

          </div>

          <Link
            href="/tutor/profile"
            className="mt-7 block w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
          >
            View My Profile
          </Link>

        </div>

      </div>

    </div>
  );
}

