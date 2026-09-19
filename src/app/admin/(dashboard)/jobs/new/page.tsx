import Link from "next/link";
import CreateJobForm from "@/components/admin/CreateJobForm";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">

      <div>
        <Link
          href="/admin/jobs"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Back to Jobs
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">
          Create New Job
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Create a tutoring job that can be posted
          to Telegram.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <CreateJobForm />
      </div>

    </div>
  );
}