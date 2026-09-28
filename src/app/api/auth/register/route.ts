import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createTutorSession } from "@/lib/session";
import { secondAddressColumns } from "@/lib/address";
import { normalizeEthiopianPhone } from "@/lib/phone";
import { normalizeEmail } from "@/lib/email-verification";
import {
  DocumentError,
  deleteDocuments,
  prepareDocument,
  storeDocument,
  type PreparedDocument,
} from "@/lib/upload-document";
import {
  DEFAULT_VALUES,
  FILE_FIELDS,
  FILE_LABELS,
  isDocumentRequired,
  registerSchema,
  type FileField,
  type RegisterValues,
} from "@/app/register/schema";

/*
 * Validation is the wizard's own schema (`src/app/register/schema.ts`), so
 * the client and the server cannot disagree about what a valid registration
 * is. Error responses carry `field` when one field is to blame, so the wizard
 * can send the tutor back to the step that owns it.
 */

/** Object-key slug for each document, e.g. `transcript-<uuid>`. */
const FILE_KEY_PREFIX: Record<FileField, string> = {
  transcript: "transcript",
  entranceResult: "entrance-result",
  governmentId: "government-id",
  graduationDocument: "graduation-document",
  cv: "cv",
};

function fail(
  message: string,
  status: number,
  extra: { field?: string; code?: string } = {}
) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];

  /* Once the tutor row exists, its documents must survive any later error. */
  let committed = false;

  try {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return fail("Invalid registration request.", 400);
    }

    const text = (key: string) => {
      const value = formData.get(key);

      return typeof value === "string" ? value : "";
    };

    /* =====================================================
       FIELDS
    ===================================================== */

    const input: Record<string, unknown> = {};

    for (const key of Object.keys(DEFAULT_VALUES) as (keyof RegisterValues)[]) {
      input[key] = text(key);
    }

    Object.assign(input, {
      email: normalizeEmail(text("email")),
      // Accepts +251…, 0… and the bare 9 digits the wizard sends.
      phone: normalizeEthiopianPhone(text("phone")),
      // The second address is optional: absent entirely, or complete.
      hasSecondAddress:
        text("address2Subcity").trim() !== "" ||
        text("address2ExactPlace").trim() !== "",
      // Ticking the box is a client-side step; reaching this route implies it.
      confirmation: true,
    });

    const parsed = registerSchema.safeParse(input);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];

      return fail(issue.message, 400, {
        field: typeof issue.path[0] === "string" ? issue.path[0] : undefined,
      });
    }

    const values = parsed.data;
    const phone = `+251${values.phone}`;
    const isStudent = values.tutorStatus === "STUDENT";
    const isGraduate = values.tutorStatus === "GRADUATE";
    const needsCurrentJob =
      isGraduate &&
      (values.employmentStatus === "EMPLOYED" ||
        values.employmentStatus === "SELF_EMPLOYED");

    /* =====================================================
       EMAIL VERIFICATION
    ===================================================== */

    const verifiedEmail = await prisma.emailVerification.findFirst({
      where: {
        email: values.email,
        verifiedAt: { not: null },
        expiresAt: { gt: new Date() },
      },
      orderBy: { verifiedAt: "desc" },
    });

    if (!verifiedEmail) {
      return fail(
        "Your email verification has expired. Please verify your email address again.",
        403,
        { field: "email", code: "EMAIL_NOT_VERIFIED" }
      );
    }

    /* =====================================================
       DOCUMENTS — every file is checked before any upload.
    ===================================================== */

    const documents: { field: FileField; document: PreparedDocument }[] = [];

    for (const field of FILE_FIELDS) {
      if (field === "graduationDocument" && !isGraduate) {
        continue;
      }

      const entry = formData.get(field);
      const file = entry instanceof File && entry.size > 0 ? entry : null;

      if (!file) {
        if (isDocumentRequired(field, values.tutorStatus)) {
          return fail(`${FILE_LABELS[field]} is required.`, 400, { field });
        }

        continue;
      }

      try {
        documents.push({
          field,
          document: await prepareDocument(
            file,
            field === "cv" ? "cv" : "document",
            FILE_LABELS[field]
          ),
        });
      } catch (error) {
        if (error instanceof DocumentError) {
          return fail(error.message, 400, { field });
        }

        throw error;
      }
    }

    /* =====================================================
       DUPLICATE ACCOUNT CHECK
    ===================================================== */

    const existingTutor = await prisma.tutor.findFirst({
      where: { OR: [{ email: values.email }, { phone }] },
      select: { email: true },
    });

    if (existingTutor) {
      return existingTutor.email === values.email
        ? fail("An account with this email already exists.", 409, {
            field: "email",
          })
        : fail("An account with this phone number already exists.", 409, {
            field: "phone",
          });
    }

    const passwordHash = await hashPassword(values.password);

    /* =====================================================
       UPLOAD — in parallel; every stored key is recorded
       so a partial failure can be cleaned up.
    ===================================================== */

    const folder = `registrations/${randomUUID()}`;

    const results = await Promise.allSettled(
      documents.map(async ({ field, document }) => {
        const key = `${folder}/${FILE_KEY_PREFIX[field]}-${randomUUID()}`;

        await storeDocument(key, document);
        uploadedPaths.push(key);

        return [field, key] as const;
      })
    );

    const failedUpload = results.find(
      (result) => result.status === "rejected"
    );

    if (failedUpload) {
      throw failedUpload.reason;
    }

    const keys: Partial<Record<FileField, string>> = Object.fromEntries(
      results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : []
      )
    );

    /* Required documents were checked above, so these always exist. */
    const requiredKey = (field: FileField): string => {
      const key = keys[field];

      if (!key) {
        throw new Error(`Registration: ${field} was not uploaded.`);
      }

      return key;
    };

    /* =====================================================
       CREATE TUTOR

       One transaction with consuming the verification: a
       second submit racing this one fails on the delete and
       rolls back, instead of creating a second account.
    ===================================================== */

    const entranceScore = Number(values.entranceScore);
    const entranceTotal = Number(values.entranceTotal);

    const [tutor] = await prisma.$transaction([
      prisma.tutor.create({
        data: {
          fullName: values.fullName,
          email: values.email,
          emailVerified: true,
          emailVerifiedAt: verifiedEmail.verifiedAt,
          phone,
          passwordHash,

          gender: values.gender,
          country: values.country,
          city: values.city,
          subcity: values.subcity,
          exactPlace: values.exactPlace,
          ...secondAddressColumns(
            values.hasSecondAddress
              ? {
                  country: values.address2Country,
                  city: values.address2City,
                  subcity: values.address2Subcity,
                  exactPlace: values.address2ExactPlace,
                }
              : null
          ),
          aboutMe: values.aboutMe || null,

          tutorStatus: values.tutorStatus,

          university: isStudent ? values.university : null,
          department: isStudent ? values.department : null,
          currentYear: isStudent ? values.currentYear : null,
          currentGPA: isStudent ? Number(values.currentGPA) : null,

          fieldOfGraduation: isGraduate ? values.fieldOfGraduation : null,
          universityGraduatedFrom: isGraduate
            ? values.universityGraduatedFrom
            : null,
          CGPA: isGraduate ? Number(values.CGPA) : null,
          employmentStatus: isGraduate
            ? (values.employmentStatus as
                | "EMPLOYED"
                | "SELF_EMPLOYED"
                | "UNEMPLOYED"
                | "OTHER")
            : null,
          currentJob: needsCurrentJob ? values.currentJob : null,

          entranceScore,
          entranceTotal,
          entrancePercentage: Number(
            ((entranceScore / entranceTotal) * 100).toFixed(2)
          ),

          transcriptUrl: requiredKey("transcript"),
          entranceResultUrl: requiredKey("entranceResult"),
          governmentIdUrl: requiredKey("governmentId"),
          graduationDocumentUrl: keys.graduationDocument ?? null,
          cvUrl: keys.cv ?? null,
        },
        select: { id: true, fullName: true, email: true },
      }),
      prisma.emailVerification.delete({ where: { id: verifiedEmail.id } }),
    ]);

    committed = true;

    /* =====================================================
       SIGN IN — best-effort: the account exists either way,
       and the wizard falls back to the login page.
    ===================================================== */

    let signedIn = false;

    try {
      await createTutorSession(tutor.id);
      signedIn = true;
    } catch (error) {
      console.error("Registration: could not start a session:", error);
    }

    return NextResponse.json(
      {
        success: true,
        signedIn,
        message: "Your tutor account has been created successfully.",
        tutor,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration API error:", error);

    if (!committed) {
      await deleteDocuments(uploadedPaths);
    }

    if (isUniqueViolation(error)) {
      return fail(
        "An account with this email or phone number already exists.",
        409
      );
    }

    return fail(
      "Something went wrong while creating your account. Please try again.",
      500
    );
  }
}
