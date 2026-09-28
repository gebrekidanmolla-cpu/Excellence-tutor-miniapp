import { z } from "zod";

import { DEFAULT_CITY, DEFAULT_COUNTRY } from "@/lib/address";
import { ETHIOPIAN_LOCAL_PHONE_PATTERN } from "@/lib/phone";
import {
  ABOUT_ME_MAX_LENGTH,
  CURRENT_YEAR_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  TEXT_MAX_LENGTH,
} from "@/app/register/schema";

/*
 * What a tutor may change about themselves after registering — shared by
 * the `/tutor/profile/edit` form and `PATCH /api/tutor/profile`, like
 * `registerSchema` is for sign-up.
 *
 * Deliberately a short list: contact phone, address, "About me", and the
 * education details that change over time (a student's year; a graduate's
 * employment). Name, email, gender, tutor type, university, GPA and entrance
 * result stay locked, because they are what the submitted documents vouch
 * for — an admin changes those after checking.
 *
 * `tutorStatus` rides along only to pick which education rules apply; the
 * route overwrites it with the stored value and never writes it.
 */

export const LOCKED_PROFILE_FIELDS = [
  "Full name",
  "Email",
  "Gender",
  "Tutor type",
  "University and department / field",
  "GPA / CGPA",
  "Entrance result",
  "Required documents",
];

function text(label: string) {
  return z
    .string()
    .trim()
    .max(TEXT_MAX_LENGTH, `${label} must be ${TEXT_MAX_LENGTH} characters or fewer.`);
}

export const profileEditSchema = z
  .object({
    tutorStatus: z.enum(["STUDENT", "GRADUATE"]),

    phone: z
      .string()
      .regex(
        ETHIOPIAN_LOCAL_PHONE_PATTERN,
        "Please enter a valid Ethiopian mobile number."
      ),

    country: text("Country").min(1, "Please enter your country."),
    city: text("City").min(1, "Please enter your city or region."),
    subcity: text("Sub-city").min(1, "Please enter your sub-city or zone."),
    exactPlace: text("Specific area").min(1, "Please enter your specific area."),

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

    currentYear: z.string(),
    employmentStatus: z.string(),
    currentJob: text("Current job"),
  })
  .superRefine((values, ctx) => {
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

    if (
      values.tutorStatus === "STUDENT" &&
      !CURRENT_YEAR_OPTIONS.some((option) => option.value === values.currentYear)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["currentYear"],
        message: "Please select your current year.",
      });
    }

    if (values.tutorStatus === "GRADUATE") {
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

      if (needsCurrentJob(values.employmentStatus) && !values.currentJob.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["currentJob"],
          message: "Please enter your current job.",
        });
      }
    }
  }, {
    /* Same reason as `registerSchema`: run the conditional rules even while
       another field is invalid, so every error shows at once. */
    when: () => true,
  });

export type ProfileEditValues = z.input<typeof profileEditSchema>;

export function needsCurrentJob(employmentStatus: string) {
  return employmentStatus === "EMPLOYED" || employmentStatus === "SELF_EMPLOYED";
}

/** The form's starting values, from the stored tutor row. */
export function profileEditDefaults(tutor: {
  tutorStatus: "STUDENT" | "GRADUATE";
  phone: string;
  country: string;
  city: string;
  subcity: string;
  exactPlace: string;
  address2Country: string | null;
  address2City: string | null;
  address2Subcity: string | null;
  address2ExactPlace: string | null;
  aboutMe: string | null;
  currentYear: string | null;
  employmentStatus: string | null;
  currentJob: string | null;
}): ProfileEditValues {
  const hasSecondAddress = Boolean(
    tutor.address2Subcity || tutor.address2ExactPlace
  );

  return {
    tutorStatus: tutor.tutorStatus,
    // Stored as +2519XXXXXXXX; the form edits the 9 local digits.
    phone: tutor.phone.replace(/^\+251/, ""),
    country: tutor.country,
    city: tutor.city,
    subcity: tutor.subcity,
    exactPlace: tutor.exactPlace,
    hasSecondAddress,
    address2Country: tutor.address2Country || DEFAULT_COUNTRY,
    address2City: tutor.address2City || DEFAULT_CITY,
    address2Subcity: tutor.address2Subcity ?? "",
    address2ExactPlace: tutor.address2ExactPlace ?? "",
    aboutMe: tutor.aboutMe ?? "",
    currentYear: tutor.currentYear ?? "",
    employmentStatus: tutor.employmentStatus ?? "",
    currentJob: tutor.currentJob ?? "",
  };
}
