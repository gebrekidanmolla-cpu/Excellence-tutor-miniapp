import { cache } from "react";
import { redirect } from "next/navigation";

import { getAdminId } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

/**
 * The queue counts behind the admin nav badges and the overview tiles.
 * "New" applications are the `PENDING` ones: nothing else records whether
 * an admin has looked at an application yet.
 */
export type AdminCounts = {
  applications: number;
  pendingApplications: number;
  reviewedApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  /** Submitted in the last 24 hours. */
  applicationsToday: number;
  jobs: number;
  openJobs: number;
  /** Open jobs with at least one pending application. */
  openJobsWithNew: number;
  openJobsWithoutApplicants: number;
  /** Closed with a tutor assigned — see `getJobOutcome`. */
  successfulJobs: number;
  /** Closed with no tutor assigned. */
  failedJobs: number;
  tutors: number;
  /** Registered in the last 7 days. */
  tutorsThisWeek: number;
};

type AdminContextRow = {
  id: string;
  fullName: string;
  email: string;
} & AdminCounts;

/**
 * The signed-in admin and the dashboard counts, in one statement.
 *
 * Every dashboard page renders the nav, and the nav shows counts, so the
 * counts ride along with the admin lookup the layout already made rather
 * than adding a query per page. Prisma can't count three tables in one call
 * — the overview used to make ten — hence the raw SQL. The table and column
 * names are Prisma's defaults (no `@@map` in the schema); keep them in step
 * if that ever changes.
 *
 * Memoized per request (React `cache`), like `getCurrentAdmin`: the layout
 * and the page both call it. API routes keep using `getCurrentAdmin`, which
 * skips the counts.
 */
export const getAdminContext = cache(async () => {
  const adminId = await getAdminId();

  if (!adminId) {
    return null;
  }

  // `createdAt` is a UTC `timestamp` without a time zone, so `now()` is
  // converted to match rather than compared across types.
  const rows = await prisma.$queryRaw<AdminContextRow[]>`
    SELECT a."id", a."fullName", a."email", app.*, job.*, tutor.*
    FROM "public"."Admin" a
    CROSS JOIN (
      SELECT
        count(*)::int AS "applications",
        count(*) FILTER (WHERE "status" = 'PENDING')::int AS "pendingApplications",
        count(*) FILTER (WHERE "status" = 'REVIEWED')::int AS "reviewedApplications",
        count(*) FILTER (WHERE "status" = 'ACCEPTED')::int AS "acceptedApplications",
        count(*) FILTER (WHERE "status" = 'REJECTED')::int AS "rejectedApplications",
        count(*) FILTER (
          WHERE "createdAt" > (now() AT TIME ZONE 'UTC') - interval '24 hours'
        )::int AS "applicationsToday"
      FROM "public"."Application"
    ) app
    CROSS JOIN (
      SELECT
        count(*)::int AS "jobs",
        count(*) FILTER (WHERE j."status" = 'OPEN')::int AS "openJobs",
        count(*) FILTER (
          WHERE j."status" = 'OPEN' AND EXISTS (
            SELECT 1 FROM "public"."Application" x
            WHERE x."jobId" = j."id" AND x."status" = 'PENDING'
          )
        )::int AS "openJobsWithNew",
        count(*) FILTER (
          WHERE j."status" = 'OPEN' AND NOT EXISTS (
            SELECT 1 FROM "public"."Application" x WHERE x."jobId" = j."id"
          )
        )::int AS "openJobsWithoutApplicants",
        count(*) FILTER (
          WHERE j."status" = 'CLOSED' AND j."assignedTutorId" IS NOT NULL
        )::int AS "successfulJobs",
        count(*) FILTER (
          WHERE j."status" = 'CLOSED' AND j."assignedTutorId" IS NULL
        )::int AS "failedJobs"
      FROM "public"."Job" j
    ) job
    CROSS JOIN (
      SELECT
        count(*)::int AS "tutors",
        count(*) FILTER (
          WHERE "createdAt" > (now() AT TIME ZONE 'UTC') - interval '7 days'
        )::int AS "tutorsThisWeek"
      FROM "public"."Tutor"
    ) tutor
    WHERE a."id" = ${adminId}
  `;

  const row = rows[0];

  if (!row) {
    return null;
  }

  const { id, fullName, email, ...counts } = row;

  return { admin: { id, fullName, email }, counts };
});

/**
 * The gate for every dashboard page, not just the layout: a layout is not
 * re-rendered on client navigation, so a page that relied on it alone would
 * render for a request the layout never checked. Costs nothing extra on a
 * full load, where the layout's call is memoized.
 */
export async function requireAdmin() {
  const context = await getAdminContext();

  if (!context) {
    redirect("/admin/login");
  }

  return context;
}
