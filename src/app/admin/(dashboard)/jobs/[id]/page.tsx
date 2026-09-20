import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Clock,
  FileText,
  GraduationCap,
  MapPin,
  Pencil,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import { CopyButton } from "@/components/shared/CopyButton";
import JobActions from "@/components/admin/JobActions";
import JobPostPreview from "@/components/admin/JobPostPreview";
import { formatDate, formatEnum, formatSalary } from "@/lib/format";

interface JobDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JobDetailsPage({
  params,
}: JobDetailsPageProps) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: {
      id,
    },
    include: {
      assignedTutor: {
        select: {
          id: true,
          fullName: true,
        },
      },
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  if (!job) {
    notFound();
  }

  const applyPath = `/apply/${job.jobCode}`;

  /* Falls back to the path when the base URL is unset, rather than to the
     `https://YOUR-DOMAIN.com` placeholder that `job-post.ts` still uses. */
  const applyUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}${applyPath}`
    : applyPath;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/jobs"
        backLabel="Back to jobs"
        title={job.jobCode}
        description={`Created ${formatDate(job.createdAt)}`}
        actions={
          <>
            <StatusBadge status={job.status} size="lg" />

            <Button
              render={<Link href={`/admin/jobs/${job.id}/edit`} />}
              variant="outline"
              size="xl"
            >
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Edit job
            </Button>
          </>
        }
      />

      {/* -----------------------------------------------------
          JOB INFORMATION
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Job information</h2>

        <InfoGrid className="mt-5" columns={3}>
          <InfoItem
            label="Subject"
            value={job.subject}
            icon={<BookOpen />}
          />
          <InfoItem
            label="Grade"
            value={job.grade}
            icon={<GraduationCap />}
          />
          <InfoItem
            label="Tutor gender"
            value={formatEnum(job.gender)}
            icon={<Users />}
          />
          <InfoItem label="Place" value={job.place} icon={<MapPin />} />
          <InfoItem
            label="Salary"
            value={formatSalary(job.salary)}
            icon={<Wallet />}
          />
          <InfoItem
            label="Schedule"
            value={`${job.daysPerWeek} days/week · ${job.hoursPerDay} hrs/day`}
            icon={<Clock />}
          />
          <InfoItem
            label="Applications"
            value={
              <Link
                href="/admin/applications"
                className="text-primary underline-offset-4 hover:underline"
              >
                {job._count.applications}
              </Link>
            }
            icon={<FileText />}
          />
          <InfoItem
            label="Created"
            value={formatDate(job.createdAt)}
            icon={<CalendarDays />}
          />
          <InfoItem
            label="Assigned tutor"
            value={
              job.assignedTutor ? (
                <Link
                  href={`/admin/tutors/${job.assignedTutor.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {job.assignedTutor.fullName}
                </Link>
              ) : undefined
            }
            icon={<UserRound />}
          />
        </InfoGrid>

        {job.additionalDetails ? (
          <div className="mt-5 border-t pt-5">
            <InfoItem
              label="Additional details"
              value={job.additionalDetails}
            />
          </div>
        ) : null}
      </section>

      {/* -----------------------------------------------------
          TELEGRAM POST
      ----------------------------------------------------- */}
      <JobPostPreview
        job={{
          jobCode: job.jobCode,
          gender: job.gender,
          grade: job.grade,
          subject: job.subject,
          place: job.place,
          salary: job.salary,
        }}
      />

      {/* -----------------------------------------------------
          APPLY LINK
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Tutor application link</h2>

        <p className="mt-0.5 text-sm text-muted-foreground">
          Use this URL for the Apply Here button in Telegram.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2.5 text-sm">
            {applyUrl}
          </code>

          <CopyButton
            value={applyUrl}
            size="xl"
            successMessage="Application link copied"
            className="shrink-0"
          >
            Copy link
          </CopyButton>
        </div>
      </section>

      {/* -----------------------------------------------------
          STATUS
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Job status</h2>

        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
          Closing a job prevents it from accepting new applications.
        </p>

        <div className="mt-5">
          <JobActions jobId={job.id} currentStatus={job.status} />
        </div>
      </section>
    </div>
  );
}
