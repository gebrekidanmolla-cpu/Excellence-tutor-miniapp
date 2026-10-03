// The row shapes the admin lists render, and the Prisma selects that load
// them. Server-only (it reads the clock and share tokens); client components
// import the types alone, with `import type`.
//
// Each list page makes one Prisma call and hands every row to the client,
// which searches, filters and sorts without going back to the server. The
// sets are small (hundreds of rows), so that is cheaper on the Hobby CPU
// budget than a function invocation per keystroke or filter tap.

import type { Prisma } from "@prisma/client";

import {
  TUTOR_DOCUMENT_SELECT,
  availableDocuments,
  type TutorDocumentKind,
} from "@/lib/admin-documents";
import type {
  ApplicationStatus,
  JobStatus,
  SheetSyncStatus,
  TelegramPostStatus,
} from "@/lib/format";
import { liveShareToken } from "@/lib/tutor-profile-server";

type TutorStatus = "STUDENT" | "GRADUATE";

type Gender = "ANY" | "MALE" | "FEMALE";

// ==========================================
// TUTOR SUMMARY — the tutor half of an application row
// ==========================================

export const TUTOR_SUMMARY_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  gender: true,
  tutorStatus: true,
  university: true,
  department: true,
  universityGraduatedFrom: true,
  fieldOfGraduation: true,
  currentGPA: true,
  CGPA: true,
  entranceScore: true,
  entranceTotal: true,
  entrancePercentage: true,
  profileShareToken: true,
  profileShareExpiresAt: true,
  ...TUTOR_DOCUMENT_SELECT,
} satisfies Prisma.TutorSelect;

export type TutorSummary = {
  id: string;
  fullName: string;
  phone: string;
  gender: Gender;
  tutorStatus: TutorStatus;
  /** Where a student studies, or where a graduate graduated from. */
  institution: string | null;
  /** A student's department, or a graduate's field. */
  field: string | null;
  /** Current GPA for a student, CGPA for a graduate. */
  gpa: number | null;
  entranceScore: number;
  entranceTotal: number;
  entrancePercentage: number;
  documents: TutorDocumentKind[];
  /** The live parent-link token, or null when there is none to copy. */
  shareToken: string | null;
};

export function toTutorSummary(
  tutor: Prisma.TutorGetPayload<{ select: typeof TUTOR_SUMMARY_SELECT }>
): TutorSummary {
  const isStudent = tutor.tutorStatus === "STUDENT";

  return {
    id: tutor.id,
    fullName: tutor.fullName,
    phone: tutor.phone,
    gender: tutor.gender,
    tutorStatus: tutor.tutorStatus,
    institution: isStudent ? tutor.university : tutor.universityGraduatedFrom,
    field: isStudent ? tutor.department : tutor.fieldOfGraduation,
    gpa: isStudent ? tutor.currentGPA : tutor.CGPA,
    entranceScore: tutor.entranceScore,
    entranceTotal: tutor.entranceTotal,
    entrancePercentage: tutor.entrancePercentage,
    documents: availableDocuments(tutor),
    shareToken: liveShareToken(
      tutor.profileShareToken,
      tutor.profileShareExpiresAt
    ),
  };
}

// ==========================================
// APPLICATIONS
// ==========================================

