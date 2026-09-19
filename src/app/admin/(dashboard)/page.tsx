import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [
    totalTutors,
    totalJobs,
    openJobs,
    closedJobs,
    totalApplications,
    pendingApplications,
    reviewedApplications,
    acceptedApplications,
    rejectedApplications,
  ] = await Promise.all([
    prisma.tutor.count(),

    prisma.job.count(),

    prisma.job.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.job.count({
      where: {
        status: "CLOSED",
      },
    }),

    prisma.application.count(),

    prisma.application.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.application.count({
      where: {
        status: "REVIEWED",
      },
    }),

    prisma.application.count({
      where: {
        status: "ACCEPTED",
      },
    }),

    prisma.application.count({
      where: {
        status: "REJECTED",
      },
    }),
  ]);

  const applicationProcessed =
    reviewedApplications +
    acceptedApplications +
    rejectedApplications;

  const acceptanceRate =
    totalApplications > 0
      ? Math.round(
          (acceptedApplications / totalApplications) * 100
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <section className="relative overflow-hidden rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gray-100" />

        <div className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-gray-50" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
              <LayoutDashboard size={14} />
              Administration
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
              Monitor tutor recruitment, applications, and
              active tutoring opportunities from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/jobs/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              <Plus size={17} />
              Create Job
            </Link>

            <Link
              href="/admin/tutors"
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Users size={17} />
              View Tutors
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          OVERVIEW STATISTICS
      ====================================================== */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Overview
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Key recruitment metrics at a glance.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Registered Tutors"
            value={totalTutors}
            description="Total tutor profiles"
            icon={Users}
          />

          <StatCard
            title="Total Jobs"
            value={totalJobs}
            description={`${openJobs} currently open`}
            icon={BriefcaseBusiness}
          />

          <StatCard
            title="Applications"
            value={totalApplications}
            description={`${pendingApplications} awaiting review`}
            icon={FileText}
          />

          <StatCard
            title="Accepted"
            value={acceptedApplications}
            description={`${acceptanceRate}% acceptance rate`}
            icon={CheckCircle2}
          />
        </div>
      </section>

      {/* =====================================================
          JOBS + APPLICATIONS
      ====================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">
        {/* Jobs */}
        <DashboardPanel
          title="Jobs"
          description="Current tutoring opportunity status"
          icon={BriefcaseBusiness}
          actionHref="/admin/jobs"
          actionLabel="Manage Jobs"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricItem
              label="Total"
              value={totalJobs}
              icon={BriefcaseBusiness}
            />

            <MetricItem
              label="Open"
              value={openJobs}
              icon={CheckCircle2}
            />

            <MetricItem
              label="Closed"
              value={closedJobs}
              icon={XCircle}
            />
          </div>

          <div className="mt-5 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Open job ratio
              </span>

              <span className="font-semibold text-gray-950">
                {totalJobs > 0
                  ? Math.round(
                      (openJobs / totalJobs) * 100
                    )
                  : 0}
                %
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-900 transition-all"
                style={{
                  width: `${
                    totalJobs > 0
                      ? (openJobs / totalJobs) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </DashboardPanel>

        {/* Applications */}
        <DashboardPanel
          title="Applications"
          description="Recruitment pipeline overview"
          icon={FileText}
          actionHref="/admin/applications"
          actionLabel="Review Applications"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricItem
              label="Pending"
              value={pendingApplications}
              icon={Clock3}
            />

            <MetricItem
              label="Reviewed"
              value={reviewedApplications}
              icon={Search}
            />

            <MetricItem
              label="Accepted"
              value={acceptedApplications}
              icon={CheckCircle2}
            />

            <MetricItem
              label="Rejected"
              value={rejectedApplications}
              icon={XCircle}
            />
          </div>

          <div className="mt-5 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Applications processed
              </span>

              <span className="font-semibold text-gray-950">
                {applicationProcessed} /{" "}
                {totalApplications}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-900 transition-all"
                style={{
                  width: `${
                    totalApplications > 0
                      ? (applicationProcessed /
                          totalApplications) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </DashboardPanel>
      </section>

      {/* =====================================================
          RECRUITMENT SUMMARY
      ====================================================== */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Recruitment Summary
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            A quick overview of your current recruitment pipeline.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Pending Applications"
            value={pendingApplications}
            description="Need administrative review"
            icon={Clock3}
            href="/admin/applications"
          />

          <SummaryCard
            title="Active Opportunities"
            value={openJobs}
            description="Jobs currently accepting applications"
            icon={BriefcaseBusiness}
            href="/admin/jobs"
          />

          <SummaryCard
            title="Registered Tutors"
            value={totalTutors}
            description="Tutor profiles available in the system"
            icon={GraduationCap}
            href="/admin/tutors"
          />
        </div>
      </section>

      {/* =====================================================
          QUICK ACTIONS
      ====================================================== */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Jump directly into common administrative tasks.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/admin/applications"
            title="Review Applications"
            description="Review tutor applications and update their status."
            icon={FileText}
          />

          <ActionCard
            href="/admin/jobs"
            title="Manage Jobs"
            description="Create, edit, open, or close tutoring opportunities."
            icon={BriefcaseBusiness}
          />

          <ActionCard
            href="/admin/tutors"
            title="Manage Tutors"
            description="View tutor profiles and manage registered tutor information."
            icon={Users}
          />
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="group rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-gray-50 text-gray-700 transition group-hover:bg-gray-100">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD PANEL
============================================================ */

function DashboardPanel({
  title,
  description,
  icon: Icon,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white">
            <Icon size={18} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-950">
              {title}
            </h3>

            <p className="mt-0.5 text-xs text-gray-500">
              {description}
            </p>
          </div>
        </div>

        <Link
          href={actionHref}
          className="text-xs font-semibold text-gray-500 transition hover:text-gray-950"
        >
          {actionLabel} →
        </Link>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}

/* ============================================================
   METRIC ITEM
============================================================ */

function MetricItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon size={15} />

        <span className="text-xs font-medium">
          {label}
        </span>
      </div>

      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-950">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition group-hover:bg-gray-100">
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-4 text-xs font-semibold text-gray-400 transition group-hover:text-gray-950">
        Open section →
      </div>
    </Link>
  );
}

/* ============================================================
   ACTION CARD
============================================================ */

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950 text-white transition group-hover:scale-105">
        <Icon size={20} />
      </div>

      <h3 className="mt-5 font-semibold text-gray-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <div className="mt-5 text-sm font-semibold text-gray-400 transition group-hover:text-gray-950">
        Open →
      </div>
    </Link>
  );
}