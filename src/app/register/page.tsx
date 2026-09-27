"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FormError } from "@/components/shared/ErrorState";
import { Wordmark } from "@/components/layout/Wordmark";
import { AccountStep } from "@/app/register/steps/AccountStep";
import { PersonalStep } from "@/app/register/steps/PersonalStep";
import { EducationStep } from "@/app/register/steps/EducationStep";
import { DocumentsStep } from "@/app/register/steps/DocumentsStep";
import { ReviewStep } from "@/app/register/steps/ReviewStep";
import {
  DEFAULT_VALUES,
  EMPTY_FILES,
  STEPS,
  STEP_FIELDS,
  filesToSend,
  registerSchema,
  validateDocument,
  validateTotalUploadSize,
  type FileField,
  type FileState,
  type RegisterValues,
  type Step,
} from "@/app/register/schema";
import { compressImage } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

const DOCUMENT_FIELDS: FileField[] = [
  "transcript",
  "entranceResult",
  "governmentId",
  "graduationDocument",
  "cv",
];

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  /* Files live outside react-hook-form — see the note in `schema.ts`. */
  const [files, setFiles] = React.useState<FileState>(EMPTY_FILES);
  const [fileErrors, setFileErrors] = React.useState<
    Partial<Record<FileField, string>>
  >({});
  const [filesBusy, setFilesBusy] = React.useState<
    Partial<Record<FileField, boolean>>
  >({});

  /**
   * A file being compressed is not in `files` yet, so advancing now would
   * fail its own required-document check. Hold the step instead.
   */
  const preparingFiles = Object.values(filesBusy).some(Boolean);

  /* Email verification */
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [codeSent, setCodeSent] = React.useState(false);
  const [emailCode, setEmailCode] = React.useState("");
  const [sendingCode, setSendingCode] = React.useState(false);
  const [verifyingCode, setVerifyingCode] = React.useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const { getValues, setValue, trigger, setFocus } = form;

  /* ---------------------------------------------------------
     BRANCH CLEARING

     Handled where the change happens rather than in an effect:
     switching status must not leave the other branch's values
     in the payload, since the API stores whatever it is sent.
  --------------------------------------------------------- */
  const handleTutorStatusChange = React.useCallback(
    (status: string) => {
      if (status === "STUDENT") {
        setValue("fieldOfGraduation", "");
        setValue("universityGraduatedFrom", "");
        setValue("CGPA", "");
        setValue("employmentStatus", "");
        setValue("currentJob", "");
        setFiles((previous) => ({ ...previous, graduationDocument: null }));
        setFileErrors((previous) => ({
          ...previous,
          graduationDocument: undefined,
        }));
      }

      if (status === "GRADUATE") {
        setValue("university", "");
        setValue("department", "");
        setValue("currentYear", "");
        setValue("currentGPA", "");
      }
    },
    [setValue]
  );

  const handleEmploymentStatusChange = React.useCallback(
    (status: string) => {
      if (status !== "EMPLOYED" && status !== "SELF_EMPLOYED") {
        setValue("currentJob", "");
      }
    },
    [setValue]
  );

  /* ---------------------------------------------------------
     EMAIL VERIFICATION
  --------------------------------------------------------- */
  const resetVerification = React.useCallback(() => {
    setEmailVerified(false);
    setCodeSent(false);
    setEmailCode("");
  }, []);

  async function sendEmailCode() {
    const valid = await trigger("email");

    if (!valid) {
      return;
    }

    const email = getValues("email").trim().toLowerCase();

    setSendingCode(true);
    setFormError("");

    try {
      const response = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to send verification code."
        );
      }

      setCodeSent(true);
      setEmailVerified(false);
      setEmailCode("");
      toast.success(`Verification code sent to ${email}.`);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to send verification code."
      );
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyEmailCode() {
    const code = emailCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setFormError("Verification code must contain exactly 6 digits.");
      return;
    }

    setVerifyingCode(true);
    setFormError("");

    try {
      const response = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: getValues("email").trim().toLowerCase(),
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Invalid verification code."
        );
      }

      setEmailVerified(true);
      setCodeSent(false);
      setEmailCode("");
      toast.success("Email verified.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Invalid verification code."
      );
    } finally {
      setVerifyingCode(false);
    }
  }

  /* ---------------------------------------------------------
     FILES
  --------------------------------------------------------- */
  async function handleFileChange(field: FileField, file: File | null) {
    if (!file) {
      setFileErrors((previous) => ({ ...previous, [field]: "" }));
      setFiles((previous) => ({ ...previous, [field]: null }));

      return;
    }

    setFilesBusy((previous) => ({ ...previous, [field]: true }));

    // Shrink the photo before it is validated, not after: a 6MB camera
    // picture becomes an acceptable few-hundred-KB document instead of an
    // error the tutor has no obvious way to act on. `compressImage` never
    // throws — it returns the original whenever it cannot do better.
    const prepared = await compressImage(file);

    const message = validateDocument(
      field,
      prepared,
      getValues("tutorStatus") ?? ""
    );

    setFileErrors((previous) => ({ ...previous, [field]: message }));

    // A rejected file is not kept, so it can never reach the request.
    setFiles((previous) => ({
      ...previous,
      [field]: message ? null : prepared,
    }));

    setFilesBusy((previous) => ({ ...previous, [field]: false }));
  }

  function validateFiles(): boolean {
    const status = getValues("tutorStatus") ?? "";
    const next: Partial<Record<FileField, string>> = {};

    for (const field of DOCUMENT_FIELDS) {
      if (field === "graduationDocument" && status !== "GRADUATE") {
        continue;
      }

      const message = validateDocument(field, files[field], status);

      if (message) {
        next[field] = message;
      }
    }

    setFileErrors(next);

    return Object.keys(next).length === 0;
  }

  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function goNext() {
    setFormError("");

    const fields = STEP_FIELDS[step];
    const valid = await trigger(fields, { shouldFocus: true });

    if (!valid) {
      return;
    }

    if (step === 1 && !emailVerified) {
      setFormError(
        "Please verify your email address before continuing."
      );
      return;
    }

    if (step === 4 && !validateFiles()) {
      setFormError("Please fix the highlighted documents before continuing.");
      return;
    }

    if (step === 4) {
      const totalError = validateTotalUploadSize(
        files,
        getValues("tutorStatus") ?? ""
      );

      if (totalError) {
        setFormError(totalError);
        return;
      }
    }

    if (step < 5) {
      setStep((current) => (current + 1) as Step);
      scrollToTop();
    }
  }

  function goBack() {
    setFormError("");

    if (step > 1) {
      setStep((current) => (current - 1) as Step);
      scrollToTop();
    }
  }

  /* ---------------------------------------------------------
     SUBMIT
  --------------------------------------------------------- */
  async function onSubmit(values: RegisterValues) {
    if (!emailVerified) {
      setFormError(
        "Your email address must be verified before creating your account."
      );
      return;
    }

    if (!validateFiles()) {
      setFormError("Please upload all required documents.");
      return;
    }

    const totalError = validateTotalUploadSize(files, values.tutorStatus);

    if (totalError) {
      setFormError(totalError);
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const formData = new FormData();

      /* Account */
      formData.append("fullName", values.fullName.trim());
      formData.append("email", values.email.trim().toLowerCase());
      /* The 9-digit local number; the API canonicalizes it. */
      formData.append("phone", values.phone);
      formData.append("password", values.password);
      formData.append("confirmPassword", values.confirmPassword);

      /* Personal */
      formData.append("gender", values.gender);
      formData.append("country", values.country.trim());
      formData.append("city", values.city.trim());
      formData.append("subcity", values.subcity.trim());
      formData.append("woreda", values.woreda.trim());
      formData.append("exactPlace", values.exactPlace.trim());

      if (values.hasSecondAddress) {
        formData.append("address2Country", values.address2Country.trim());
        formData.append("address2City", values.address2City.trim());
        formData.append("address2Subcity", values.address2Subcity.trim());
        formData.append("address2Woreda", values.address2Woreda.trim());
        formData.append(
          "address2ExactPlace",
          values.address2ExactPlace.trim()
        );
      }
      formData.append("aboutMe", values.aboutMe.trim());
      formData.append("tutorStatus", values.tutorStatus);

      /* Student */
      if (values.tutorStatus === "STUDENT") {
        formData.append("university", values.university.trim());
        formData.append("department", values.department.trim());
        formData.append("currentYear", values.currentYear);
        formData.append("currentGPA", values.currentGPA);
      }

      /* Graduate */
      if (values.tutorStatus === "GRADUATE") {
        formData.append("fieldOfGraduation", values.fieldOfGraduation.trim());
        formData.append(
          "universityGraduatedFrom",
          values.universityGraduatedFrom.trim()
        );
        formData.append("CGPA", values.CGPA);
        formData.append("employmentStatus", values.employmentStatus);

        if (
          values.employmentStatus === "EMPLOYED" ||
          values.employmentStatus === "SELF_EMPLOYED"
        ) {
          formData.append("currentJob", values.currentJob.trim());
        }
      }

      /* Entrance — percentage is deliberately not sent; the API derives it. */
      formData.append("entranceScore", values.entranceScore);
      formData.append("entranceTotal", values.entranceTotal);

      /* Documents */
      for (const [field, file] of filesToSend(files, values.tutorStatus)) {
        formData.append(field, file);
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      // Errors raised before the route runs (Vercel's 413 for an oversized
      // body, a gateway timeout) come back as HTML or plain text, not JSON.
      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        if (response.status === 413) {
          throw new Error(
            "Your documents are too large to upload together. Please use smaller files and try again."
          );
        }

        throw new Error(
          data?.error ||
            data?.message ||
            "Registration failed. Please try again."
        );
      }

      router.push("/login?registered=1");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onInvalid() {
    setFormError("Please fix the highlighted fields before continuing.");

    const firstError = STEP_FIELDS[5].find((field) => form.formState.errors[field]);

    if (firstError) {
      setFocus(firstError);
    }
  }

  const current = STEPS[step - 1];

  return (
    <main className="min-h-svh bg-muted/30 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Wordmark />

          <Link
            href="/login"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Already have an account?
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {/* ---------------------------------------------------
              HEADER + PROGRESS
          --------------------------------------------------- */}
          <div className="border-b p-5 sm:p-8">
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Become a tutor
            </h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Create your Excellence Tutor account.
            </p>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">
                  Step {step} of {STEPS.length}
                </span>
                <span>{current.label}</span>
              </div>

              <div
                className="flex gap-1.5"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={step}
                aria-valuetext={`Step ${step} of ${STEPS.length}: ${current.label}`}
              >
                {STEPS.map((item) => (
                  <span
                    key={item.id}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      item.id <= step ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------
              FORM
          --------------------------------------------------- */}
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            noValidate
            className="p-5 sm:p-8"
          >
            {step === 1 ? (
              <AccountStep
                form={form}
                email={{
                  verified: emailVerified,
                  codeSent,
                  code: emailCode,
                  sending: sendingCode,
                  verifying: verifyingCode,
                  setCode: setEmailCode,
                  send: sendEmailCode,
                  verify: verifyEmailCode,
                  change: resetVerification,
                }}
              />
            ) : null}

            {step === 2 ? (
              <PersonalStep
                form={form}
                onTutorStatusChange={handleTutorStatusChange}
              />
            ) : null}

            {step === 3 ? (
              <EducationStep
                form={form}
                onEmploymentStatusChange={handleEmploymentStatusChange}
              />
            ) : null}

            {step === 4 ? (
              <DocumentsStep
                form={form}
                files={files}
                fileErrors={fileErrors}
                filesBusy={filesBusy}
                onFileChange={handleFileChange}
              />
            ) : null}

            {step === 5 ? <ReviewStep form={form} files={files} /> : null}

            <FormError message={formError} className="mt-6" />

            <Separator className="my-6" />

            {/* Sticky on mobile so the primary action is always reachable
                without scrolling to the bottom of a long step. */}
            <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 bg-card px-5 pt-2 pb-1 sm:static sm:mx-0 sm:px-0 sm:pb-0">
              <Button
                type="button"
                variant="ghost"
                size="xl"
                onClick={goBack}
                disabled={step === 1 || submitting}
                className={cn(step === 1 && "invisible")}
              >
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Back
              </Button>

              {step < 5 ? (
                <Button
                  type="button"
                  size="xl"
                  onClick={goNext}
                  disabled={preparingFiles}
                >
                  Continue
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="xl"
                  disabled={submitting || preparingFiles}
                >
                  {submitting ? (
                    <Loader2
                      className="animate-spin"
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                  ) : (
                    <Check data-icon="inline-start" aria-hidden="true" />
                  )}
                  {submitting ? "Creating account…" : "Create account"}
                </Button>
              )}
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
