import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  deleteDocuments,
  uploadDocument,
} from "@/lib/upload-document";

// =====================================================
// FILE LIMITS
// =====================================================

const DOCUMENT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const CV_MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

// =====================================================
// ALLOWED FILE TYPES
// =====================================================

// Required documents:
// JPG, JPEG, PNG, WebP only
const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// CV:
// JPG, JPEG, PNG, WebP or PDF
const ALLOWED_CV_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

// =====================================================
// ENUMS
// =====================================================

const EMPLOYMENT_STATUSES = [
  "EMPLOYED",
  "SELF_EMPLOYED",
  "UNEMPLOYED",
  "OTHER",
] as const;

const TUTOR_STATUSES = [
  "STUDENT",
  "GRADUATE",
] as const;

const GENDERS = [
  "MALE",
  "FEMALE",
] as const;

type EmploymentStatus =
  (typeof EMPLOYMENT_STATUSES)[number];

type TutorStatus =
  (typeof TUTOR_STATUSES)[number];

type Gender =
  (typeof GENDERS)[number];

// =====================================================
// HELPERS
// =====================================================

function isValidFile(
  file: FormDataEntryValue | null,
  allowedTypes: string[],
  maxSize: number
): file is File {
  if (!(file instanceof File)) {
    return false;
  }

  if (file.size <= 0) {
    return false;
  }

  if (file.size > maxSize) {
    return false;
  }

  return allowedTypes.includes(file.type);
}

function calculateEntrancePercentage(
  score: number,
  total: number
): number {
  return Number(
    ((score / total) * 100).toFixed(2)
  );
}

function isValidEnum<
  T extends readonly string[]
>(
  value: string,
  values: T
): value is T[number] {
  return values.includes(value);
}

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase();
}

function normalizePhone(
  phone: string
): string {
  return phone.replace(
    /[\s-]/g,
    ""
  );
}

/**
 * Converts all supported Ethiopian phone formats
 * to one canonical format:
 *
 * +2519XXXXXXXX
 */
function canonicalizeEthiopianPhone(
  phone: string
): string | null {
  const normalized = normalizePhone(phone);

  // +2519XXXXXXXX
  if (/^\+2519\d{8}$/.test(normalized)) {
    return normalized;
  }

  // +2517XXXXXXXX
  if (/^\+2517\d{8}$/.test(normalized)) {
    return normalized;
  }

  // 2519XXXXXXXX
  if (/^2519\d{8}$/.test(normalized)) {
    return `+${normalized}`;
  }

  // 2517XXXXXXXX
  if (/^2517\d{8}$/.test(normalized)) {
    return `+${normalized}`;
  }

  // 09XXXXXXXX
  if (/^09\d{8}$/.test(normalized)) {
    return `+251${normalized.slice(1)}`;
  }

  // 07XXXXXXXX
  if (/^07\d{8}$/.test(normalized)) {
    return `+251${normalized.slice(1)}`;
  }

  // 9XXXXXXXX
  if (/^9\d{8}$/.test(normalized)) {
    return `+251${normalized}`;
  }

  // 7XXXXXXXX
  if (/^7\d{8}$/.test(normalized)) {
    return `+251${normalized}`;
  }

  return null;
}

// =====================================================
// POST
// =====================================================

