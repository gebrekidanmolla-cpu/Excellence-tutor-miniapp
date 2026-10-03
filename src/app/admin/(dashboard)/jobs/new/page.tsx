import { requireAdmin } from "@/lib/admin-context";
import CreateJobForm from "@/components/admin/CreateJobForm";
import { PageHeader } from "@/components/shared/PageHeader";

export const metadata = {
  title: "Create job",
};

export default async function NewJobPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        backHref="/admin/jobs"
        backLabel="Back to jobs"
        title="Create a job"
        description="Create a tutoring job that can be posted to Telegram."
      />

      <CreateJobForm />
    </div>
  );
}
