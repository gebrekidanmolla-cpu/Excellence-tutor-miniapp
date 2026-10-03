import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-context";
import { APPLICATION_ROW_SELECT, toApplicationRow } from "@/lib/admin-rows";
import { getProfileShareLinkBase } from "@/lib/tutor-profile-server";
import { PageHeader } from "@/components/shared/PageHeader";
import ApplicationsTable from "./ApplicationsTable";

export const metadata = {
  title: "Applications",
};

/** Every application, plus the moment it was read — the date filters count
 *  back from there rather than from the browser's clock, which would put a
 *  row near a cutoff on different sides of it in the server and client
 *  renders. */
async function loadApplications() {
  const applications = await prisma.application.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: APPLICATION_ROW_SELECT,
  });

  return {
    rows: applications.map(toApplicationRow),
    loadedAt: Date.now(),
  };
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  // One query for every application: search, filters and sorting all run
  // in the browser, so changing them never calls the server again.
  const [{ rows, loadedAt }, linkBase, params] = await Promise.all([
    loadApplications(),
    getProfileShareLinkBase(),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Review tutor applications and assign the best candidate to each job."
      />

      {/* Keyed on the query string, so a link to a different filtered view
          (the overview's tiles, the nav) starts the list afresh. */}
      <ApplicationsTable
        key={JSON.stringify(params)}
        applications={rows}
        linkBase={linkBase}
        loadedAt={loadedAt}
      />
    </div>
  );
}
