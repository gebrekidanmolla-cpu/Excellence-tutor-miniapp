"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, History, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormError } from "@/components/shared/ErrorState";
import { Wordmark } from "@/components/layout/Wordmark";
import { AccountStep } from "@/app/register/steps/AccountStep";
import { PersonalStep } from "@/app/register/steps/PersonalStep";
import { EducationStep } from "@/app/register/steps/EducationStep";
import { DocumentsStep } from "@/app/register/steps/DocumentsStep";
import { ReviewStep } from "@/app/register/steps/ReviewStep";
import {
  MobileChecklist,
  MobileProgress,
  STEP_ICONS,
  WizardAside,
} from "@/app/register/components/WizardProgress";
import {
  DEFAULT_VALUES,
  DRAFT_STORAGE_KEY,
  EMPTY_FILES,
  FILE_FIELDS,
  STEPS,
  STEP_FIELDS,
  filesToSend,
  fromDraft,
  isFileField,
  registerSchema,
  stepOfField,
  toDraft,
  validateDocument,
  validateTotalUploadSize,
  type FileField,
  type FileState,
  type RegisterDraft,
  type RegisterValues,
  type Step,
} from "@/app/register/schema";
import { compressImage } from "@/lib/compress-image";
import { nextPathFromLocation } from "@/lib/safe-redirect";

/** The heading each step opens with. Education depends on the tutor's status. */
function stepHeading(
  step: Step,
  tutorStatus: string
): { title: string; description: string } {
  switch (step) {
    case 1:
      return {
        title: "Create your tutor account",
        description:
          "Start with the basics. You'll verify your email address so we can reach you.",
      };
    case 2:
      return {
        title: "Tell us about yourself",
        description:
          "A few details so we can match you with families near you.",
      };
    case 3:
      return tutorStatus === "GRADUATE"
        ? {
            title: "Your degree and work",
            description: "Tell us where you studied and what you do now.",
          }
        : {
            title: "Your studies",
            description: "Tell us where and what you're studying.",
          };
    case 4:
      return {
        title: "Exam result and documents",
        description:
          "Upload clear photos of your documents. Our team may review them before accepting you.",
      };
    default:
      return {
        title: "Review your application",
        description:
          "Check everything is correct. You can jump back to any section to edit it.",
      };
  }
}

/** Matches the server's per-address cooldown in `send-email-code`. */
const RESEND_COOLDOWN_SECONDS = 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/* =========================================================
   DRAFT STORAGE
========================================================= */

