import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditJobForm from "@/components/admin/EditJobForm";

interface EditJobPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditJobPage({
  params,
}: EditJobPageProps) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: {
      id,
    },
  });

  if (!job) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">

      {/* Back */}

      <div>
        <Link
          href={`/admin/jobs/${job.id}`}
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Back to Job
        </Link>
      </div>

      {/* Header */}

      <div>
        <h1 className="text-3xl font-bold">
          Edit Job
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Update the details for job{" "}
          <strong>{job.jobCode}</strong>.
        </p>
      </div>

      {/* Form */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <EditJobForm
          job={{
            id: job.id,
            jobCode: job.jobCode,
            gender: job.gender,
            grade: job.grade,
            subject: job.subject,
            salary: job.salary,
            status: job.status,
          }}
        />
      </div>

    </div>
  );
}