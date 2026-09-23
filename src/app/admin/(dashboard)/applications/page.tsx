import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { redirect } from "next/navigation";
import ApplicationsTable from "./ApplicationsTable";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function ApplicationsPage() {
  // =====================================================
  // ADMIN PROTECTION
  // =====================================================

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  // =====================================================
  // FETCH APPLICATIONS
  // =====================================================

  const applications = await prisma.application.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      tutor: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          gender: true,

          university: true,
          department: true,

          currentGPA: true,
          CGPA: true,

          tutorStatus: true,

          entranceScore: true,
          entranceTotal: true,
          entrancePercentage: true,

          createdAt: true,
        },
      },

      job: {
        select: {
          id: true,
          jobCode: true,
          grade: true,
          subject: true,
          salary: true,
          status: true,
          assignedTutorId: true,
        },
      },
    },
  });

  // =====================================================
  // SERIALIZE DATA FOR CLIENT COMPONENT
  // =====================================================

  const serializedApplications = applications.map(
    (application) => ({
      // IMPORTANT:
      // Keep the application ID here.
      id: application.id,

      status: application.status,

      createdAt: application.createdAt.toISOString(),

      tutor: {
        id: application.tutor.id,
        fullName: application.tutor.fullName,
        phone: application.tutor.phone,
        gender: application.tutor.gender,

        university: application.tutor.university,
        department: application.tutor.department,

        currentGPA: application.tutor.currentGPA,
        CGPA: application.tutor.CGPA,

        tutorStatus: application.tutor.tutorStatus,

        entranceScore: application.tutor.entranceScore,
        entranceTotal: application.tutor.entranceTotal,
        entrancePercentage:
          application.tutor.entrancePercentage,

        createdAt:
          application.tutor.createdAt.toISOString(),
      },

      job: {
        id: application.job.id,
        jobCode: application.job.jobCode,
        grade: application.job.grade,
        subject: application.job.subject,
        salary: application.job.salary,
        status: application.job.status,
        assignedTutorId:
          application.job.assignedTutorId,
      },
    })
  );

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Review tutor applications and manually assign the best candidate to each job."
      />

      <ApplicationsTable applications={serializedApplications} />
    </div>
  );
}
