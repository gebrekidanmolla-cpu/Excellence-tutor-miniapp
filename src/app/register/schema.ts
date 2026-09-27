import { z } from "zod";

/* =========================================================
   FILE CONSTRAINTS

   These mirror `src/lib/upload-document.ts`, which enforces
   the same limits server-side. Changing one without the
   other lets a file pass here and fail at upload.
========================================================= */

export const DOCUMENT_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
export const CV_MAX_SIZE = 3 * 1024 * 1024; // 3 MB

/**
 * Every document travels in one request, and Vercel rejects function
 * request bodies over 4.5 MB before the route ever runs. 4 MB of files
 * leaves room for the text fields and multipart overhead. Per-file limits
 * alone can't guarantee this — four 2 MB documents plus a CV would pass
 * each check individually.
 */
export const TOTAL_UPLOAD_MAX_SIZE = 4 * 1024 * 1024; // 4 MB

export const DOCUMENT_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const CV_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

export const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ALLOWED_CV_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export type FileField =
  | "transcript"
  | "entranceResult"
  | "governmentId"
  | "graduationDocument"
  | "cv";

export type FileState = Record<FileField, File | null>;

export const EMPTY_FILES: FileState = {
  transcript: null,
  entranceResult: null,
  governmentId: null,
  graduationDocument: null,
  cv: null,
};

/**
 * Files stay outside the Zod schema: `File` does not exist while the client
 * component is server-rendered, and `z.instanceof(File)` at module scope would
 * evaluate there. The rules are identical to the previous inline version.
 */
