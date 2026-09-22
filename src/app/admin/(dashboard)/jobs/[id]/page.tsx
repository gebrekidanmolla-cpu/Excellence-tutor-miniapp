import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  FileText,
  GraduationCap,
  MapPin,
  MessageSquare,
  Pencil,
  RefreshCw,
  Send,
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
import TelegramPostActions from "@/components/admin/TelegramPostActions";
import JobApplicants from "./JobApplicants";
import {
  formatDate,
  formatDateTime,
  formatEnum,
  formatSalary,
} from "@/lib/format";
import {
  buildChannelMessageUrl,
  isTelegramConfigured,
} from "@/lib/telegram";
import { canRenderApplyButton } from "@/lib/telegram-post";

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
      /* Ordered here rather than in the client: best entrance result first is
         how the admin actually reads the pool, and a tie goes to whoever
         applied first. `JobApplicants` therefore needs no sort controls. */
      applications: {
        orderBy: [
          {
            tutor: {
              entrancePercentage: "desc",
            },
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          status: true,
          createdAt: true,
          tutor: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              gender: true,
              tutorStatus: true,
              university: true,
              department: true,
              currentGPA: true,
              CGPA: true,
              entranceScore: true,
              entranceTotal: true,
              entrancePercentage: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    notFound();
  }

  const applicants = job.applications.map((application) => ({
    ...application,
    createdAt: application.createdAt.toISOString(),
  }));

  const applicantCount = applicants.length;

  const pendingCount = applicants.filter(
    (applicant) => applicant.status === "PENDING"
  ).length;

  const applyPath = `/apply/${job.jobCode}`;

  /* Falls back to the path when the base URL is unset, rather than to the
     `https://YOUR-DOMAIN.com` placeholder that `job-post.ts` still uses. */
  const applyUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}${applyPath}`
    : applyPath;

  /* Server-only reads — both stay out of the client bundle. */
  const telegramConfigured = isTelegramConfigured();

  const channelMessageUrl = job.telegramMessageId
    ? await buildChannelMessageUrl(job.telegramMessageId)
    : null;

  /* A localhost base URL is a dead link for a channel reader, so the
     post ships without its button. Say so rather than let it be a
     silent surprise. */
  const showsApplyButton = canRenderApplyButton();

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
                href="#applicants"
                className="text-primary underline-offset-4 hover:underline"
              >
                {applicantCount}
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
          APPLICANTS
      ----------------------------------------------------- */}
      <section
        id="applicants"
        className="scroll-mt-6 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading font-medium">
              Applicants
              {applicantCount > 0 ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                  {applicantCount}
                </span>
              ) : null}
            </h2>

            <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
              {applicantCount === 0
                ? "Nobody has applied to this job yet."
                : `Best entrance result first · ${pendingCount} pending review.`}
            </p>
          </div>

          {applicantCount > 0 ? (
            <Button
              render={<Link href="/admin/applications" />}
              variant="ghost"
              size="sm"
            >
              All applications
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        {/* Assigning is unavailable in these two states, so the reason is
            stated here rather than leaving every row silently short of an
            Assign button. */}
        {job.assignedTutor ? (
          <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground text-pretty">
            <strong className="font-medium text-foreground">
              {job.assignedTutor.fullName}
            </strong>{" "}
            is assigned to this job, so no one else can be assigned. Re-open
            the job below to put every applicant back to pending and choose
            again.
          </p>
        ) : job.status === "CLOSED" ? (
          <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground text-pretty">
            This job is closed, so its applications cannot be changed. Re-open
            it below to pick a tutor from this pool.
          </p>
        ) : null}

        <div className="mt-5">
          <JobApplicants
            applicants={applicants}
            jobCode={job.jobCode}
            jobStatus={job.status}
            hasAssignedTutor={Boolean(job.assignedTutorId)}
          />
        </div>
      </section>

      {/* -----------------------------------------------------
          TELEGRAM CHANNEL
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading font-medium">Telegram channel</h2>

            <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
              {telegramConfigured
                ? "Posted automatically when the job is created, then kept in sync when it is edited, closed or re-opened."
                : "Channel posting is switched off. Jobs still save normally."}
            </p>
          </div>

          <StatusBadge status={job.telegramPostStatus} size="lg" />
        </div>

        <InfoGrid className="mt-5" columns={3}>
          <InfoItem
            label="Posted"
            value={
              job.telegramPostedAt
                ? formatDateTime(job.telegramPostedAt)
                : undefined
            }
            icon={<Send />}
          />

          <InfoItem
            label="Last synced"
            value={
              job.telegramSyncedAt
                ? formatDateTime(job.telegramSyncedAt)
                : undefined
            }
            icon={<RefreshCw />}
          />

          <InfoItem
            label="Channel post"
            value={
              job.telegramMessageId ? (
                channelMessageUrl ? (
                  <a
                    href={channelMessageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    View in Telegram
                  </a>
                ) : (
                  `Message ${job.telegramMessageId}`
                )
              ) : undefined
            }
            icon={<MessageSquare />}
          />
        </InfoGrid>

        {telegramConfigured && !showsApplyButton ? (
          <p className="mt-5 rounded-lg bg-warning/15 px-4 py-3 text-sm text-[color-mix(in_oklch,var(--warning),var(--foreground)_40%)]">
            Posts are going out without their <b>Apply Now</b> button:{" "}
            <code>NEXT_PUBLIC_APP_URL</code> is not a publicly reachable
            address, so the link would be dead for everyone reading the
            channel.
          </p>
        ) : null}

        {job.telegramPostStatus === "FAILED" && job.telegramPostError ? (
          <p className="mt-5 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-[color-mix(in_oklch,var(--destructive),var(--foreground)_30%)]">
            {job.telegramPostError}
          </p>
        ) : null}

        <div className="mt-5">
          <TelegramPostActions
            jobId={job.id}
            hasMessage={job.telegramMessageId !== null}
            configured={telegramConfigured}
          />
        </div>
      </section>

      {/* -----------------------------------------------------
          TELEGRAM POST — manual copy, for posting anywhere else
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
          The channel post links here on its own. This is the copy to
          share anywhere else.
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
          Re-opening clears the assigned tutor, puts every application back to
          pending and opens the job again — so you can still pick from the
          tutors who already applied, and new ones can apply too.
        </p>

        <div className="mt-5">
          <JobActions
            jobId={job.id}
            jobCode={job.jobCode}
            currentStatus={job.status}
            applicationCount={applicantCount}
            assignedTutorName={job.assignedTutor?.fullName ?? null}
            hasChannelPost={job.telegramMessageId !== null}
          />
        </div>
      </section>
    </div>
  );
}
