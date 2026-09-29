import { z } from "zod";

import { DEFAULT_CITY, DEFAULT_COUNTRY } from "@/lib/address";
import {
  TOTAL_UPLOAD_MAX_SIZE,
  documentRules,
  formatMegabytes,
} from "@/lib/document-rules";
import { ETHIOPIAN_LOCAL_PHONE_PATTERN } from "@/lib/phone";

/*
 * Shared by the wizard and `POST /api/auth/register`, which parses its
 * multipart body with this same schema — a rule changed here changes on both
 * sides. Keep this module free of browser-only and server-only APIs.
 */

/* =========================================================
   FILES

   Size and type rules live in `src/lib/document-rules.ts`,
   which the server enforces too.
========================================================= */

export {
  CV_ACCEPT,
  DOCUMENT_ACCEPT,
  TOTAL_UPLOAD_MAX_SIZE,
} from "@/lib/document-rules";

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

export const FILE_FIELDS = Object.keys(EMPTY_FILES) as FileField[];

export function isFileField(field: string): field is FileField {
  return (FILE_FIELDS as string[]).includes(field);
}

/** Display labels, shared by the form and the server's error messages. */
export const FILE_LABELS: Record<FileField, string> = {
  transcript: "Transcript",
  entranceResult: "Entrance result",
  governmentId: "Government ID",
  graduationDocument: "Graduation document",
  cv: "CV",
};

export function isDocumentRequired(
  field: FileField,
  tutorStatus: string
): boolean {
  if (field === "cv") {
    return false;
  }

  return field !== "graduationDocument" || tutorStatus === "GRADUATE";
}

/**
 * Files stay outside the Zod schema: `File` does not exist while the client
 * component is server-rendered, and `z.instanceof(File)` at module scope would
 * evaluate there.
 */