export function validateFile(
  file: File | null,
  options: {
    required?: boolean;
    maxSize: number;
    allowedTypes: string[];
    typeLabel: string;
  }
): string {
  const { required = false, maxSize, allowedTypes, typeLabel } = options;

  if (!file) {
    return required ? "This document is required." : "";
  }

  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Please upload ${typeLabel}.`;
  }

  if (file.size > maxSize) {
    return `File must be ${maxSize / (1024 * 1024)}MB or smaller.`;
  }

  return "";
}

export function validateDocument(
  field: FileField,
  file: File | null,
  tutorStatus: string
): string {
  const isCv = field === "cv";

  const required =
    field === "transcript" ||
    field === "entranceResult" ||
    field === "governmentId" ||
    (field === "graduationDocument" && tutorStatus === "GRADUATE");

  return validateFile(file, {
    required,
    maxSize: isCv ? CV_MAX_SIZE : DOCUMENT_MAX_SIZE,
    allowedTypes: isCv ? ALLOWED_CV_TYPES : ALLOWED_DOCUMENT_TYPES,
    typeLabel: isCv
      ? "an image or PDF file"
      : "a JPG, JPEG, PNG, or WEBP image",
  });
}

/** The files that will actually be sent for this tutor status. */
export function filesToSend(
  files: FileState,
  tutorStatus: string
): [FileField, File][] {
  return (Object.keys(files) as FileField[]).flatMap((field) => {
    const file = files[field];

    if (!file) {
      return [];
    }

    if (field === "graduationDocument" && tutorStatus !== "GRADUATE") {
      return [];
    }

    return [[field, file]];
  });
}

export function validateTotalUploadSize(
  files: FileState,
  tutorStatus: string
): string {
  const total = filesToSend(files, tutorStatus).reduce(
    (sum, [, file]) => sum + file.size,
    0
  );

  if (total <= TOTAL_UPLOAD_MAX_SIZE) {
    return "";
  }

  const totalMb = (total / (1024 * 1024)).toFixed(1);

  return `Your documents add up to ${totalMb}MB, but the limit is ${
    TOTAL_UPLOAD_MAX_SIZE / (1024 * 1024)
  }MB in total. Please upload smaller files (for example, a compressed CV or clearer cropped photos).`;
}

/* =========================================================
   OPTIONS
========================================================= */

export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

export const TUTOR_STATUS_OPTIONS = [
  { value: "STUDENT", label: "Student" },
  { value: "GRADUATE", label: "Graduate" },
];

export const CURRENT_YEAR_OPTIONS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
  { value: "5", label: "5th Year or above" },
];

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "UNEMPLOYED", label: "Unemployed" },
  { value: "OTHER", label: "Other" },
];

export const ENTRANCE_TOTAL_OPTIONS = [
  { value: "600", label: "600" },
  { value: "700", label: "700" },
];

/* =========================================================
   SCHEMA

   Numeric fields stay strings: they are submitted as strings
   in the multipart body, and the API parses them.
========================================================= */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ETHIOPIAN_PHONE_PATTERN = /^[79]\d{8}$/;

function gpaIssue(value: string): boolean {
  const parsed = Number(value);

  return !Number.isFinite(parsed) || parsed < 0 || parsed > 4;
}

export const registerSchema = z
  .object({
    /* Account */
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name."),
    email: z
      .string()
      .trim()
      .min(1, "Please enter your email address.")
      .regex(EMAIL_PATTERN, "Please enter a valid email address."),
    phone: z
      .string()
      .regex(
        ETHIOPIAN_PHONE_PATTERN,
        "Please enter a valid Ethiopian mobile number."
      ),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters."),
    confirmPassword: z.string(),

    /* Personal */
    gender: z.enum(["MALE", "FEMALE"], {
      message: "Please select your gender.",
    }),
    city: z.string().trim().min(1, "Please enter your city."),
    subcity: z.string().trim().min(1, "Please enter your subcity."),
    exactPlace: z.string().trim().min(1, "Please enter your exact place."),
    aboutMe: z
      .string()
      .max(500, "About Me must be 500 characters or fewer."),
    tutorStatus: z.enum(["STUDENT", "GRADUATE"], {
      message: "Please select your current status.",
    }),

    /* Student */
    university: z.string(),
    department: z.string(),
    currentYear: z.string(),
    currentGPA: z.string(),

    /* Graduate */
    fieldOfGraduation: z.string(),
    universityGraduatedFrom: z.string(),
    CGPA: z.string(),
    employmentStatus: z.string(),
    currentJob: z.string(),

    /* Entrance */
    entranceScore: z
      .string()
      .trim()
      .min(1, "Please enter your entrance score."),
    entranceTotal: z.enum(["600", "700"], {
      message: "Entrance total must be either 600 or 700.",
    }),

    /* Confirmation */
    confirmation: z.literal(true, {
      message:
        "Please confirm that the information you provided is accurate.",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    if (values.tutorStatus === "STUDENT") {
      if (!values.university.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["university"],
          message: "Please enter your university or college.",
        });
      }

      if (!values.department.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["department"],
          message: "Please enter your department.",
        });
      }

      if (!values.currentYear) {
        ctx.addIssue({
          code: "custom",
          path: ["currentYear"],
          message: "Please select your current year.",
        });
      }

      if (gpaIssue(values.currentGPA)) {
        ctx.addIssue({
          code: "custom",
          path: ["currentGPA"],
          message: "Current GPA must be between 0 and 4.",
        });
      }
    }

    if (values.tutorStatus === "GRADUATE") {
      if (!values.fieldOfGraduation.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["fieldOfGraduation"],
          message: "Please enter your field of graduation.",
        });
      }

      if (!values.universityGraduatedFrom.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["universityGraduatedFrom"],
          message: "Please enter your university.",
        });
      }

      if (gpaIssue(values.CGPA)) {
        ctx.addIssue({
          code: "custom",
          path: ["CGPA"],
          message: "CGPA must be between 0 and 4.",
        });
      }

      if (
        !["EMPLOYED", "SELF_EMPLOYED", "UNEMPLOYED", "OTHER"].includes(
          values.employmentStatus
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["employmentStatus"],
          message: "Please select your employment status.",
        });
      }

      if (
        (values.employmentStatus === "EMPLOYED" ||
          values.employmentStatus === "SELF_EMPLOYED") &&
        !values.currentJob.trim()
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["currentJob"],
          message: "Please enter your current job.",
        });
      }
    }

    const score = Number(values.entranceScore);
    const total = Number(values.entranceTotal);

    if (!Number.isFinite(score)) {
      ctx.addIssue({
        code: "custom",
        path: ["entranceScore"],
        message: "Please enter a valid entrance score.",
      });
    } else if (score < 0 || score > total) {
      ctx.addIssue({
        code: "custom",
        path: ["entranceScore"],
        message:
          "Entrance score must be between 0 and the selected total.",
      });
    }
  });

export type RegisterValues = z.input<typeof registerSchema>;

export const DEFAULT_VALUES: RegisterValues = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  gender: "" as RegisterValues["gender"],
  city: "Addis Ababa",
  subcity: "",
  exactPlace: "",
  aboutMe: "",
  tutorStatus: "" as RegisterValues["tutorStatus"],
  university: "",
  department: "",
  currentYear: "",
  currentGPA: "",
  fieldOfGraduation: "",
  universityGraduatedFrom: "",
  CGPA: "",
  employmentStatus: "",
  currentJob: "",
  entranceScore: "",
  entranceTotal: "600",
  confirmation: false as RegisterValues["confirmation"],
};

/* =========================================================
   STEPS
========================================================= */

export const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Personal" },
  { id: 3, label: "Education" },
  { id: 4, label: "Entrance & Documents" },
  { id: 5, label: "Confirmation" },
] as const;

export type Step = 1 | 2 | 3 | 4 | 5;

/** Which fields each step validates, so `trigger()` stays scoped. */
export const STEP_FIELDS: Record<Step, (keyof RegisterValues)[]> = {
  1: ["fullName", "email", "phone", "password", "confirmPassword"],
  2: ["gender", "city", "subcity", "exactPlace", "tutorStatus", "aboutMe"],
  3: [
    "university",
    "department",
    "currentYear",
    "currentGPA",
    "fieldOfGraduation",
    "universityGraduatedFrom",
    "CGPA",
    "employmentStatus",
    "currentJob",
  ],
  4: ["entranceScore", "entranceTotal"],
  5: ["confirmation"],
};

/* =========================================================
   PHONE
========================================================= */

/**
 * The user types only the 9 digits after +251. Strips a leading country code
 * or trunk zero so a pasted `+251912345678` or `0912345678` still works.
 */
export function normalizeEthiopianPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("251")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 9);
}
