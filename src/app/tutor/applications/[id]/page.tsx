import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
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
import {
  formatDate,
  formatEnum,
  formatSalary,
  getApplicationStatusDescription,
  getApplicationStatusLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

/** `ANY` reads as "Any Tutor" rather than the raw enum. */
function formatTutorRequirement(gender: "MALE" | "FEMALE" | "ANY"): string {
  if (gender === "MALE") return "Male Tutor";
  if (gender === "FEMALE") return "Female Tutor";
  return "Any Tutor";
}

const STATUS_DOT: Record<string, string> = {
  ACCEPTED: "bg-success",
  REJECTED: "bg-destructive",
  REVIEWED: "bg-info",
  PENDING: "bg-warning",
};

export default async function ApplicationDetailsPage({ params }: PageProps) {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  const { id } = await params;

  /*
   * IMPORTANT:
   * We query by BOTH application ID and tutor ID.
   *
   * This prevents one tutor from viewing another tutor's
   * application simply by changing the URL.
   */
  const application = await prisma.application.findFirst({
    where: {
      id,
      tutorId: tutor.id,
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
          createdAt: true,
        },
      },
    },
  });

  if (!application) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backHref="/tutor/applications"
        backLabel="Back to my applications"
        title={application.job.subject}
        description={
          <>
            Job code{" "}
            <span className="font-medium text-foreground">
              {application.job.jobCode}
            </span>
          </>
        }
        actions={<StatusBadge status={application.status} size="lg" />}
      />

      {/* -----------------------------------------------------
          STATUS
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="font-heading font-medium">Application status</h2>

        <div className="mt-4 flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1.5 size-2.5 shrink-0 rounded-full",
              STATUS_DOT[application.status] ?? "bg-muted-foreground"
            )}
          />

          <div>
            <p className="font-medium">
              {getApplicationStatusLabel(application.status)}
            </p>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {getApplicationStatusDescription(application.status)}
            </p>
          </div>
        </div>

        <Separator className="my-5" />

        <p className="text-sm text-muted-foreground">
          Applied on {formatDate(application.createdAt)}
        </p>
      </section>

      {/* -----------------------------------------------------
          JOB
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading font-medium">Job information</h2>
          <StatusBadge status={application.job.status} />
        </div>

        <InfoGrid className="mt-5">
          <InfoItem
            label="Job code"
            value={application.job.jobCode}
            icon={<BookOpen />}
          />
          <InfoItem
            label="Tutor requirement"
            value={formatTutorRequirement(application.job.gender)}
            icon={<Users />}
          />
          <InfoItem
            label="Grade"
            value={application.job.grade}
            icon={<GraduationCap />}
          />
          <InfoItem
            label="Subject"
            value={application.job.subject}
            icon={<BookOpen />}
          />
          <InfoItem
            label="Place"
            value={application.job.place}
            icon={<MapPin />}
          />
          <InfoItem
            label="Salary"
            value={formatSalary(application.job.salary)}
            icon={<Wallet />}
          />
          <InfoItem
            label="Applied"
            value={formatDate(application.createdAt)}
            icon={<CalendarDays />}
          />
        </InfoGrid>
      </section>

      {/* -----------------------------------------------------
          APPLICANT
      ----------------------------------------------------- */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading font-medium">Applicant profile</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              The tutor profile associated with this application.
            </p>
          </div>

          <Button
            render={<Link href="/tutor/profile" />}
            variant="outline"
            size="lg"
            className="shrink-0"
          >
            View profile
          </Button>
        </div>

        <InfoGrid className="mt-5">
          <InfoItem
            label="Full name"
            value={tutor.fullName}
            icon={<UserRound />}
          />
          <InfoItem label="Email" value={tutor.email} icon={<Mail />} />
          <InfoItem
            label="Phone"
            value={`+251 ${tutor.phone}`}
            icon={<Phone />}
          />
          <InfoItem label="Gender" value={formatEnum(tutor.gender)} />
          <InfoItem label="Status" value={formatEnum(tutor.tutorStatus)} />
          <InfoItem
            label="Location"
            value={`${tutor.city}, ${tutor.subcity}`}
            icon={<MapPin />}
          />
        </InfoGrid>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          render={<Link href="/tutor/applications" />}
          variant="outline"
          size="xl"
        >
          My applications
        </Button>

        <Button render={<Link href="/jobs" />} size="xl">
          <BriefcaseBusiness data-icon="inline-start" aria-hidden="true" />
          Browse available jobs
        </Button>
      </div>
    </div>
  );
}
