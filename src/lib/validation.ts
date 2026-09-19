import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const fileListSchema = (label: string) =>
  z
    .custom<FileList>()
    .refine(
      (files) => files instanceof FileList && files.length === 1,
      `${label} is required`
    )
    .refine(
      (files) =>
        files instanceof FileList &&
        files.length === 1 &&
        files[0].size <= MAX_FILE_SIZE,
      "File size must be 5 MB or less"
    )
    .refine(
      (files) =>
        files instanceof FileList &&
        files.length === 1 &&
        ALLOWED_FILE_TYPES.includes(files[0].type),
      "Only PDF, JPG, JPEG, and PNG files are allowed"
    );

export const applicationSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long"),

  phone: z
    .string()
    .regex(
      /^(09\d{8}|\+2519\d{8})$/,
      "Enter a valid Ethiopian phone number"
    ),

  university: z
    .string()
    .min(2, "University is required")
    .max(150, "University name is too long"),

  department: z
    .string()
    .min(2, "Department is required")
    .max(150, "Department name is too long"),

  currentYear: z
    .string()
    .min(1, "Please select your current year"),

  gpa: z
    .string()
    .refine(
      (value) => {
        const number = Number(value);
        return !Number.isNaN(number) && number >= 0 && number <= 4;
      },
      {
        message: "GPA must be between 0 and 4",
      }
    ),

  gradeApplying: z
    .string()
    .min(1, "Grade is required")
    .max(100, "Grade is too long"),

  subjects: z
    .string()
    .min(2, "Please enter the subjects you can teach")
    .max(300, "Subjects entry is too long"),

  experience: z
    .string()
    .min(10, "Please describe your teaching experience")
    .max(1000, "Experience description is too long"),

  address: z
    .string()
    .min(3, "Current address is required")
    .max(300, "Address is too long"),

  transcript: fileListSchema("Transcript"),

  entranceResult: fileListSchema("Entrance result"),

  governmentId: fileListSchema("Government ID"),

  confirmInformation: z
    .boolean()
    .refine((value) => value === true, {
      message: "You must confirm that the information is correct",
    }),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;