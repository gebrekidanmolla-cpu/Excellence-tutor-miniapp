import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  GraduationCap,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentTutor } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatSalary } from "@/lib/format";

/** `ANY` reads as "Any Tutor" rather than the raw enum. */
function formatTutorRequirement(gender: "MALE" | "FEMALE" | "ANY"): string {
  if (gender === "MALE") return "Male Tutor";
  if (gender === "FEMALE") return "Female Tutor";
  return "Any Tutor";
}

export default async function MyApplicationsPage() {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const applications = await prisma.application.findMany({
    where: {
      tutorId: tutor.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: {
          jobCode: true,
          gender: true,
          grade: true,
          subject: true,
          place: true,
          salary: true,
          status: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My applications"
        description={
          applications.length === 0
            ? "Track the tutoring jobs you have applied for."
            : `${applications.length} ${
                applications.length === 1 ? "application" : "applications"
              } submitted`
        }
        actions={
          <Button render={<Link href="/jobs" />} size="xl">
            <BriefcaseBusiness data-icon="inline-start" aria-hidden="true" />
            Browse jobs
          </Button>
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No applications yet"
          description="You have not applied for any tutoring jobs yet. Browse available jobs and apply with one click."
          action={
            <Button render={<Link href="/jobs" />} size="xl">
              Browse available jobs
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {applications.map((application) => (
            <li
              key={application.id}
              className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-shadow hover:shadow-md has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium">
                      {application.job.jobCode}
                    </span>

                    <StatusBadge status={application.status} />

                    {application.job.status === "CLOSED" ? (
                      <span className="text-xs text-muted-foreground">
                        Job closed
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 font-heading text-lg font-semibold">
                    {application.job.subject}
                  </h2>

                  <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <Meta
                      icon={<GraduationCap />}
                      label="Grade"
                      value={application.job.grade}
                    />
                    <Meta
                      icon={<Users />}
                      label="Tutor"
                      value={formatTutorRequirement(application.job.gender)}
                    />
                    <Meta
                      icon={<MapPin />}
                      label="Place"
                      value={application.job.place}
                    />
                    <Meta
                      icon={<Wallet />}
                      label="Salary"
                      value={formatSalary(application.job.salary)}
                    />
                    <Meta
                      icon={<CalendarDays />}
                      label="Applied"
                      value={formatDate(application.createdAt)}
                    />
                  </dl>
                </div>

                <Button
                  render={
                    <Link href={`/tutor/applications/${application.id}`} />
                  }
                  variant="outline"
                  size="xl"
                  className="w-full shrink-0 lg:w-auto"
                >
                  View details
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden="true" className="[&>svg]:size-3.5">
        {icon}
      </span>
      <dt className="sr-only">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
