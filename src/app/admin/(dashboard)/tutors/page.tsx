import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-context";
import { TUTOR_ROW_SELECT, toTutorRow } from "@/lib/admin-rows";
import { getProfileShareLinkBase } from "@/lib/tutor-profile-server";
import { PageHeader } from "@/components/shared/PageHeader";
import TutorsList from "./TutorsList";

export const metadata = {
  title: "Tutors",
};

/** Every tutor, plus when it was read: the date filter counts back from it. */
async function loadTutors() {
  const tutors = await prisma.tutor.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: TUTOR_ROW_SELECT,
  });

  return {
    rows: tutors.map(toTutorRow),
    loadedAt: Date.now(),
  };
}

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const [{ rows, loadedAt }, linkBase, params] = await Promise.all([
    loadTutors(),
    getProfileShareLinkBase(),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutors"
        description="Find a tutor, send their profile to a parent, or open their documents."
      />

      {/* Keyed on the query string, so a link to a different filtered view
          starts the list afresh. */}
      <TutorsList
        key={JSON.stringify(params)}
        tutors={rows}
        linkBase={linkBase}
        loadedAt={loadedAt}
      />
    </div>
  );
}
