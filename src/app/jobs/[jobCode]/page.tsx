import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
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

  const existingApplication =
    job.applications[0] ?? null;

  const isOpen = job.status === "OPEN";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <div className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
        {/* Back */}

        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to Available Jobs
        </Link>

        {/* Main Card */}

        <div className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {/* Header */}

          <div className="border-b border-gray-200 p-7 sm:p-10">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                    <BookOpen size={24} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                      Job Code
                    </p>

                    <h1 className="text-2xl font-bold tracking-tight">
                      {job.jobCode}
                    </h1>
                  </div>
                </div>

                <p className="mt-6 text-3xl font-bold tracking-tight">
                  {job.grade}
                </p>

                <p className="mt-2 text-lg text-gray-500">
                  {job.subject}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                  isOpen
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {isOpen ? "Applications Open" : "Closed"}
              </span>
            </div>
          </div>

          {/* Details */}

          <div className="grid gap-4 p-7 sm:grid-cols-2 sm:p-10">
            <InfoCard
              icon={<GraduationCap size={20} />}
              label="Grade"
              value={job.grade}
            />

            <InfoCard
              icon={<BookOpen size={20} />}
              label="Subject"
              value={job.subject}
            />

            <InfoCard
              icon={<MapPin size={20} />}
              label="Place"
              value={job.place}
            />

            <InfoCard
              icon={<Users size={20} />}
              label="Tutor Requirement"
              value={formatGender(job.gender)}
            />

            <InfoCard
              icon={<Wallet size={20} />}
              label="Monthly Salary"
              value={`${job.salary.toLocaleString()} ETB`}
            />

            <InfoCard
              icon={<CalendarDays size={20} />}
              label="Posted"
              value={formatDate(job.createdAt)}
            />
          </div>

          {/* Application Area */}

          <div className="border-t border-gray-200 bg-gray-50 p-7 sm:p-10">
            {existingApplication ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                    <CheckCircle2 size={22} />
                  </div>

                  <div>
                    <h2 className="font-bold">
                      You already applied for this job
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Your application is currently{" "}
                      <span className="font-semibold text-gray-800">
                        {formatStatus(
                          existingApplication.status
                        )}
                      </span>
                      .
                    </p>

                    <Link
                      href="/tutor/applications"
                      className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4"
                    >
                      View My Applications
                    </Link>
                  </div>
                </div>
              </div>
            ) : isOpen ? (
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold">
                    Interested in this opportunity?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Submit your application using your tutor
                    profile and qualifications.
                  </p>
                </div>

                <Link
                  href={`/apply/${job.jobCode}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  Apply Now
                </Link>
              </div>
            ) : (
              <div>
                <h2 className="font-bold">
                  Applications are closed
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  This tutoring opportunity is no longer
                  accepting applications.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-500">
          {icon}
        </div>

        <div>
          <p className="text-xs text-gray-400">
            {label}
          </p>

          <p className="mt-1 text-sm font-semibold">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatGender(
  gender: "MALE" | "FEMALE" | "ANY"
) {
  if (gender === "MALE") return "Male Tutor";
  if (gender === "FEMALE") return "Female Tutor";
  return "Any Tutor";
}

function formatStatus(
  status:
    | "PENDING"
    | "REVIEWED"
    | "ACCEPTED"
    | "REJECTED"
) {
  switch (status) {
    case "PENDING":
      return "Pending Review";
    case "REVIEWED":
      return "Reviewed";
    case "ACCEPTED":
      return "Accepted";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}