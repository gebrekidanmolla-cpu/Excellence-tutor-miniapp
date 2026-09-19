import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  MapPin,
  Save,
  User,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import TutorEditForm from "./TutorEditForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TutorEditPage({
  params,
}: PageProps) {
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/admin/tutors/${tutor.id}`}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft size={16} />
            Back to Tutor
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950 text-white">
              <User size={19} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-950">
                Edit Tutor
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Update {tutor.fullName}'s registered information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-sm font-semibold text-blue-900">
          Admin-only tutor management
        </p>

        <p className="mt-1 text-sm leading-6 text-blue-700">
          Changes made here update the tutor's registered profile.
          Tutors cannot edit their information from their account.
        </p>
      </div>

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
          universityGraduatedFrom:
            tutor.universityGraduatedFrom ?? "",
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
