import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import EditJobForm from "@/components/admin/EditJobForm";
import { PageHeader } from "@/components/shared/PageHeader";

interface EditJobPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditJobPage({ params }: EditJobPageProps) {
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        backHref={`/admin/jobs/${job.id}`}
        backLabel="Back to job"
        title="Edit job"
        description={job.jobCode}
      />

      <EditJobForm
        job={{
          id: job.id,
          jobCode: job.jobCode,
          gender: job.gender,
          grade: job.grade,
          subject: job.subject,
          place: job.place,
          parentName: job.parentName,
          parentPhone: job.parentPhone,
          salary: job.salary,
          status: job.status,
        }}
      />
    </div>
  );
}
