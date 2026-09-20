import { notFound } from "next/navigation";
import { Info } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import TutorEditForm from "./TutorEditForm";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTutorPage({ params }: PageProps) {
  const { id } = await params;

  const tutor = await prisma.tutor.findUnique({
    where: {
      id,
    },
  });

  if (!tutor) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backHref={`/admin/tutors/${tutor.id}`}
        backLabel="Back to tutor"
        title="Edit tutor"
        description={tutor.fullName}
      />

      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle>Admin-only tutor management</AlertTitle>
        <AlertDescription>
          Changes made here update the tutor&apos;s registered profile. Tutors
          cannot edit their information from their account.
        </AlertDescription>
      </Alert>

      <TutorEditForm
        tutor={{
          id: tutor.id,
          fullName: tutor.fullName,
          gender: tutor.gender,
          email: tutor.email,
          phone: tutor.phone,
          city: tutor.city,
          subcity: tutor.subcity,
          exactPlace: tutor.exactPlace,
          aboutMe: tutor.aboutMe ?? "",
          tutorStatus: tutor.tutorStatus,
          university: tutor.university ?? "",
          department: tutor.department ?? "",
          currentYear: tutor.currentYear ?? "",
          currentGPA: tutor.currentGPA,
          fieldOfGraduation: tutor.fieldOfGraduation ?? "",
          universityGraduatedFrom: tutor.universityGraduatedFrom ?? "",
          CGPA: tutor.CGPA,
          employmentStatus: tutor.employmentStatus ?? "",
          currentJob: tutor.currentJob ?? "",
          entranceScore: tutor.entranceScore,
          entranceTotal: tutor.entranceTotal,
          entrancePercentage: tutor.entrancePercentage,
        }}
      />
    </div>
  );
}
