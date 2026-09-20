import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApplicationForm from "@/components/forms/ApplicationForm";

interface PageProps {
  params: Promise<{
    jobCode: string;
  }>;
}

export default async function ApplyPage({ params }: PageProps) {
  const { jobCode } = await params;

  const job = await prisma.job.findUnique({
    where: {
      jobCode,
    },
    select: {
      jobCode: true,
      gender: true,
      grade: true,
      subject: true,
      place: true,
      salary: true,
      status: true,
    },
  });

  if (!job) {
    notFound();
  }

  if (job.status !== "OPEN") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">
            Applications Closed
          </h1>

          <p className="mt-3 text-gray-600">
            This tutoring job is no longer accepting applications.
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Job Code: {job.jobCode}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">
            Excellence Tutor
          </h1>

          <p className="mt-2 text-gray-600">
            Tutor Application
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <div className="mb-6">
            <p className="text-sm font-medium text-gray-500">
              Job Code
            </p>

            <p className="text-xl font-bold">
              {job.jobCode}
            </p>
          </div>

          <div className="space-y-4">

            <div>
              <p className="text-sm text-gray-500">
                Tutor Gender
              </p>

              <p className="font-medium">
                {job.gender}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Grade
              </p>

              <p className="font-medium">
                {job.grade}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Subject
              </p>

              <p className="font-medium">
                {job.subject}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Place
              </p>

              <p className="font-medium">
                {job.place}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Salary
              </p>

              <p className="text-xl font-bold">
                {job.salary} ETB
              </p>
            </div>

          </div>

          <button
            className="mt-8 w-full rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
          >
            <ApplicationForm jobCode={job.jobCode} />
          </button>

        </div>

      </div>
    </main>
  );
}