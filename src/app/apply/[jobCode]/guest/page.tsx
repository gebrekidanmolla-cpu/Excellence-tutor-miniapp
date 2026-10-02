import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { APPLY_JOB_SELECT, JobApplyView } from "../JobApplyView";

/*
 * Rendered on a job's first signed-out visit and then served from the CDN.
 * Every route that writes a job refreshes its page (`refreshPublicJobPages`);
 * the day is only a backstop.
 */
export const revalidate = 86400;

/** None at build time: each job's page is generated on its first visit. */
export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{
    jobCode: string;
  }>;
}

/**
 * `/apply/<jobCode>` for visitors without a `tutor_session` cookie, which
 * `next.config.ts` rewrites here — the URL in the address bar stays
 * `/apply/<jobCode>`. Most Telegram readers arrive this way, and with no
 * session to read the page is identical for all of them, so it is cached
 * rather than rendered per visit.
 *
 * It must never read the session (or cookies at all): that would make the
 * route dynamic again, and a cached copy could carry one tutor's state.
 */
export default async function ApplyGuestPage({ params }: PageProps) {
  const { jobCode } = await params;

  const job = await prisma.job.findUnique({
    where: {
      jobCode,
    },
    select: APPLY_JOB_SELECT,
  });

  if (!job) {
    notFound();
  }

  return <JobApplyView job={job} tutor={null} existingApplication={null} />;
}
