import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-context";
import { JOB_ROW_SELECT, toJobRow } from "@/lib/admin-rows";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import SheetSyncButton from "@/components/admin/SheetSyncButton";
import { isSheetSyncConfigured } from "@/lib/google-sheets";
import JobsList from "./JobsList";

export const metadata = {
  title: "Jobs",
};

/** Every job, plus when it was read: the date filter counts back from it. */
async function loadJobs() {
  const jobs = await prisma.job.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: JOB_ROW_SELECT,
  });

  return {
    rows: jobs.map(toJobRow),
    loadedAt: Date.now(),
  };
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const [{ rows, loadedAt }, params] = await Promise.all([
    loadJobs(),
    searchParams,
  ]);

  const sheetConfigured = isSheetSyncConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Post tutoring jobs, follow up with parents and fill each one."
        actions={
          <>
            {/* The backfill for jobs that predate sheet mirroring, and
                the repair for any row whose sync failed since. */}
            {sheetConfigured && rows.length > 0 ? (
              <SheetSyncButton variant="outline" />
            ) : null}

            <Button
              render={<Link href="/admin/jobs/new" prefetch={false} />}
              size="xl"
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create job
            </Button>
          </>
        }
      />

      {/* Keyed on the query string, so a link to a different filtered view
          starts the list afresh. */}
      <JobsList key={JSON.stringify(params)} jobs={rows} loadedAt={loadedAt} />
    </div>
  );
}