export function validateDocument(
  field: FileField,
  file: File | null,
  tutorStatus: string
): string {
  if (!file) {
    return isDocumentRequired(field, tutorStatus)
      ? "This document is required."
      : "";
  }

  const { maxSize, allowedTypes, typeLabel } = documentRules(
    field === "cv" ? "cv" : "document"
  );

  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Please upload ${typeLabel}.`;
  }

  if (file.size > maxSize) {
    return `File must be ${formatMegabytes(maxSize, 0)} or smaller.`;
  }

  return "";
}

/** The files that will actually be sent for this tutor status. */
export function filesToSend(
  files: FileState,
  tutorStatus: string
): [FileField, File][] {
  return FILE_FIELDS.flatMap((field) => {
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

export function totalUploadSize(files: FileState, tutorStatus: string): number {
  return filesToSend(files, tutorStatus).reduce(
    (sum, [, file]) => sum + file.size,
    0
  );
}

export function validateTotalUploadSize(
  files: FileState,
  tutorStatus: string
): string {
  const total = totalUploadSize(files, tutorStatus);

  if (total <= TOTAL_UPLOAD_MAX_SIZE) {
    return "";
  }

  return `Your documents add up to ${formatMegabytes(total)}, but the limit is ${formatMegabytes(
    TOTAL_UPLOAD_MAX_SIZE,
    0
  )} in total. Please upload smaller files (for example, a compressed CV or clearer cropped photos).`;
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

export const NAME_MAX_LENGTH = 100;
export const TEXT_MAX_LENGTH = 120;
export const ABOUT_ME_MAX_LENGTH = 500;

/** bcrypt ignores everything past 72 bytes, so a longer password is a lie. */
const PASSWORD_MAX_BYTES = 72;

function text(label: string) {
  return z
    .string()
    .trim()
    .max(TEXT_MAX_LENGTH, `${label} must be ${TEXT_MAX_LENGTH} characters or fewer.`);
}

function requiredText(label: string, message: string) {
  return text(label).min(1, message);
}

function gpaIssue(value: string): boolean {
  const parsed = Number(value);

  return value.trim() === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 4;
}

/** Shared with the password-reset form and route, so the rule lives once. */
export const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
    "Password must be 72 characters or fewer."
  );

export const registerSchema = z
  .object({
    /* Account */
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name.")
      .max(
        NAME_MAX_LENGTH,
        `Full name must be ${NAME_MAX_LENGTH} characters or fewer.`
      ),
    email: z
      .string()
      .trim()
      .min(1, "Please enter your email address.")
      .max(254, "Please enter a valid email address.")
      .regex(EMAIL_PATTERN, "Please enter a valid email address."),
    phone: z
      .string()
      .regex(
        ETHIOPIAN_LOCAL_PHONE_PATTERN,
        "Please enter a valid Ethiopian mobile number."
      ),
    password: passwordSchema,
    confirmPassword: z.string(),

    /* Personal */
    gender: z.enum(["MALE", "FEMALE"], {
      message: "Please select your gender.",
    }),
    country: requiredText("Country", "Please enter your country."),
    city: requiredText("City", "Please enter your city or region."),
    subcity: requiredText("Sub-city", "Please enter your sub-city or zone."),
    exactPlace: requiredText("Specific area", "Please enter your specific area."),

    /* Optional second address — only required when switched on. */
    hasSecondAddress: z.boolean(),
    address2Country: text("Country"),
    address2City: text("City"),
    address2Subcity: text("Sub-city"),
    address2ExactPlace: text("Specific area"),
    aboutMe: z
      .string()
      .trim()
      .max(
        ABOUT_ME_MAX_LENGTH,
        `About Me must be ${ABOUT_ME_MAX_LENGTH} characters or fewer.`
      ),
    tutorStatus: z.enum(["STUDENT", "GRADUATE"], {
      message: "Please select your current status.",
    }),

    /* Student */
    university: text("University"),
    department: text("Department"),
    currentYear: z.string(),
    currentGPA: z.string().trim(),

    /* Graduate */
    fieldOfGraduation: text("Field of graduation"),
    universityGraduatedFrom: text("University"),
    CGPA: z.string().trim(),
    employmentStatus: z.string(),
    currentJob: text("Current job"),

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

    if (values.hasSecondAddress) {
      const secondAddressFields = [
        ["address2Country", "Please enter the country."],
        ["address2City", "Please enter the city or region."],
        ["address2Subcity", "Please enter the sub-city or zone."],
        ["address2ExactPlace", "Please enter the specific area."],
      ] as const;

      for (const [field, message] of secondAddressFields) {
        if (!values[field].trim()) {
          ctx.addIssue({ code: "custom", path: [field], message });
        }
      }
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

      if (
        !CURRENT_YEAR_OPTIONS.some(
          (option) => option.value === values.currentYear
        )
      ) {
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
        !EMPLOYMENT_STATUS_OPTIONS.some(
          (option) => option.value === values.employmentStatus
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
    } else if (!Number.isInteger(score)) {
      /* The column is an Int: a decimal would be stored rounded while the
         percentage was computed from the unrounded value. */
      ctx.addIssue({
        code: "custom",
        path: ["entranceScore"],
        message: "Entrance score must be a whole number.",
      });
    } else if (score < 0 || score > total) {
      ctx.addIssue({
        code: "custom",
        path: ["entranceScore"],
        message:
          "Entrance score must be between 0 and the selected total.",
      });
    }
  }, {
    /* Zod 4 skips refinements while any field above is invalid, and the
       wizard validates one step at a time — the unchecked `confirmation`
       alone would keep these conditional rules from ever running before
       the last step. Every field has a string default, so running on
       partially invalid values is safe. */
    when: () => true,
  });

export type RegisterValues = z.input<typeof registerSchema>;
export type ParsedRegisterValues = z.output<typeof registerSchema>;

export const DEFAULT_VALUES: RegisterValues = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  gender: "" as RegisterValues["gender"],
  country: DEFAULT_COUNTRY,
  city: DEFAULT_CITY,
  subcity: "",
  exactPlace: "",
  hasSecondAddress: false,
  address2Country: DEFAULT_COUNTRY,
  address2City: DEFAULT_CITY,
  address2Subcity: "",
  address2ExactPlace: "",
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
  { id: 1, label: "Account", description: "Email, phone and password" },
  { id: 2, label: "Personal", description: "About you and where you live" },
  { id: 3, label: "Education", description: "Your studies or degree" },
  {
    id: 4,
    label: "Entrance & Documents",
    description: "Exam result and uploads",
  },
  { id: 5, label: "Confirmation", description: "Review and submit" },
] as const;

export type Step = 1 | 2 | 3 | 4 | 5;

/** Which fields each step validates, so `trigger()` stays scoped. */
export const STEP_FIELDS: Record<Step, (keyof RegisterValues)[]> = {
  1: ["fullName", "email", "phone", "password", "confirmPassword"],
  2: [
    "gender",
    "country",
    "city",
    "subcity",
    "exactPlace",
    "address2Country",
    "address2City",
    "address2Subcity",
    "address2ExactPlace",
    "tutorStatus",
    "aboutMe",
  ],
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

/** The step that owns a form or file field — where to send the tutor back. */
export function stepOfField(field: string): Step | null {
  if (isFileField(field)) {
    return 4;
  }

  for (const [step, fields] of Object.entries(STEP_FIELDS)) {
    if ((fields as string[]).includes(field)) {
      return Number(step) as Step;
    }
  }

  return null;
}

/* =========================================================
   DRAFT

   Saved to sessionStorage so a reload or an accidental back
   navigation doesn't wipe the form. Passwords and the
   confirmation tick are never saved and files can't be, so a
   restored draft always reopens at step 1 — continuing through
   the filled-in steps is quick.
========================================================= */

export const DRAFT_STORAGE_KEY = "register-draft-v1";

const DRAFT_EXCLUDED: (keyof RegisterValues)[] = [
  "password",
  "confirmPassword",
  "confirmation",
];

export type RegisterDraft = {
  values: Partial<RegisterValues>;
  /**
   * The address the tutor verified, so a reload doesn't ask for a new code.
   * Only a UI hint — the register route checks verification itself.
   */
  verifiedEmail: string | null;
};

export function toDraft(
  values: RegisterValues,
  verifiedEmail: string | null
): RegisterDraft {
  const saved: Partial<RegisterValues> = { ...values };

  for (const key of DRAFT_EXCLUDED) {
    delete saved[key];
  }

  return { values: saved, verifiedEmail };
}

/** Parses a stored draft, ignoring anything that isn't a known field. */
export function fromDraft(raw: string | null): RegisterDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RegisterDraft>;
    const values: Record<string, unknown> = {};

    for (const key of Object.keys(DEFAULT_VALUES) as (keyof RegisterValues)[]) {
      if (DRAFT_EXCLUDED.includes(key)) {
        continue;
      }

      const value = parsed.values?.[key];

      if (typeof value === typeof DEFAULT_VALUES[key]) {
        values[key] = value;
      }
    }

    return {
      values: values as Partial<RegisterValues>,
      verifiedEmail:
        typeof parsed.verifiedEmail === "string" ? parsed.verifiedEmail : null,
    };
  } catch {
    return null;
  }
}
