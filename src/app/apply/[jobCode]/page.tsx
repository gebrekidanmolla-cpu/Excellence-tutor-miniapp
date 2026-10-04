import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";
import { JobApplyView } from "./JobApplyView";
import { applyJobMetadata, findApplyJob } from "./apply-job";

interface PageProps {
  params: Promise<{
    jobCode: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { jobCode } = await params;

  return applyJobMetadata(await findApplyJob(jobCode));
}

/**
 * The public entry point: `src/lib/telegram-post.ts` puts `/apply/<jobCode>`
 * behind every Telegram post's button, so this page is reached by people who
 * may not have an account yet. It's also where "View details" on `/jobs` now sends signed-in
 * tutors directly — there is no separate job-detail page, so this page owns
 * both showing the job and letting a tutor act on it in one visit.
 *
 * Only requests carrying a `tutor_session` cookie get here: `next.config.ts`
 * rewrites the rest to the cached `guest/page.tsx`, so a Telegram reader
 * without an account costs no function invocation. A cookie that fails the
 * session check (expired, or from before a password reset) still lands here,
 * and gets the same signed-out view.
 */
export default async function ApplyPage({ params }: PageProps) {
  const { jobCode } = await params;

  const tutor = await getCurrentTutor();

  const job = await findApplyJob(jobCode);

  if (!job) {
    notFound();
  }

  const existingApplication = tutor
    ? await prisma.application.findFirst({
        where: {
          tutorId: tutor.id,
          jobId: job.id,
        },
        select: {
          status: true,
        },
      })
    : null;

  return (
    <JobApplyView
      job={job}
      tutor={tutor}
      existingApplication={existingApplication}
    />
  );
}