export const APPLICATION_ROW_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  tutor: {
    select: TUTOR_SUMMARY_SELECT,
  },
  job: {
    select: {
      id: true,
      jobCode: true,
      subject: true,
      grade: true,
      salary: true,
      status: true,
      assignedTutorId: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

export type ApplicationRow = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  tutor: TutorSummary;
  job: {
    id: string;
    jobCode: string;
    subject: string;
    grade: string;
    salary: number;
    status: JobStatus;
    assignedTutorId: string | null;
  };
};

export function toApplicationRow(
  application: Prisma.ApplicationGetPayload<{
    select: typeof APPLICATION_ROW_SELECT;
  }>
): ApplicationRow {
  return {
    id: application.id,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
    tutor: toTutorSummary(application.tutor),
    job: application.job,
  };
}

// ==========================================
// JOBS
// ==========================================

export const JOB_ROW_SELECT = {
  id: true,
  jobCode: true,
  subject: true,
  grade: true,
  gender: true,
  place: true,
  salary: true,
  status: true,
  parentName: true,
  parentPhone: true,
  createdAt: true,
  telegramPostStatus: true,
  telegramMessageId: true,
  sheetSyncStatus: true,
  assignedTutor: {
    select: {
      id: true,
      fullName: true,
    },
  },
  // Only the status: enough to count the pool and its new arrivals.
  applications: {
    select: {
      status: true,
    },
  },
} satisfies Prisma.JobSelect;

export type JobRow = {
  id: string;
  jobCode: string;
  subject: string;
  grade: string;
  gender: Gender;
  place: string;
  salary: number;
  status: JobStatus;
  parentName: string;
  parentPhone: string;
  createdAt: string;
  telegramPostStatus: TelegramPostStatus;
  hasChannelPost: boolean;
  sheetSyncStatus: SheetSyncStatus;
  assignedTutor: { id: string; fullName: string } | null;
  applicationCount: number;
  pendingCount: number;
};

export function toJobRow(
  job: Prisma.JobGetPayload<{ select: typeof JOB_ROW_SELECT }>
): JobRow {
  return {
    id: job.id,
    jobCode: job.jobCode,
    subject: job.subject,
    grade: job.grade,
    gender: job.gender,
    place: job.place,
    salary: job.salary,
    status: job.status,
    parentName: job.parentName,
    parentPhone: job.parentPhone,
    createdAt: job.createdAt.toISOString(),
    telegramPostStatus: job.telegramPostStatus,
    hasChannelPost: job.telegramMessageId !== null,
    sheetSyncStatus: job.sheetSyncStatus,
    assignedTutor: job.assignedTutor,
    applicationCount: job.applications.length,
    pendingCount: job.applications.filter(
      (application) => application.status === "PENDING"
    ).length,
  };
}

// ==========================================
// TUTORS
// ==========================================

export const TUTOR_ROW_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  tutorStatus: true,
  university: true,
  department: true,
  universityGraduatedFrom: true,
  fieldOfGraduation: true,
  currentGPA: true,
  CGPA: true,
  entrancePercentage: true,
  city: true,
  subcity: true,
  createdAt: true,
  profileShareToken: true,
  profileShareExpiresAt: true,
  ...TUTOR_DOCUMENT_SELECT,
  _count: {
    select: {
      applications: true,
      assignedJobs: true,
    },
  },
} satisfies Prisma.TutorSelect;

export type TutorRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  tutorStatus: TutorStatus;
  institution: string | null;
  field: string | null;
  gpa: number | null;
  entrancePercentage: number;
  location: string;
  createdAt: string;
  applicationCount: number;
  /** Jobs this tutor is currently assigned to. */
  assignedJobCount: number;
  documents: TutorDocumentKind[];
  shareToken: string | null;
};

export function toTutorRow(
  tutor: Prisma.TutorGetPayload<{ select: typeof TUTOR_ROW_SELECT }>
): TutorRow {
  const isStudent = tutor.tutorStatus === "STUDENT";

  return {
    id: tutor.id,
    fullName: tutor.fullName,
    email: tutor.email,
    phone: tutor.phone,
    tutorStatus: tutor.tutorStatus,
    institution: isStudent ? tutor.university : tutor.universityGraduatedFrom,
    field: isStudent ? tutor.department : tutor.fieldOfGraduation,
    gpa: isStudent ? tutor.currentGPA : tutor.CGPA,
    entrancePercentage: tutor.entrancePercentage,
    location: [tutor.subcity, tutor.city].filter(Boolean).join(", "),
    createdAt: tutor.createdAt.toISOString(),
    applicationCount: tutor._count.applications,
    assignedJobCount: tutor._count.assignedJobs,
    documents: availableDocuments(tutor),
    shareToken: liveShareToken(
      tutor.profileShareToken,
      tutor.profileShareExpiresAt
    ),
  };
}
