import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/*
 * The list is the same for every tutor, so it is served from the CDN
 * instead of a function per `/jobs` visit. Every job write refreshes it
 * (`refreshPublicJobPages`); the day is only a backstop.
 *
 * There is deliberately no try/catch: if a refresh throws, the last good
 * list keeps being served, where a caught error would cache a 500.
 */
export const dynamic = "force-static";
export const revalidate = 86400;

/** Open and closed jobs, newest first. `/jobs` splits them into tabs. */
export async function GET() {
  const jobs = await prisma.job.findMany({
    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      jobCode: true,
      gender: true,
      grade: true,
      subject: true,
      place: true,
      salary: true,
      daysPerWeek: true,
      hoursPerDay: true,
      status: true,
      additionalDetails: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    jobs,
  });
}
