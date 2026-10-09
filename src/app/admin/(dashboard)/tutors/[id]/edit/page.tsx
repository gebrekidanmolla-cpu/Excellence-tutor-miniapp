import { notFound } from "next/navigation";
import { Info } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-context";
import { secondAddressOf } from "@/lib/address";
import { TUTOR_DOCUMENTS, adminDocumentHref } from "@/lib/admin-documents";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeading } from "@/components/shared/FormFields";
import TutorDocumentsEditor from "@/components/admin/TutorDocumentsEditor";
import TutorEditForm from "./TutorEditForm";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTutorPage({ params }: PageProps) {
  await requireAdmin();

  const { id } = await params;

  const tutor = await prisma.tutor.findUnique({
    where: {
      id,
    },
  });

  if (!tutor) {
    notFound();
  }

  const documentHrefs = Object.fromEntries(
    TUTOR_DOCUMENTS.flatMap(({ kind, column }) =>
      tutor[column]
        ? [[kind, adminDocumentHref(tutor.id, kind, tutor[column])]]
        : []
    )
  );

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
          Changes made here update the tutor&apos;s profile, including what
          parents see on a shared profile link. Tutors can change only their
          phone, address, About me, year or employment, photo and CV
          themselves — everything else, documents included, is changed here.
        </AlertDescription>
      </Alert>

      <section
        id="documents"
        className="scroll-mt-20 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
      >
        <SectionHeading
          title="Photo & documents"
          description="Each upload or removal is saved straight away, separately from Save changes below. Replacing a file deletes the old one."
        />

        <div className="mt-5">
          <TutorDocumentsEditor
            tutorId={tutor.id}
            tutorStatus={tutor.tutorStatus}
            hrefs={documentHrefs}
          />
        </div>
      </section>

      <TutorEditForm
        tutor={{
          id: tutor.id,
          fullName: tutor.fullName,
          gender: tutor.gender,
          email: tutor.email,
          phone: tutor.phone,
          address: {
            country: tutor.country,
            city: tutor.city,
            subcity: tutor.subcity,
            exactPlace: tutor.exactPlace,
          },
          secondAddress: secondAddressOf(tutor),
          aboutMe: tutor.aboutMe ?? "",
          tutorStatus: tutor.tutorStatus,
          hasGraduationDocument: Boolean(tutor.graduationDocumentUrl),
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
