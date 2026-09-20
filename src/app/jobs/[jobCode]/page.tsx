import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { formatDate, formatSalary } from "@/lib/format";

/** `ANY` reads as "Any Tutor" rather than the raw enum. */
function formatTutorRequirement(gender: "MALE" | "FEMALE" | "ANY"): string {
  if (gender === "MALE") return "Male Tutor";
  if (gender === "FEMALE") return "Female Tutor";
  return "Any Tutor";
}

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ jobCode: string }>;
}) {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const { jobCode } = await params;

  const job = await prisma.job.findUnique({
    where: {
      jobCode,
    },
    select: {
      id: true,
      jobCode: true,
      gender: true,
      grade: true,
      subject: true,
      place: true,
      salary: true,
      status: true,
      createdAt: true,
      applications: {
        where: {
          tutorId: tutor.id,
        },
        select: {
          id: true,
          status: true,
        },
        take: 1,
      },
    },
  });

  if (!job) {
    notFound();
  }

  const existingApplication = job.applications[0] ?? null;
  const isOpen = job.status === "OPEN";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backHref="/jobs"
        backLabel="Back to available jobs"
        title={job.grade}
        description={job.subject}
        actions={<StatusBadge status={job.status} size="lg" />}
      />

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <BookOpen className="size-5" />
            </span>

            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Job code
              </p>
              <p className="font-heading text-lg font-semibold">
                {job.jobCode}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Monthly salary</p>
            <p className="font-heading text-lg font-semibold">
              {formatSalary(job.salary)}
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <InfoGrid>
            <InfoItem
              label="Grade"
              value={job.grade}
              icon={<GraduationCap />}
            />
            <InfoItem
              label="Subject"
              value={job.subject}
              icon={<BookOpen />}
            />
            <InfoItem label="Place" value={job.place} icon={<MapPin />} />
            <InfoItem
              label="Tutor requirement"
              value={formatTutorRequirement(job.gender)}
              icon={<Users />}
            />
            <InfoItem
              label="Monthly salary"
              value={formatSalary(job.salary)}
              icon={<Wallet />}
            />
            <InfoItem
              label="Posted"
              value={formatDate(job.createdAt)}
              icon={<CalendarDays />}
            />
          </InfoGrid>
        </div>

        <Separator />

        {/* -----------------------------------------------------
            APPLICATION AREA
        ----------------------------------------------------- */}
        <div className="bg-muted/40 p-5 sm:p-6">
          {existingApplication ? (
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"
              >
                <CheckCircle2 className="size-5" />
              </span>

              <div className="min-w-0 space-y-2">
                <h2 className="font-heading font-medium">
                  You already applied for this job
                </h2>

                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  Your application is currently
                  <StatusBadge status={existingApplication.status} />
                </p>

                <Button
                  render={<Link href="/tutor/applications" />}
                  variant="outline"
                  size="lg"
                >
                  View my applications
                </Button>
              </div>
            </div>
          ) : isOpen ? (
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-heading font-medium">
                  Interested in this opportunity?
                </h2>

                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  Submit your application using your tutor profile and
                  qualifications.
                </p>
              </div>

              <Button
                render={<Link href={`/apply/${job.jobCode}`} />}
                size="xl"
                className="shrink-0"
              >
                Apply now
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="font-heading font-medium">
                Applications are closed
              </h2>

              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                This tutoring opportunity is no longer accepting applications.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
