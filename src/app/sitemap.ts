import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

/*
 * Regenerated at most hourly, and only when a crawler asks for it — a few
 * invocations a day, not one per job write.
 */
export const revalidate = 3600;

/**
 * The public pages worth finding from a search, plus every open job. Closed
 * jobs are left out because their pages carry `noindex`
 * (`applyJobMetadata`). Pages that are signed-in, token-gated or one-off
 * steps (`/forgot-password`, `/reset-password`, `/application-success`)
 * never belong here; see `robots.ts`.
 *
 * No `changeFrequency` or `priority`: Google ignores both.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: { jobCode: true, updatedAt: true },
  });

  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/register` },
    { url: `${SITE_URL}/login` },
    ...jobs.map((job) => ({
      url: `${SITE_URL}/apply/${job.jobCode}`,
      lastModified: job.updatedAt,
    })),
  ];
}