export async function POST(
  request: Request
) {
  const uploadedPaths: string[] = [];

  try {
    const formData =
      await request.formData();

    // =====================================================
    // ACCOUNT INFORMATION
    // =====================================================

    const fullName = String(
      formData.get("fullName") ?? ""
    ).trim();

    const email = normalizeEmail(
      String(
        formData.get("email") ?? ""
      )
    );

    const phone = String(
      formData.get("phone") ?? ""
    ).trim();

    const password = String(
      formData.get("password") ?? ""
    );

    const confirmPassword =
      String(
        formData.get(
          "confirmPassword"
        ) ?? ""
      );

    // =====================================================
    // PERSONAL INFORMATION
    // =====================================================

    const genderValue = String(
      formData.get("gender") ?? ""
    );

    const city = String(
      formData.get("city") ?? ""
    ).trim();

    const subcity = String(
      formData.get("subcity") ?? ""
    ).trim();

    const exactPlace = String(
      formData.get("exactPlace") ?? ""
    ).trim();

    const aboutMe = String(
      formData.get("aboutMe") ?? ""
    ).trim();

    // =====================================================
    // TUTOR STATUS
    // =====================================================

    const tutorStatusValue =
      String(
        formData.get(
          "tutorStatus"
        ) ?? ""
      );

    // =====================================================
    // STUDENT INFORMATION
    // =====================================================

    const university = String(
      formData.get("university") ?? ""
    ).trim();

    const department = String(
      formData.get("department") ?? ""
    ).trim();

    const currentYear = String(
      formData.get("currentYear") ?? ""
    ).trim();

    const currentGPAValue =
      String(
        formData.get(
          "currentGPA"
        ) ?? ""
      ).trim();

    // =====================================================
    // GRADUATE INFORMATION
    // =====================================================

    const fieldOfGraduation =
      String(
        formData.get(
          "fieldOfGraduation"
        ) ?? ""
      ).trim();

    const universityGraduatedFrom =
      String(
        formData.get(
          "universityGraduatedFrom"
        ) ?? ""
      ).trim();

    const cgpaValue = String(
      formData.get("CGPA") ?? ""
    ).trim();

    const employmentStatusValue =
      String(
        formData.get(
          "employmentStatus"
        ) ?? ""
      ).trim();

    const currentJob = String(
      formData.get("currentJob") ?? ""
    ).trim();

    // =====================================================
    // ENTRANCE RESULT
    // =====================================================

    const entranceScoreValue =
      String(
        formData.get(
          "entranceScore"
        ) ?? ""
      ).trim();

    const entranceTotalValue =
      String(
        formData.get(
          "entranceTotal"
        ) ?? ""
      ).trim();

    // =====================================================
    // DOCUMENTS
    // =====================================================

    const transcript =
      formData.get("transcript");

    const entranceResult =
      formData.get("entranceResult");

    const graduationDocument =
      formData.get(
        "graduationDocument"
      );

    const governmentId =
      formData.get("governmentId");

    const cv =
      formData.get("cv");

    // =====================================================
    // BASIC ACCOUNT VALIDATION
    // =====================================================

    if (
      !fullName ||
      !email ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please complete all required account fields.",
        },
        { status: 400 }
      );
    }

    if (fullName.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter your full name.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // EMAIL FORMAT VALIDATION
    // =====================================================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // EMAIL VERIFICATION
    // =====================================================

    /**
     * The tutor must have successfully verified
     * ownership of this email before registration.
     *
     * The verification code itself is never stored
     * in plaintext. Only its hash is stored.
     */
    const verifiedEmail =
      await prisma.emailVerification.findFirst(
        {
          where: {
            email,
            verifiedAt: {
              not: null,
            },
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            verifiedAt: "desc",
          },
        }
      );

    if (!verifiedEmail) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please verify your email address before creating your account.",
        },
        { status: 403 }
      );
    }

    // =====================================================
    // PHONE VALIDATION
    // =====================================================

    const finalPhone =
      canonicalizeEthiopianPhone(
        phone
      );

    if (!finalPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid Ethiopian phone number.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // PASSWORD VALIDATION
    // =====================================================

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must contain at least 8 characters.",
        },
        { status: 400 }
      );
    }

    if (
      password !==
      confirmPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Passwords do not match.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // PERSONAL INFORMATION VALIDATION
    // =====================================================

    if (
      !genderValue ||
      !city ||
      !subcity ||
      !exactPlace
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please complete all required personal information.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidEnum(
        genderValue,
        GENDERS
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid gender.",
        },
        { status: 400 }
      );
    }

    if (aboutMe.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message:
            "About Me must be 500 characters or less.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // TUTOR STATUS VALIDATION
    // =====================================================

    if (
      !isValidEnum(
        tutorStatusValue,
        TUTOR_STATUSES
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select whether you are a student or graduate.",
        },
        { status: 400 }
      );
    }

    const tutorStatus: TutorStatus =
      tutorStatusValue;

    const gender: Gender =
      genderValue;

    // =====================================================
    // STUDENT INFORMATION
    // =====================================================

    let currentGPA:
      | number
      | null = null;

    if (
      tutorStatus ===
      "STUDENT"
    ) {
      if (
        !university ||
        !department ||
        !currentYear ||
        !currentGPAValue
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please complete all required student information.",
          },
          { status: 400 }
        );
      }

      currentGPA =
        Number(
          currentGPAValue
        );

      if (
        !Number.isFinite(
          currentGPA
        ) ||
        currentGPA < 0 ||
        currentGPA > 4
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Current GPA must be between 0 and 4.",
          },
          { status: 400 }
        );
      }
    }

    // =====================================================
    // GRADUATE INFORMATION
    // =====================================================

    let CGPA:
      | number
      | null = null;

    let employmentStatus:
      | EmploymentStatus
      | null = null;

    if (
      tutorStatus ===
      "GRADUATE"
    ) {
      if (
        !fieldOfGraduation ||
        !universityGraduatedFrom ||
        !cgpaValue ||
        !employmentStatusValue
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please complete all required graduate information.",
          },
          { status: 400 }
        );
      }

      CGPA =
        Number(cgpaValue);

      if (
        !Number.isFinite(CGPA) ||
        CGPA < 0 ||
        CGPA > 4
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "CGPA must be between 0 and 4.",
          },
          { status: 400 }
        );
      }

      if (
        !isValidEnum(
          employmentStatusValue,
          EMPLOYMENT_STATUSES
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid employment status.",
          },
          { status: 400 }
        );
      }

      employmentStatus =
        employmentStatusValue;

      // =====================================================
      // CURRENT JOB
      // =====================================================

      if (
        employmentStatus ===
          "EMPLOYED" ||
        employmentStatus ===
          "SELF_EMPLOYED"
      ) {
        if (!currentJob) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Please enter your current job.",
            },
            { status: 400 }
          );
        }
      }
    }

    // =====================================================
    // ENTRANCE EXAMINATION
    // =====================================================

    const entranceScore =
      Number(
        entranceScoreValue
      );

    const entranceTotal =
      Number(
        entranceTotalValue
      );

    if (
      !Number.isFinite(
        entranceScore
      ) ||
      !Number.isFinite(
        entranceTotal
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid entrance examination result.",
        },
        { status: 400 }
      );
    }

    if (
      entranceTotal !== 600 &&
      entranceTotal !== 700
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Entrance examination result must be out of 600 or 700.",
        },
        { status: 400 }
      );
    }

    if (
      entranceScore < 0 ||
      entranceScore >
        entranceTotal
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Entrance score must be between 0 and the maximum score.",
        },
        { status: 400 }
      );
    }

    const entrancePercentage =
      calculateEntrancePercentage(
        entranceScore,
        entranceTotal
      );

    // =====================================================
    // DOCUMENT VALIDATION
    // =====================================================

    // Transcript
    if (
      !isValidFile(
        transcript,
        ALLOWED_DOCUMENT_TYPES,
        DOCUMENT_MAX_FILE_SIZE
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid transcript is required. JPG, PNG, or WebP only, maximum 2 MB.",
        },
        { status: 400 }
      );
    }

    // Entrance result
    if (
      !isValidFile(
        entranceResult,
        ALLOWED_DOCUMENT_TYPES,
        DOCUMENT_MAX_FILE_SIZE
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid entrance result is required. JPG, PNG, or WebP only, maximum 2 MB.",
        },
        { status: 400 }
      );
    }

    // Government ID
    if (
      !isValidFile(
        governmentId,
        ALLOWED_DOCUMENT_TYPES,
        DOCUMENT_MAX_FILE_SIZE
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid government ID is required. JPG, PNG, or WebP only, maximum 2 MB.",
        },
        { status: 400 }
      );
    }

    // Graduation document
    if (
      tutorStatus ===
        "GRADUATE" &&
      !isValidFile(
        graduationDocument,
        ALLOWED_DOCUMENT_TYPES,
        DOCUMENT_MAX_FILE_SIZE
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Graduates must upload their temporary or original graduation document. JPG, PNG, or WebP only, maximum 2 MB.",
        },
        { status: 400 }
      );
    }

    // CV
    if (
      cv &&
      !isValidFile(
        cv,
        ALLOWED_CV_TYPES,
        CV_MAX_FILE_SIZE
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid CV. JPG, PNG, WebP, or PDF only, maximum 3 MB.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // DUPLICATE ACCOUNT CHECK
    // =====================================================

    const existingTutor =
      await prisma.tutor.findFirst({
        where: {
          OR: [
            {
              email,
            },
            {
              phone:
                finalPhone,
            },
          ],
        },
        select: {
          id: true,
          email: true,
          phone: true,
        },
      });

    if (existingTutor) {
      if (
        existingTutor.email ===
        email
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "An account with this email already exists.",
          },
          { status: 409 }
        );
      }

      if (
        existingTutor.phone ===
        finalPhone
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "An account with this phone number already exists.",
          },
          { status: 409 }
        );
      }
    }

    // =====================================================
    // PASSWORD HASH
    // =====================================================

    const passwordHash =
      await hashPassword(
        password
      );

    // =====================================================
    // TEMPORARY UNIQUE FOLDER
    // =====================================================

    const registrationFolder =
      `registrations/${crypto.randomUUID()}`;

    // =====================================================
    // UPLOAD TRANSCRIPT
    // =====================================================

    const transcriptPath =
      await uploadDocument(
        transcript,
        registrationFolder,
        `transcript-${crypto.randomUUID()}`
      );

    uploadedPaths.push(
      transcriptPath
    );

    // =====================================================
    // UPLOAD ENTRANCE RESULT
    // =====================================================

    const entranceResultPath =
      await uploadDocument(
        entranceResult,
        registrationFolder,
        `entrance-result-${crypto.randomUUID()}`
      );

    uploadedPaths.push(
      entranceResultPath
    );

    // =====================================================
    // UPLOAD GOVERNMENT ID
    // =====================================================

    const governmentIdPath =
      await uploadDocument(
        governmentId,
        registrationFolder,
        `government-id-${crypto.randomUUID()}`
      );

    uploadedPaths.push(
      governmentIdPath
    );

    // =====================================================
    // UPLOAD GRADUATION DOCUMENT
    // =====================================================

    let graduationDocumentPath:
      | string
      | null = null;

    if (
      tutorStatus ===
        "GRADUATE" &&
      graduationDocument instanceof
        File
    ) {
      graduationDocumentPath =
        await uploadDocument(
          graduationDocument,
          registrationFolder,
          `graduation-document-${crypto.randomUUID()}`
        );

      uploadedPaths.push(
        graduationDocumentPath
      );
    }

    // =====================================================
    // UPLOAD CV
    // =====================================================

    let cvPath:
      | string
      | null = null;

    if (
      cv instanceof File
    ) {
      cvPath =
        await uploadDocument(
          cv,
          registrationFolder,
          `cv-${crypto.randomUUID()}`,
          "cv"
        );

      uploadedPaths.push(
        cvPath
      );
    }

    // =====================================================
    // CREATE TUTOR
    // =====================================================

    const tutor =
      await prisma.tutor.create({
        data: {
          // -------------------------------------------------
          // ACCOUNT
          // -------------------------------------------------

          fullName,
          email,

          // Email ownership has already been verified.
          emailVerified: true,
          emailVerifiedAt:
            verifiedEmail.verifiedAt,

          phone:
            finalPhone,

          passwordHash,

          // -------------------------------------------------
          // PERSONAL
          // -------------------------------------------------

          gender,
          city,
          subcity,
          exactPlace,

          aboutMe:
            aboutMe || null,

          // -------------------------------------------------
          // STATUS
          // -------------------------------------------------

          tutorStatus,

          // -------------------------------------------------
          // STUDENT
          // -------------------------------------------------

          university:
            tutorStatus ===
            "STUDENT"
              ? university
              : null,

          department:
            tutorStatus ===
            "STUDENT"
              ? department
              : null,

          currentYear:
            tutorStatus ===
            "STUDENT"
              ? currentYear
              : null,

          currentGPA,

          // -------------------------------------------------
          // GRADUATE
          // -------------------------------------------------

          fieldOfGraduation:
            tutorStatus ===
            "GRADUATE"
              ? fieldOfGraduation
              : null,

          universityGraduatedFrom:
            tutorStatus ===
            "GRADUATE"
              ? universityGraduatedFrom
              : null,

          CGPA,

          employmentStatus,

          currentJob:
            tutorStatus ===
            "GRADUATE" &&
            (
              employmentStatus ===
                "EMPLOYED" ||
              employmentStatus ===
                "SELF_EMPLOYED"
            )
              ? currentJob
              : null,

          // -------------------------------------------------
          // ENTRANCE
          // -------------------------------------------------

          entranceScore,
          entranceTotal,
          entrancePercentage,

          // -------------------------------------------------
          // DOCUMENTS
          // -------------------------------------------------

          transcriptUrl:
            transcriptPath,

          entranceResultUrl:
            entranceResultPath,

          graduationDocumentUrl:
            graduationDocumentPath,

          governmentIdUrl:
            governmentIdPath,

          cvUrl:
            cvPath,
        },

        select: {
          id: true,
          fullName: true,
          email: true,
        },
      });

    // =====================================================
    // DELETE USED EMAIL VERIFICATION
    // =====================================================

    await prisma.emailVerification.delete({
      where: {
        id: verifiedEmail.id,
      },
    });

    // =====================================================
    // SUCCESS
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message:
          "Your tutor account has been created successfully.",
        tutor: {
          id: tutor.id,
          fullName:
            tutor.fullName,
          email:
            tutor.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Registration API error:",
      error
    );

    // =====================================================
    // CLEANUP UPLOADED FILES
    // =====================================================

    await deleteDocuments(
      uploadedPaths
    );

    // =====================================================
    // PRISMA UNIQUE CONSTRAINT
    // =====================================================

    if (
      error &&
      typeof error ===
        "object" &&
      "code" in error &&
      error.code ===
        "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An account with this email or phone number already exists.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // GENERIC ERROR
    // =====================================================

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while creating your account. Please try again.",
      },
      { status: 500 }
    );
  }
}