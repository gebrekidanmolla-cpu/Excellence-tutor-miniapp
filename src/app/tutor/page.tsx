import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  UserRound,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatEnum } from "@/lib/format";

export default async function TutorDashboard() {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const [
    availableJobs,
    totalApplications,
    pendingApplications,
    acceptedApplications,
  ] = await Promise.all([
    prisma.job.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
        status: "PENDING",
      },
    }),

    prisma.application.count({
      where: {
        tutorId: tutor.id,
        status: "ACCEPTED",
      },
    }),
  ]);

  const recentApplications = await prisma.application.findMany({
    where: {
      tutorId: tutor.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      status: true,
      createdAt: true,
      job: {
        select: {
          jobCode: true,
          grade: true,
          subject: true,
          salary: true,
        },
      },
    },
  });

  const isStudent = tutor.tutorStatus === "STUDENT";

  const affiliation = isStudent
    ? [tutor.university, tutor.department].filter(Boolean).join(" · ")
    : (tutor.fieldOfGraduation ?? "");

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${tutor.fullName.split(" ")[0]}`}
        description="Manage your tutoring opportunities and applications."
        actions={
          <Button render={<Link href="/jobs" />} size="xl">
            <BriefcaseBusiness data-icon="inline-start" aria-hidden="true" />
            Browse jobs
          </Button>
        }
      />

      {/* -----------------------------------------------------
          STATS
      ----------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Available jobs"
          value={availableJobs}
          hint="Currently open opportunities"
          icon={<BriefcaseBusiness />}
          href="/jobs"
        />

        <StatCard
          label="My applications"
          value={totalApplications}
          hint="Applications submitted"
          icon={<FileText />}
          href="/tutor/applications"
        />

        <StatCard
          label="Under review"
          value={pendingApplications}
          hint="Awaiting a decision"
          icon={<Clock />}
        />

        <StatCard
          label="Accepted"
          value={acceptedApplications}
          hint="Successful applications"
          icon={<CheckCircle2 />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------------------------------------------
            RECENT APPLICATIONS
        --------------------------------------------------- */}
        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="font-heading font-medium">
                Recent applications
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Track your latest applications.
              </p>
            </div>

            {recentApplications.length > 0 ? (
              <Button
                render={<Link href="/tutor/applications" />}
                variant="ghost"
                size="sm"
              >
                View all
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          {recentApplications.length === 0 ? (
            <EmptyState
              className="rounded-none border-0"
              icon={<FileText />}
              title="No applications yet"
              description="Explore available jobs and submit your first application."
              action={
                <Button render={<Link href="/jobs" />} size="lg">
                  Explore jobs
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {recentApplications.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/tutor/applications/${application.id}`}
                    className="flex flex-col gap-3 p-5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {application.job.subject}
                      </p>

                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {application.job.jobCode} · Grade{" "}
                        {application.job.grade} ·{" "}
                        {formatDate(application.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {/* Previously rendered the raw enum here while the
                          sibling page rendered a friendly label. */}
                      <StatusBadge status={application.status} />
                      <ArrowRight
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------------------------------
            PROFILE
        --------------------------------------------------- */}
        <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <UserRound className="size-5" />
            </span>

            <div className="min-w-0">
              <h2 className="truncate font-heading font-medium">
                {tutor.fullName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isStudent ? "Student Tutor" : "Graduate Tutor"}
              </p>
            </div>
          </div>

          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5 truncate text-sm font-medium">
                {tutor.email}
              </dd>
            </div>

            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden="true" />
                Location
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {tutor.city}, {tutor.subcity}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted-foreground">
                {isStudent ? "Studying" : "Field"}
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {affiliation || formatEnum(tutor.tutorStatus)}
              </dd>
            </div>
          </dl>

          <Button
            render={<Link href="/tutor/profile" />}
            variant="outline"
            size="xl"
            className="mt-6 w-full"
          >
            View my profile
          </Button>
        </section>
      </div>
    </div>
  );
}