function readDraftRaw(): string | null {
  try {
    return window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDraft(draft: RegisterDraft) {
  try {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable (private mode, quota): the draft is a convenience.
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function subscribeNever() {
  return () => {};
}

/* =========================================================
   UPLOAD WITH PROGRESS

   `fetch` cannot report upload progress, and up to 4 MB over
   a mobile connection is long enough to need it.
========================================================= */

type ApiResponse = {
  status: number;
  data: {
    message?: string;
    error?: string;
    field?: string;
    code?: string;
    signedIn?: boolean;
  } | null;
};

function postWithProgress(
  url: string,
  body: FormData,
  onProgress: (fraction: number) => void
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", url);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };

    request.upload.onload = () => onProgress(1);

    request.onload = () => {
      // Errors raised before the route runs (Vercel's 413 for an oversized
      // body, a gateway timeout) come back as HTML or plain text, not JSON.
      let data: ApiResponse["data"] = null;

      try {
        data = JSON.parse(request.responseText);
      } catch {
        data = null;
      }

      resolve({ status: request.status, data });
    };

    request.onerror = () =>
      reject(
        new Error(
          "The connection was interrupted. Please check your internet connection and try again."
        )
      );

    request.send(body);
  });
}

/* =========================================================
   PAGE
========================================================= */

export default function RegisterPage() {
  /*
   * `undefined` while server-rendering and hydrating, then the stored draft
   * (or null). The wizard is keyed on the phase so it remounts once on the
   * client with the draft as its initial state — reading storage during the
   * first render would not match the server HTML.
   */
  const rawDraft = React.useSyncExternalStore(
    subscribeNever,
    readDraftRaw,
    () => undefined
  );

  const hydrated = rawDraft !== undefined;

  return (
    <RegisterWizard
      key={hydrated ? "client" : "server"}
      draft={hydrated ? fromDraft(rawDraft) : null}
    />
  );
}

function RegisterWizard({ draft }: { draft: RegisterDraft | null }) {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(
    null
  );
  const [formError, setFormError] = React.useState("");
  const [showRestored, setShowRestored] = React.useState(draft !== null);

  /* Set once the account exists: stops the draft saving and the unload guard. */
  const [completed, setCompleted] = React.useState(false);

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
  const hasFiles = Object.values(files).some(Boolean);

  /* Email verification */
  const [verifiedEmail, setVerifiedEmail] = React.useState<string | null>(
    draft?.verifiedEmail ?? null
  );
  const [codeSent, setCodeSent] = React.useState(false);
  /* A failed verify, shown under the code boxes. */
  const [codeError, setCodeError] = React.useState("");
  const [emailCode, setEmailCode] = React.useState("");
  const [sendingCode, setSendingCode] = React.useState(false);
  const [verifyingCode, setVerifyingCode] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);
  const [checkingPhone, setCheckingPhone] = React.useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: draft
      ? { ...DEFAULT_VALUES, ...draft.values }
      : DEFAULT_VALUES,
    mode: "onTouched",
  });

  const { control, getValues, setValue, setError, trigger, setFocus } = form;

  const emailValue = useWatch({ control, name: "email" });
  const tutorStatus = useWatch({ control, name: "tutorStatus" }) ?? "";

  /* Move focus to the new step's heading, but not on first load. */
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const initialStepRef = React.useRef(true);

  React.useEffect(() => {
    if (initialStepRef.current) {
      initialStepRef.current = false;
      return;
    }

    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  /* Verification belongs to an address; editing it un-verifies. */
  const emailVerified =
    verifiedEmail !== null && verifiedEmail === normalizeEmail(emailValue);

  /* ---------------------------------------------------------
     DRAFT
  --------------------------------------------------------- */
  React.useEffect(() => {
    if (completed) {
      return;
    }

    let timer: number | undefined;

    const save = (values: RegisterValues) => {
      window.clearTimeout(timer);

      timer = window.setTimeout(() => {
        writeDraft(toDraft(values, verifiedEmail));
      }, 400);
    };

    save(form.getValues());

    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => save(values),
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [form, verifiedEmail, completed]);

  /* Picked files cannot be saved in the draft; warn before losing them. */
  React.useEffect(() => {
    if (!hasFiles || completed) {
      return;
    }

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [hasFiles, completed]);

  function startOver() {
    clearDraft();
    window.location.reload();
  }

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
  React.useEffect(() => {
    if (resendIn <= 0) {
      return;
    }

    const timer = window.setTimeout(
      () => setResendIn((seconds) => seconds - 1),
      1000
    );

    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const resetVerification = React.useCallback(() => {
    setVerifiedEmail(null);
    setCodeSent(false);
    setEmailCode("");
    setCodeError("");
    // The server's cooldown is per address; a new one can be sent at once.
    setResendIn(0);
  }, []);

  async function sendEmailCode() {
    const valid = await trigger("email");

    if (!valid) {
      return;
    }

    const email = normalizeEmail(getValues("email"));

    setSendingCode(true);
    setFormError("");

    try {
      const response = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Unable to send verification code."
        );
      }

      setCodeSent(true);
      setVerifiedEmail(null);
      setEmailCode("");
      setCodeError("");
      setResendIn(RESEND_COOLDOWN_SECONDS);
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

  async function verifyEmailCode(codeOverride?: string) {
    const code = (codeOverride ?? emailCode).trim();

    if (!/^\d{6}$/.test(code)) {
      setCodeError("Verification code must contain exactly 6 digits.");
      return;
    }

    const email = normalizeEmail(getValues("email"));

    setVerifyingCode(true);
    setFormError("");
    setCodeError("");

    try {
      const response = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Invalid verification code."
        );
      }

      setVerifiedEmail(email);
      setCodeSent(false);
      setEmailCode("");
      setResendIn(0);
      toast.success("Email verified.");
    } catch (error) {
      /* Shown under the code boxes rather than in the form-level banner,
         which sits below the password fields — off-screen on a phone.
         Clearing the boxes lets the tutor type or paste the code afresh. */
      setCodeError(
        error instanceof Error ? error.message : "Invalid verification code."
      );
      setEmailCode("");
    } finally {
      setVerifyingCode(false);
    }
  }

  /**
   * Catches a taken number on step 1 instead of after every upload. Only a
   * definite "taken" or "invalid" blocks; a network failure lets the tutor
   * through, since the register route checks again.
   */
  async function phoneIsAvailable(): Promise<boolean> {
    setCheckingPhone(true);

    try {
      const response = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: getValues("phone") }),
      });

      if (response.status === 400 || response.status === 409) {
        const data = await response.json().catch(() => null);

        setError(
          "phone",
          {
            message:
              data?.message ||
              "An account with this phone number already exists.",
          },
          { shouldFocus: true }
        );

        return false;
      }

      return true;
    } catch {
      return true;
    } finally {
      setCheckingPhone(false);
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

    for (const field of FILE_FIELDS) {
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
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  /** Backwards only — forward movement always goes through validation. */
  function goToStep(target: Step) {
    if (target >= step || submitting) {
      return;
    }

    setFormError("");
    setStep(target);
    scrollToTop();
  }

  async function goNext() {
    setFormError("");

    const fields = STEP_FIELDS[step];
    const valid = await trigger(fields, { shouldFocus: true });

    if (!valid) {
      return;
    }

    if (step === 1) {
      if (!emailVerified) {
        setFormError("Please verify your email address before continuing.");
        return;
      }

      if (!(await phoneIsAvailable())) {
        return;
      }
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
     SERVER ERRORS

     The register route names the field at fault; send the
     tutor to the step that owns it rather than leaving a
     message on the review page about a field they can't see.
  --------------------------------------------------------- */
  function showServerError(data: ApiResponse["data"], fallback: string) {
    const message = data?.message || data?.error || fallback;

    if (data?.code === "EMAIL_NOT_VERIFIED") {
      resetVerification();
      setStep(1);
      scrollToTop();
      setFormError(message);
      return;
    }

    const field = data?.field;
    const target = field ? stepOfField(field) : null;

    if (field && target) {
      if (isFileField(field)) {
        // Drop the rejected file so it must be replaced, not resubmitted.
        setFiles((previous) => ({ ...previous, [field]: null }));
        setFileErrors((previous) => ({ ...previous, [field]: message }));
      } else {
        setError(field as keyof RegisterValues, { message });
      }

      if (target !== step) {
        setStep(target);
        scrollToTop();
      }
    }

    setFormError(message);
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
    setUploadProgress(0);
    setFormError("");

    const formData = new FormData();

    /* Account */
    formData.append("fullName", values.fullName.trim());
    formData.append("email", normalizeEmail(values.email));
    /* The 9-digit local number; the API canonicalizes it. */
    formData.append("phone", values.phone);
    formData.append("password", values.password);
    formData.append("confirmPassword", values.confirmPassword);

    /* Personal */
    formData.append("gender", values.gender);
    formData.append("country", values.country.trim());
    formData.append("city", values.city.trim());
    formData.append("subcity", values.subcity.trim());
    formData.append("exactPlace", values.exactPlace.trim());

    if (values.hasSecondAddress) {
      formData.append("address2Country", values.address2Country.trim());
      formData.append("address2City", values.address2City.trim());
      formData.append("address2Subcity", values.address2Subcity.trim());
      formData.append("address2ExactPlace", values.address2ExactPlace.trim());
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

    try {
      const { status, data } = await postWithProgress(
        "/api/auth/register",
        formData,
        setUploadProgress
      );

      if (status < 200 || status >= 300 || !data) {
        if (status === 413) {
          setFormError(
            "Your documents are too large to upload together. Please use smaller files and try again."
          );
        } else {
          showServerError(data, "Registration failed. Please try again.");
        }

        setSubmitting(false);
        setUploadProgress(null);
        return;
      }

      setCompleted(true);
      clearDraft();

      // Back to the job they came from (`?next=/apply/<code>`), else home.
      const next = nextPathFromLocation();

      // Stays "submitting" through the navigation, so it can't be sent twice.
      if (data.signedIn) {
        toast.success("Welcome to Excellence Tutor! Your account is ready.");
        router.replace(next);
      } else {
        router.replace(
          `/login?registered=1&next=${encodeURIComponent(next)}`
        );
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  function onInvalid() {
    setFormError("Please fix the highlighted fields before continuing.");

    const firstError = STEP_FIELDS[5].find(
      (field) => form.formState.errors[field]
    );

    if (firstError) {
      setFocus(firstError);
    }
  }

  const heading = stepHeading(step, tutorStatus);
  const uploadPercent = Math.round((uploadProgress ?? 0) * 100);
  const uploading = uploadProgress !== null && uploadProgress < 1;

  const StepIcon = STEP_ICONS[step];
  const nextStep = STEPS.find((item) => item.id === step + 1);
  const progressPercent = Math.round((step / STEPS.length) * 100);

  return (
    <main className="min-h-svh bg-background lg:grid lg:grid-cols-[minmax(22rem,26rem)_1fr] xl:grid-cols-[28rem_1fr]">
      <WizardAside step={step} onStepClick={goToStep} disabled={submitting} />

      <div className="relative flex min-h-svh min-w-0 flex-col sm:bg-muted/50">
        {/* A soft brand wash behind the top of the card. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-96 bg-[radial-gradient(55%_100%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_9%,transparent),transparent)] sm:block"
        />

        {/* ---------------------------------------------------
            MOBILE TOP BAR
        --------------------------------------------------- */}
        <header className="relative flex items-center justify-between gap-4 px-4 pt-5 sm:px-8 lg:hidden">
          <Wordmark />
          <Link
            href="/login"
            className="rounded-md text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Sign in
          </Link>
        </header>

        <div className="relative mx-auto w-full max-w-3xl flex-1 pt-6 pb-8 sm:px-8 sm:pb-12 lg:px-12 lg:pt-10 xl:pt-12">
          <div className="px-4 sm:px-0">
            <MobileProgress
              step={step}
              onStepClick={goToStep}
              disabled={submitting}
            />
          </div>

          <div className="hidden items-center justify-between gap-4 lg:flex">
            <p className="text-sm font-medium text-muted-foreground">
              Step {step} of {STEPS.length}
              <span aria-hidden="true" className="mx-2 text-border">
                /
              </span>
              <span className="text-foreground">{STEPS[step - 1].label}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Already registered?{" "}
              <Link
                href="/login"
                className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Sign in
              </Link>
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            noValidate
            className="relative mt-6 sm:rounded-3xl sm:border sm:bg-card sm:shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_40px_-12px_rgb(30_41_110/0.18)] lg:mt-5"
          >
            {/* Progress along the card's top edge; `MobileProgress` does this job below `lg`. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 hidden h-1 overflow-hidden rounded-t-3xl bg-muted lg:block"
            >
              <div
                className="h-full bg-[linear-gradient(90deg,var(--color-primary),oklch(0.64_0.15_250))] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* ---------------------------------------------------
                STEP HEADER — focused on every step change so
                screen-reader users hear where they landed.
            --------------------------------------------------- */}
            <div className="flex items-start gap-4 px-4 pt-2 sm:px-8 sm:pt-9 lg:px-10">
              <span
                aria-hidden="true"
                className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:flex"
              >
                <StepIcon className="size-6" />
              </span>

              <div className="min-w-0">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-heading text-2xl font-semibold tracking-tight text-balance outline-none sm:text-[1.75rem] sm:leading-tight"
                >
                  {heading.title}
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
                  {heading.description}
                </p>
              </div>
            </div>

            <div className="mx-4 mt-7 h-px bg-border sm:mx-8 lg:mx-10" />

            <div className="px-4 pt-8 sm:px-8 sm:pb-8 lg:px-10">
              {step === 1 ? (
                <div
                  className={`mb-8 space-y-3 ${showRestored ? "" : "lg:hidden"}`}
                >
                  {showRestored ? (
                    <Alert>
                      <History aria-hidden="true" />
                      <AlertDescription>
                        <p>
                          Welcome back — we restored the details you entered
                          earlier. Re-enter your password, and you&apos;ll need
                          to attach your documents again.
                        </p>

                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          <button
                            type="button"
                            onClick={() => setShowRestored(false)}
                            className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            Got it
                          </button>
                          <button
                            type="button"
                            onClick={startOver}
                            className="rounded-sm font-medium text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            Start over
                          </button>
                        </p>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <MobileChecklist />
                </div>
              ) : null}

              {/* Keyed so each step fades in; skipped for reduced motion. */}
              <div
                key={step}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
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
                      error: codeError,
                      resendIn,
                      setCode: (code: string) => {
                        setEmailCode(code);
                        setCodeError("");
                      },
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

                {step === 5 ? (
                  <ReviewStep form={form} files={files} onEdit={goToStep} />
                ) : null}
              </div>

              <FormError message={formError} className="mt-8" />

              {uploadProgress !== null ? (
                <div className="mt-8 space-y-1.5" aria-live="polite">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {uploading
                        ? "Uploading your documents…"
                        : "Creating your account…"}
                    </span>
                    <span className="font-medium tabular-nums">
                      {uploadPercent}%
                    </span>
                  </div>

                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="Upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={uploadPercent}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* ---------------------------------------------------
                ACTIONS — pinned to the bottom of the viewport on
                small screens so the next step is always one tap
                away; the card's footer bar on larger ones.
            --------------------------------------------------- */}
            <div className="sticky bottom-0 z-20 mt-8 flex items-center gap-3 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/80 sm:mt-0 sm:rounded-b-3xl sm:px-8 sm:py-5 lg:static lg:bg-muted/40 lg:px-10 lg:backdrop-blur-none">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  onClick={goBack}
                  disabled={submitting}
                  aria-label="Back to the previous step"
                  className="bg-background px-4"
                >
                  <ArrowLeft aria-hidden="true" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              ) : null}

              <p className="hidden text-sm text-muted-foreground lg:block">
                {nextStep ? `Next: ${nextStep.label}` : "Last step"}
              </p>

              {step < 5 ? (
                <Button
                  type="button"
                  size="xl"
                  onClick={goNext}
                  disabled={preparingFiles || checkingPhone}
                  className="flex-1 sm:ml-auto sm:min-w-40 sm:flex-none"
                >
                  {checkingPhone ? (
                    <Loader2
                      className="animate-spin"
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                  ) : null}
                  {step === 4 ? "Review application" : "Continue"}
                  {checkingPhone ? null : (
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="xl"
                  disabled={submitting || preparingFiles}
                  className="flex-1 tabular-nums sm:ml-auto sm:min-w-48 sm:flex-none"
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
                  {!submitting
                    ? "Create my account"
                    : uploading
                      ? `Uploading… ${uploadPercent}%`
                      : "Creating account…"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
