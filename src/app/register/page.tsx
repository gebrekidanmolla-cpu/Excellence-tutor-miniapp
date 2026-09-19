"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Upload,
  UserPlus,
} from "lucide-react";

/* =========================================================
   CONSTANTS
========================================================= */

const DOCUMENT_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const CV_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const DOCUMENT_ACCEPT = ".jpg,.jpeg,.png,.webp";
const CV_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_CV_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

type Step = 1 | 2 | 3 | 4 | 5;

type FileState = {
  transcript: File | null;
  entranceResult: File | null;
  governmentId: File | null;
  graduationDocument: File | null;
  cv: File | null;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Password visibility */

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  /* Email verification */

  const [emailVerified, setEmailVerified] =
    useState(false);

  const [emailCode, setEmailCode] = useState("");

  const [sendingCode, setSendingCode] =
    useState(false);

  const [verifyingCode, setVerifyingCode] =
    useState(false);

  const [codeSent, setCodeSent] =
    useState(false);

  /* =========================================================
     FORM STATE
  ========================================================= */

  const [form, setForm] = useState({
    /* Account */

    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",

    /* Personal */

    gender: "",
    city: "Addis Ababa",
    subcity: "",
    exactPlace: "",
    aboutMe: "",
    tutorStatus: "",

    /* Student */

    university: "",
    department: "",
    currentYear: "",
    currentGPA: "",

    /* Graduate */

    fieldOfGraduation: "",
    universityGraduatedFrom: "",
    CGPA: "",
    employmentStatus: "",
    currentJob: "",

    /* Entrance */

    entranceScore: "",
    entranceTotal: "600",

    /* Confirmation */

    confirmation: false,
  });

  /* =========================================================
     FILE STATE
  ========================================================= */

  const [files, setFiles] =
    useState<FileState>({
      transcript: null,
      entranceResult: null,
      governmentId: null,
      graduationDocument: null,
      cv: null,
    });

  /* =========================================================
     FIELD HELPERS
  ========================================================= */

  function updateField(
    field: keyof typeof form,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    /*
      Changing the email invalidates the previous
      verification.
    */

    if (field === "email") {
      setEmailVerified(false);
      setCodeSent(false);
      setEmailCode("");
    }

    /*
      Changing tutor status should clear fields that
      no longer apply.
    */

    if (
      field === "tutorStatus" &&
      value === "STUDENT"
    ) {
      setForm((previous) => ({
        ...previous,
        fieldOfGraduation: "",
        universityGraduatedFrom: "",
        CGPA: "",
        employmentStatus: "",
        currentJob: "",
      }));
    }

    if (
      field === "tutorStatus" &&
      value === "GRADUATE"
    ) {
      setForm((previous) => ({
        ...previous,
        university: "",
        department: "",
        currentYear: "",
        currentGPA: "",
      }));
    }

    /*
      Clear current job if employment status does not
      require it.
    */

    if (
      field === "employmentStatus" &&
      value !== "EMPLOYED" &&
      value !== "SELF_EMPLOYED"
    ) {
      setForm((previous) => ({
        ...previous,
        currentJob: "",
      }));
    }

    if (error) {
      setError("");
    }
  }

  /* =========================================================
     PHONE HELPERS
  ========================================================= */

  function handlePhoneChange(value: string) {
    /*
      The user enters only the 9 digits after +251.

      Example:

      UI:
      +251 | 912345678

      Stored in form:
      912345678

      API receives:
      912345678

      The backend should canonicalize it to its
      database format.
    */

    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("251")) {
      digits = digits.slice(3);
    }

    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    digits = digits.slice(0, 9);

    updateField("phone", digits);
  }

  function isValidEthiopianPhone(
    phone: string
  ) {
    /*
      Ethiopian mobile numbers:

      9XXXXXXXX

      Exactly 9 digits and begins with 9.
    */

    return /^9\d{8}$/.test(phone);
  }

  /* =========================================================
     EMAIL HELPERS
  ========================================================= */

  function isValidEmail(email: string) {
    /*
      This validates the structure of the email.

      Real existence is confirmed through the
      verification-code process.
    */

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    );
  }

  /* =========================================================
     EMAIL VERIFICATION
  ========================================================= */

  async function sendEmailCode() {
    const email = form.email
      .trim()
      .toLowerCase();

    if (!email) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!isValidEmail(email)) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    setSendingCode(true);
    setError("");

    try {
      const response = await fetch(
        "/api/auth/send-email-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to send verification code."
        );
      }

      setCodeSent(true);
      setEmailVerified(false);
      setEmailCode("");
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Unable to send verification code."
      );
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyEmailCode() {
    const email = form.email
      .trim()
      .toLowerCase();

    const code = emailCode.trim();

    if (!code) {
      setError(
        "Please enter the verification code."
      );
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        "Verification code must contain exactly 6 digits."
      );
      return;
    }

    setVerifyingCode(true);
    setError("");

    try {
      const response = await fetch(
        "/api/auth/verify-email-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Invalid verification code."
        );
      }

      setEmailVerified(true);
      setCodeSent(false);
      setEmailCode("");
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Invalid verification code."
      );
    } finally {
      setVerifyingCode(false);
    }
  }

  function changeEmail() {
    setEmailVerified(false);
    setCodeSent(false);
    setEmailCode("");
    setError("");
  }

  /* =========================================================
     FILE VALIDATION
  ========================================================= */

  function validateFile(
    file: File | null,
    options: {
      required?: boolean;
      maxSize: number;
      allowedTypes: string[];
      typeLabel: string;
    }
  ) {
    const {
      required = false,
      maxSize,
      allowedTypes,
      typeLabel,
    } = options;

    if (!file) {
      if (required) {
        return "This document is required.";
      }

      return "";
    }

    if (file.size <= 0) {
      return "The selected file is empty.";
    }

    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Please upload ${typeLabel}.`;
    }

    if (file.size > maxSize) {
      return `File must be ${
        maxSize / (1024 * 1024)
      }MB or smaller.`;
    }

    return "";
  }

  function handleFileChange(
    field: keyof FileState,
    file: File | null
  ) {
    setError("");

    const isCV = field === "cv";

    const isRequired =
      field === "transcript" ||
      field === "entranceResult" ||
      field === "governmentId" ||
      (field === "graduationDocument" &&
        form.tutorStatus === "GRADUATE");

    const validationError = validateFile(
      file,
      {
        required: isRequired,
        maxSize: isCV
          ? CV_MAX_SIZE
          : DOCUMENT_MAX_SIZE,
        allowedTypes: isCV
          ? ALLOWED_CV_TYPES
          : ALLOWED_DOCUMENT_TYPES,
        typeLabel: isCV
          ? "an image or PDF file"
          : "a JPG, JPEG, PNG, or WEBP image",
      }
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setFiles((previous) => ({
      ...previous,
      [field]: file,
    }));
  }

  /* =========================================================
     STEP VALIDATION
  ========================================================= */

  function validateStep(
    targetStep: Step
  ) {
    /* -------------------------------------------------------
       STEP 1 - ACCOUNT
    ------------------------------------------------------- */

    if (targetStep === 1) {
      if (
        form.fullName.trim().length < 2
      ) {
        return "Please enter your full name.";
      }

      const email = form.email
        .trim()
        .toLowerCase();

      if (!email) {
        return "Please enter your email address.";
      }

      if (!isValidEmail(email)) {
        return "Please enter a valid email address.";
      }

      if (!emailVerified) {
        return "Please verify your email address before continuing.";
      }

      if (
        !isValidEthiopianPhone(
          form.phone
        )
      ) {
        return "Please enter a valid Ethiopian mobile number.";
      }

      if (form.password.length < 8) {
        return "Password must contain at least 8 characters.";
      }

      if (
        form.password !==
        form.confirmPassword
      ) {
        return "Passwords do not match.";
      }
    }

    /* -------------------------------------------------------
       STEP 2 - PERSONAL
    ------------------------------------------------------- */

    if (targetStep === 2) {
      if (!form.gender) {
        return "Please select your gender.";
      }

      if (
        !["MALE", "FEMALE"].includes(
          form.gender
        )
      ) {
        return "Please select a valid gender.";
      }

      if (!form.city.trim()) {
        return "Please enter your city.";
      }

      if (!form.subcity.trim()) {
        return "Please enter your subcity.";
      }

      if (!form.exactPlace.trim()) {
        return "Please enter your exact place.";
      }

      if (!form.tutorStatus) {
        return "Please select your current status.";
      }

      if (
        !["STUDENT", "GRADUATE"].includes(
          form.tutorStatus
        )
      ) {
        return "Please select a valid current status.";
      }

      if (form.aboutMe.length > 500) {
        return "About Me must be 500 characters or fewer.";
      }
    }

    /* -------------------------------------------------------
       STEP 3 - EDUCATION
    ------------------------------------------------------- */

    if (targetStep === 3) {
      /* STUDENT */

      if (
        form.tutorStatus ===
        "STUDENT"
      ) {
        if (
          !form.university.trim()
        ) {
          return "Please enter your university or college.";
        }

        if (
          !form.department.trim()
        ) {
          return "Please enter your department.";
        }

        if (!form.currentYear) {
          return "Please select your current year.";
        }

        const gpa = Number(
          form.currentGPA
        );

        if (
          !Number.isFinite(gpa) ||
          gpa < 0 ||
          gpa > 4
        ) {
          return "Current GPA must be between 0 and 4.";
        }
      }

      /* GRADUATE */

      if (
        form.tutorStatus ===
        "GRADUATE"
      ) {
        if (
          !form.fieldOfGraduation.trim()
        ) {
          return "Please enter your field of graduation.";
        }

        if (
          !form.universityGraduatedFrom.trim()
        ) {
          return "Please enter your university.";
        }

        const cgpa = Number(
          form.CGPA
        );

        if (
          !Number.isFinite(cgpa) ||
          cgpa < 0 ||
          cgpa > 4
        ) {
          return "CGPA must be between 0 and 4.";
        }

        if (!form.employmentStatus) {
          return "Please select your employment status.";
        }

        if (
          ![
            "EMPLOYED",
            "SELF_EMPLOYED",
            "UNEMPLOYED",
            "OTHER",
          ].includes(
            form.employmentStatus
          )
        ) {
          return "Please select a valid employment status.";
        }

        if (
          form.employmentStatus ===
            "EMPLOYED" ||
          form.employmentStatus ===
            "SELF_EMPLOYED"
        ) {
          if (
            !form.currentJob.trim()
          ) {
            return "Please enter your current job.";
          }
        }
      }
    }

    /* -------------------------------------------------------
       STEP 4 - ENTRANCE + DOCUMENTS
    ------------------------------------------------------- */

    if (targetStep === 4) {
      const score = Number(
        form.entranceScore
      );

      const total = Number(
        form.entranceTotal
      );

      if (
        form.entranceScore.trim() ===
        ""
      ) {
        return "Please enter your entrance score.";
      }

      if (
        !Number.isFinite(score)
      ) {
        return "Please enter a valid entrance score.";
      }

      if (
        ![600, 700].includes(total)
      ) {
        return "Entrance total must be either 600 or 700.";
      }

      if (
        score < 0 ||
        score > total
      ) {
        return "Entrance score must be between 0 and the selected total.";
      }

      /* Transcript */

      if (!files.transcript) {
        return "Please upload your transcript.";
      }

      const transcriptError =
        validateFile(
          files.transcript,
          {
            required: true,
            maxSize:
              DOCUMENT_MAX_SIZE,
            allowedTypes:
              ALLOWED_DOCUMENT_TYPES,
            typeLabel:
              "a JPG, JPEG, PNG, or WEBP image",
          }
        );

      if (transcriptError) {
        return `Transcript: ${transcriptError}`;
      }

      /* Entrance result */

      if (!files.entranceResult) {
        return "Please upload your entrance result.";
      }

      const entranceResultError =
        validateFile(
          files.entranceResult,
          {
            required: true,
            maxSize:
              DOCUMENT_MAX_SIZE,
            allowedTypes:
              ALLOWED_DOCUMENT_TYPES,
            typeLabel:
              "a JPG, JPEG, PNG, or WEBP image",
          }
        );

      if (entranceResultError) {
        return `Entrance result: ${entranceResultError}`;
      }

      /* Government ID */

      if (!files.governmentId) {
        return "Please upload your government ID.";
      }

      const governmentIdError =
        validateFile(
          files.governmentId,
          {
            required: true,
            maxSize:
              DOCUMENT_MAX_SIZE,
            allowedTypes:
              ALLOWED_DOCUMENT_TYPES,
            typeLabel:
              "a JPG, JPEG, PNG, or WEBP image",
          }
        );

      if (governmentIdError) {
        return `Government ID: ${governmentIdError}`;
      }

      /* Graduation document */

      if (
        form.tutorStatus ===
        "GRADUATE"
      ) {
        if (
          !files.graduationDocument
        ) {
          return "Please upload your graduation document (Temporary or Original).";
        }

        const graduationError =
          validateFile(
            files.graduationDocument,
            {
              required: true,
              maxSize:
                DOCUMENT_MAX_SIZE,
              allowedTypes:
                ALLOWED_DOCUMENT_TYPES,
              typeLabel:
                "a JPG, JPEG, PNG, or WEBP image",
            }
          );

        if (graduationError) {
          return `Graduation document: ${graduationError}`;
        }
      }

      /* CV */

      if (files.cv) {
        const cvError =
          validateFile(files.cv, {
            required: false,
            maxSize: CV_MAX_SIZE,
            allowedTypes:
              ALLOWED_CV_TYPES,
            typeLabel:
              "an image or PDF file",
          });

        if (cvError) {
          return `CV / Resume: ${cvError}`;
        }
      }
    }

    /* -------------------------------------------------------
       STEP 5 - CONFIRMATION
    ------------------------------------------------------- */

    if (targetStep === 5) {
      if (!emailVerified) {
        return "Your email address must be verified before creating your account.";
      }

      if (!form.confirmation) {
        return "Please confirm that the information you provided is accurate.";
      }
    }

    return "";
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function nextStep() {
    const validationError =
      validateStep(step);

    setError(validationError);

    if (validationError) {
      return;
    }

    if (step < 5) {
      setStep(
        (step + 1) as Step
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  function previousStep() {
    setError("");

    if (step > 1) {
      setStep(
        (step - 1) as Step
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  /* =========================================================
     SUBMIT
  ========================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const validationError =
      validateStep(5);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!emailVerified) {
      setError(
        "Your email address must be verified before creating your account."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData =
        new FormData();

      /* -----------------------------------------------
         ACCOUNT
      ------------------------------------------------ */

      formData.append(
        "fullName",
        form.fullName.trim()
      );

      formData.append(
        "email",
        form.email
          .trim()
          .toLowerCase()
      );

      /*
        Send the 9-digit local number.

        Example:
        912345678

        The backend is responsible for
        canonicalizing the database value.
      */

      formData.append(
        "phone",
        form.phone
      );

      formData.append(
        "password",
        form.password
      );

      formData.append(
        "confirmPassword",
        form.confirmPassword
      );

      /* -----------------------------------------------
         PERSONAL
      ------------------------------------------------ */

      formData.append(
        "gender",
        form.gender
      );

      formData.append(
        "city",
        form.city.trim()
      );

      formData.append(
        "subcity",
        form.subcity.trim()
      );

      formData.append(
        "exactPlace",
        form.exactPlace.trim()
      );

      formData.append(
        "aboutMe",
        form.aboutMe.trim()
      );

      formData.append(
        "tutorStatus",
        form.tutorStatus
      );

      /* -----------------------------------------------
         STUDENT
      ------------------------------------------------ */

      if (
        form.tutorStatus ===
        "STUDENT"
      ) {
        formData.append(
          "university",
          form.university.trim()
        );

        formData.append(
          "department",
          form.department.trim()
        );

        formData.append(
          "currentYear",
          form.currentYear
        );

        formData.append(
          "currentGPA",
          form.currentGPA
        );
      }

      /* -----------------------------------------------
         GRADUATE
      ------------------------------------------------ */

      if (
        form.tutorStatus ===
        "GRADUATE"
      ) {
        formData.append(
          "fieldOfGraduation",
          form.fieldOfGraduation.trim()
        );

        formData.append(
          "universityGraduatedFrom",
          form.universityGraduatedFrom.trim()
        );

        formData.append(
          "CGPA",
          form.CGPA
        );

        formData.append(
          "employmentStatus",
          form.employmentStatus
        );

        /*
          Current job is only submitted for:

          EMPLOYED
          SELF_EMPLOYED
        */

        if (
          form.employmentStatus ===
            "EMPLOYED" ||
          form.employmentStatus ===
            "SELF_EMPLOYED"
        ) {
          formData.append(
            "currentJob",
            form.currentJob.trim()
          );
        }
      }

      /* -----------------------------------------------
         ENTRANCE RESULT
      ------------------------------------------------ */

      formData.append(
        "entranceScore",
        form.entranceScore
      );

      formData.append(
        "entranceTotal",
        form.entranceTotal
      );

      /*
        IMPORTANT:
        We intentionally do NOT send or display
        entrance percentage.

        The backend calculates and stores it.
      */

      /* -----------------------------------------------
         DOCUMENTS
      ------------------------------------------------ */

      if (files.transcript) {
        formData.append(
          "transcript",
          files.transcript
        );
      }

      if (files.entranceResult) {
        formData.append(
          "entranceResult",
          files.entranceResult
        );
      }

      if (files.governmentId) {
        formData.append(
          "governmentId",
          files.governmentId
        );
      }

      if (
        files.graduationDocument
      ) {
        formData.append(
          "graduationDocument",
          files.graduationDocument
        );
      }

      if (files.cv) {
        formData.append(
          "cv",
          files.cv
        );
      }

      /* -----------------------------------------------
         API REQUEST
      ------------------------------------------------ */

      const response =
        await fetch(
          "/api/auth/register",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Registration failed."
        );
      }

      router.push(
        "/login?registered=1"
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10">
        <div className="w-full overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="border-b border-slate-200 px-6 py-8 sm:px-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
              >
                <ArrowLeft size={16} />
                Back to home
              </Link>

              <Link
                href="/login"
                className="text-sm font-semibold text-slate-900 hover:underline"
              >
                Already have an account?
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <UserPlus size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Become a Tutor
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Create your Excellence Tutor account.
                </p>
              </div>
            </div>

            {/* Progress */}

            <div className="mt-8">
              <div className="mb-3 flex justify-between text-xs font-semibold text-slate-500">
                <span>
                  Step {step} of 5
                </span>

                <span>
                  {step === 1 &&
                    "Account"}

                  {step === 2 &&
                    "Personal"}

                  {step === 3 &&
                    "Education"}

                  {step === 4 &&
                    "Entrance & Documents"}

                  {step === 5 &&
                    "Confirmation"}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all duration-300"
                  style={{
                    width: `${
                      step * 20
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="px-6 py-8 sm:px-10"
          >

            {/* =================================================
                STEP 1 - ACCOUNT
            ================================================= */}

            {step === 1 && (
              <section className="space-y-6">
                <SectionHeading
                  title="Create your account"
                  description="Create your account using an email you can access and an Ethiopian mobile number."
                />

                <div className="grid gap-5 sm:grid-cols-2">

                  {/* Full name */}

                  <Field
                    label="Full name"
                    required
                    value={
                      form.fullName
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "fullName",
                        value
                      )
                    }
                    placeholder="e.g. Abebe Kebede"
                  />

                  {/* Email */}

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Email address
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          value={
                            form.email
                          }
                          onChange={(
                            event
                          ) =>
                            updateField(
                              "email",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="you@example.com"
                          disabled={
                            emailVerified
                          }
                          className={`w-full rounded-xl border bg-white px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 ${
                            emailVerified
                              ? "border-green-300 bg-green-50 text-green-900"
                              : "border-slate-300 focus:border-slate-900"
                          }`}
                        />

                        {emailVerified && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                            <Check
                              size={20}
                            />
                          </div>
                        )}
                      </div>

                      {!emailVerified && (
                        <button
                          type="button"
                          onClick={
                            sendEmailCode
                          }
                          disabled={
                            sendingCode ||
                            !form.email.trim()
                          }
                          className="inline-flex min-w-37.5 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sendingCode ? (
                            <>
                              <Loader2
                                size={
                                  17
                                }
                                className="animate-spin"
                              />
                              Sending...
                            </>
                          ) : codeSent ? (
                            "Resend code"
                          ) : (
                            "Verify email"
                          )}
                        </button>
                      )}
                    </div>

                    {emailVerified ? (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                          <Check
                            size={15}
                          />
                          Email address verified successfully.
                        </div>

                        <button
                          type="button"
                          onClick={
                            changeEmail
                          }
                          className="text-xs font-semibold text-slate-600 hover:text-slate-950 hover:underline"
                        >
                          Change email
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-slate-400">
                        We will send a
                        6-digit
                        verification
                        code to this
                        email address.
                      </p>
                    )}
                  </div>

                  {/* Verification code */}

                  {codeSent &&
                    !emailVerified && (
                      <div className="sm:col-span-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <div className="mb-4">
                            <h3 className="font-bold text-slate-950">
                              Verify your email
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                              We sent a
                              6-digit
                              verification
                              code to{" "}
                              <span className="font-semibold text-slate-700">
                                {
                                  form.email
                                }
                              </span>
                              .
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={
                                6
                              }
                              value={
                                emailCode
                              }
                              onChange={(
                                event
                              ) => {
                                const digits =
                                  event.target.value
                                    .replace(
                                      /\D/g,
                                      ""
                                    )
                                    .slice(
                                      0,
                                      6
                                    );

                                setEmailCode(
                                  digits
                                );
                                setError(
                                  ""
                                );
                              }}
                              placeholder="Enter 6-digit code"
                              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.35em] outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                            />

                            <button
                              type="button"
                              onClick={
                                verifyEmailCode
                              }
                              disabled={
                                verifyingCode ||
                                emailCode.length !==
                                  6
                              }
                              className="inline-flex min-w-32.5 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {verifyingCode ? (
                                <>
                                  <Loader2
                                    size={
                                      17
                                    }
                                    className="animate-spin"
                                  />
                                  Checking...
                                </>
                              ) : (
                                <>
                                  <Check
                                    size={
                                      17
                                    }
                                  />
                                  Verify
                                </>
                              )}
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>
                              Didn't receive
                              the code?
                              Check your
                              spam folder.
                            </span>

                            <button
                              type="button"
                              onClick={
                                sendEmailCode
                              }
                              disabled={
                                sendingCode
                              }
                              className="font-semibold text-slate-900 hover:underline disabled:opacity-50"
                            >
                              {sendingCode
                                ? "Sending..."
                                : "Send code again"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Phone */}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Phone number
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
                      <div className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                        +251
                      </div>

                      <input
                        type="tel"
                        inputMode="numeric"
                        value={
                          form.phone
                        }
                        onChange={(
                          event
                        ) =>
                          handlePhoneChange(
                            event.target
                              .value
                          )
                        }
                        placeholder="912345678"
                        maxLength={
                          9
                        }
                        className="w-full px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <p className="mt-1.5 text-xs text-slate-400">
                      Enter exactly 9 digits
                      after +251.
                    </p>
                  </div>

                  {/* Password */}

                  <PasswordField
                    label="Password"
                    required
                    value={
                      form.password
                    }
                    show={
                      showPassword
                    }
                    onToggle={() =>
                      setShowPassword(
                        (value) =>
                          !value
                      )
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "password",
                        value
                      )
                    }
                  />

                  {/* Confirm password */}

                  <div className="sm:col-span-2">
                    <PasswordField
                      label="Confirm password"
                      required
                      value={
                        form.confirmPassword
                      }
                      show={
                        showConfirmPassword
                      }
                      onToggle={() =>
                        setShowConfirmPassword(
                          (value) =>
                            !value
                        )
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "confirmPassword",
                          value
                        )
                      }
                    />
                  </div>
                </div>
              </section>
            )}

            {/* =================================================
                STEP 2 - PERSONAL
            ================================================= */}

            {step === 2 && (
              <section className="space-y-6">
                <SectionHeading
                  title="Personal information"
                  description="Tell us a little about yourself and where you are based."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField
                    label="Gender"
                    required
                    value={
                      form.gender
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "gender",
                        value
                      )
                    }
                    options={[
                      {
                        value:
                          "MALE",
                        label:
                          "Male",
                      },
                      {
                        value:
                          "FEMALE",
                        label:
                          "Female",
                      },
                    ]}
                  />

                  <Field
                    label="City"
                    required
                    value={
                      form.city
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "city",
                        value
                      )
                    }
                    placeholder="Addis Ababa"
                  />

                  <Field
                    label="Subcity"
                    required
                    value={
                      form.subcity
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "subcity",
                        value
                      )
                    }
                    placeholder="e.g. Bole"
                  />

                  <Field
                    label="Exact place"
                    required
                    value={
                      form.exactPlace
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "exactPlace",
                        value
                      )
                    }
                    placeholder="e.g. Ayat, Piassa"
                  />

                  <div className="sm:col-span-2">
                    <SelectField
                      label="Current status"
                      required
                      value={
                        form.tutorStatus
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "tutorStatus",
                          value
                        )
                      }
                      options={[
                        {
                          value:
                            "STUDENT",
                          label:
                            "Student",
                        },
                        {
                          value:
                            "GRADUATE",
                          label:
                            "Graduate",
                        },
                      ]}
                    />
                  </div>

                  {/* About Me */}

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      About Me
                    </label>

                    <textarea
                      value={
                        form.aboutMe
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "aboutMe",
                          event
                            .target
                            .value
                        )
                      }
                      maxLength={
                        500
                      }
                      rows={5}
                      placeholder="Briefly introduce yourself, your strengths, teaching interests, or experience..."
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />

                    <div className="mt-1 flex justify-end text-xs text-slate-400">
                      {
                        form.aboutMe
                          .length
                      }
                      /500
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* =================================================
                STEP 3 - EDUCATION
            ================================================= */}

            {step === 3 && (
              <section className="space-y-6">
                <SectionHeading
                  title={
                    form.tutorStatus ===
                    "STUDENT"
                      ? "Education information"
                      : "Graduation & employment"
                  }
                  description={
                    form.tutorStatus ===
                    "STUDENT"
                      ? "Provide your current academic information."
                      : "Provide your academic background and current employment information."
                  }
                />

                {/* STUDENT */}

                {form.tutorStatus ===
                  "STUDENT" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="University / College"
                      required
                      value={
                        form.university
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "university",
                          value
                        )
                      }
                      placeholder="University name"
                    />

                    <Field
                      label="Department"
                      required
                      value={
                        form.department
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "department",
                          value
                        )
                      }
                      placeholder="e.g. Accounting, Computer Science"
                    />

                    <SelectField
                      label="Current year"
                      required
                      value={
                        form.currentYear
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "currentYear",
                          value
                        )
                      }
                      options={[
                        {
                          value:
                            "1",
                          label:
                            "1st Year",
                        },
                        {
                          value:
                            "2",
                          label:
                            "2nd Year",
                        },
                        {
                          value:
                            "3",
                          label:
                            "3rd Year",
                        },
                        {
                          value:
                            "4",
                          label:
                            "4th Year",
                        },
                        {
                          value:
                            "5",
                          label:
                            "5th Year or above",
                        },
                      ]}
                    />

                    <Field
                      label="Current GPA"
                      type="number"
                      required
                      value={
                        form.currentGPA
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "currentGPA",
                          value
                        )
                      }
                      placeholder="0.00 - 4.00"
                    />
                  </div>
                )}

                {/* GRADUATE */}

                {form.tutorStatus ===
                  "GRADUATE" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Field of graduation"
                      required
                      value={
                        form.fieldOfGraduation
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "fieldOfGraduation",
                          value
                        )
                      }
                      placeholder="e.g. Accounting, Computer Science"
                    />

                    <Field
                      label="University graduated from"
                      required
                      value={
                        form.universityGraduatedFrom
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "universityGraduatedFrom",
                          value
                        )
                      }
                      placeholder="University name"
                    />

                    <Field
                      label="CGPA"
                      type="number"
                      required
                      value={
                        form.CGPA
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "CGPA",
                          value
                        )
                      }
                      placeholder="0.00 - 4.00"
                    />

                    <SelectField
                      label="Employment status"
                      required
                      value={
                        form.employmentStatus
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "employmentStatus",
                          value
                        )
                      }
                      options={[
                        {
                          value:
                            "EMPLOYED",
                          label:
                            "Employed",
                        },
                        {
                          value:
                            "SELF_EMPLOYED",
                          label:
                            "Self-employed",
                        },
                        {
                          value:
                            "UNEMPLOYED",
                          label:
                            "Unemployed",
                        },
                        {
                          value:
                            "OTHER",
                          label:
                            "Other",
                        },
                      ]}
                    />

                    {/* Current job */}

                    {(form.employmentStatus ===
                      "EMPLOYED" ||
                      form.employmentStatus ===
                        "SELF_EMPLOYED") && (
                      <div className="sm:col-span-2">
                        <Field
                          label="Current job"
                          required
                          value={
                            form.currentJob
                          }
                          onChange={(
                            value
                          ) =>
                            updateField(
                              "currentJob",
                              value
                            )
                          }
                          placeholder="Your current job / occupation"
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* =================================================
                STEP 4 - ENTRANCE & DOCUMENTS
            ================================================= */}

            {step === 4 && (
              <section className="space-y-8">
                <SectionHeading
                  title="Entrance result & documents"
                  description="Enter your entrance result and upload the required documents."
                />

                {/* Entrance */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="mb-4 font-bold text-slate-950">
                    Entrance Result
                  </h3>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Field
                        label="Score"
                        type="number"
                        required
                        value={
                          form.entranceScore
                        }
                        onChange={(
                          value
                        ) =>
                          updateField(
                            "entranceScore",
                            value
                          )
                        }
                        placeholder="e.g. 520"
                      />

                      <p className="mt-1.5 text-xs text-slate-400">
                        Enter your actual entrance examination score.
                      </p>
                    </div>

                    <SelectField
                      label="Out of"
                      required
                      value={
                        form.entranceTotal
                      }
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "entranceTotal",
                          value
                        )
                      }
                      options={[
                        {
                          value:
                            "600",
                          label:
                            "600",
                        },
                        {
                          value:
                            "700",
                          label:
                            "700",
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Documents */}

                <div>
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-950">
                      Required Documents
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Upload clear, readable images of
                      your required documents. Each
                      required document must be 2MB or
                      smaller.
                    </p>
                  </div>

                  <div className="grid gap-4">

                    {/* Transcript */}

                    <FileUpload
                      label="Transcript"
                      required
                      file={
                        files.transcript
                      }
                      accept={
                        DOCUMENT_ACCEPT
                      }
                      hint="JPG, JPEG, PNG or WEBP — max 2MB"
                      onChange={(
                        file
                      ) =>
                        handleFileChange(
                          "transcript",
                          file
                        )
                      }
                    />

                    {/* Entrance Result */}

                    <FileUpload
                      label="Entrance Result"
                      required
                      file={
                        files.entranceResult
                      }
                      accept={
                        DOCUMENT_ACCEPT
                      }
                      hint="JPG, JPEG, PNG or WEBP — max 2MB"
                      onChange={(
                        file
                      ) =>
                        handleFileChange(
                          "entranceResult",
                          file
                        )
                      }
                    />

                    {/* Government ID */}

                    <FileUpload
                      label="Government ID"
                      required
                      file={
                        files.governmentId
                      }
                      accept={
                        DOCUMENT_ACCEPT
                      }
                      hint="JPG, JPEG, PNG or WEBP — max 2MB"
                      onChange={(
                        file
                      ) =>
                        handleFileChange(
                          "governmentId",
                          file
                        )
                      }
                    />

                    {/* Graduation Document */}

                    {form.tutorStatus ===
                      "GRADUATE" && (
                      <FileUpload
                        label="Graduation Document"
                        required
                        file={
                          files.graduationDocument
                        }
                        accept={
                          DOCUMENT_ACCEPT
                        }
                        hint="Temporary or Original — JPG, JPEG, PNG or WEBP — max 2MB"
                        onChange={(
                          file
                        ) =>
                          handleFileChange(
                            "graduationDocument",
                            file
                          )
                        }
                      />
                    )}

                    {/* CV */}

                    <FileUpload
                      label="CV / Resume"
                      file={
                        files.cv
                      }
                      accept={
                        CV_ACCEPT
                      }
                      hint="Optional — JPG, JPEG, PNG, WEBP or PDF — max 5MB"
                      onChange={(
                        file
                      ) =>
                        handleFileChange(
                          "cv",
                          file
                        )
                      }
                    />
                  </div>
                </div>
              </section>
            )}

            {/* =================================================
                STEP 5 - CONFIRMATION
            ================================================= */}

            {step === 5 && (
              <section className="space-y-6">
                <SectionHeading
                  title="Review & confirm"
                  description="Please make sure your information is accurate before creating your account."
                />

                <div className="grid gap-4 sm:grid-cols-2">

                  <SummaryItem
                    label="Full name"
                    value={
                      form.fullName
                    }
                  />

                  {/* Email */}

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Email
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="break-all">
                        {
                          form.email
                        }
                      </span>

                      {emailVerified && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          <Check
                            size={
                              12
                            }
                          />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <SummaryItem
                    label="Phone"
                    value={`+251 ${form.phone}`}
                  />

                  <SummaryItem
                    label="Gender"
                    value={
                      form.gender ===
                      "MALE"
                        ? "Male"
                        : "Female"
                    }
                  />

                  <SummaryItem
                    label="Location"
                    value={`${form.city}, ${form.subcity}, ${form.exactPlace}`}
                  />

                  <SummaryItem
                    label="Status"
                    value={
                      form.tutorStatus ===
                      "STUDENT"
                        ? "Student"
                        : "Graduate"
                    }
                  />

                  {/* About Me */}

                  {form.aboutMe && (
                    <div className="sm:col-span-2">
                      <SummaryItem
                        label="About Me"
                        value={
                          form.aboutMe
                        }
                      />
                    </div>
                  )}

                  {/* Student */}

                  {form.tutorStatus ===
                    "STUDENT" && (
                    <>
                      <SummaryItem
                        label="University"
                        value={
                          form.university
                        }
                      />

                      <SummaryItem
                        label="Department"
                        value={
                          form.department
                        }
                      />

                      <SummaryItem
                        label="Current year"
                        value={
                          form.currentYear
                        }
                      />

                      <SummaryItem
                        label="Current GPA"
                        value={
                          form.currentGPA
                        }
                      />
                    </>
                  )}

                  {/* Graduate */}

                  {form.tutorStatus ===
                    "GRADUATE" && (
                    <>
                      <SummaryItem
                        label="Field of graduation"
                        value={
                          form.fieldOfGraduation
                        }
                      />

                      <SummaryItem
                        label="University"
                        value={
                          form.universityGraduatedFrom
                        }
                      />

                      <SummaryItem
                        label="CGPA"
                        value={
                          form.CGPA
                        }
                      />

                      <SummaryItem
                        label="Employment"
                        value={
                          form.employmentStatus
                        }
                      />

                      {(form.employmentStatus ===
                        "EMPLOYED" ||
                        form.employmentStatus ===
                          "SELF_EMPLOYED") && (
                        <SummaryItem
                          label="Current job"
                          value={
                            form.currentJob
                          }
                        />
                      )}
                    </>
                  )}

                  {/* Entrance */}

                  <SummaryItem
                    label="Entrance result"
                    value={`${form.entranceScore} / ${form.entranceTotal}`}
                  />

                  {/* Transcript */}

                  <SummaryItem
                    label="Transcript"
                    value={
                      files.transcript
                        ?.name ||
                      "Not uploaded"
                    }
                  />

                  {/* Entrance Result */}

                  <SummaryItem
                    label="Entrance result document"
                    value={
                      files.entranceResult
                        ?.name ||
                      "Not uploaded"
                    }
                  />

                  {/* Government ID */}

                  <SummaryItem
                    label="Government ID"
                    value={
                      files.governmentId
                        ?.name ||
                      "Not uploaded"
                    }
                  />

                  {/* Graduation */}

                  {form.tutorStatus ===
                    "GRADUATE" && (
                    <SummaryItem
                      label="Graduation document"
                      value={
                        files
                          .graduationDocument
                          ?.name ||
                        "Not uploaded"
                      }
                    />
                  )}

                  {/* CV */}

                  <SummaryItem
                    label="CV / Resume"
                    value={
                      files.cv?.name ||
                      "Not uploaded"
                    }
                  />
                </div>

                {/* Confirmation */}

                <label className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={
                      form.confirmation
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "confirmation",
                        event.target
                          .checked
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm leading-6 text-slate-700">
                    I confirm that the
                    information I have
                    provided is accurate and
                    complete. I understand that
                    Excellence Tutor may review
                    my information and documents
                    before accepting me as a
                    tutor.
                  </span>
                </label>
              </section>
            )}

            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            {/* =================================================
                NAVIGATION
            ================================================= */}

            <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={
                    previousStep
                  }
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowLeft
                    size={17}
                  />
                  Previous
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={
                    nextStep
                  }
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                  <ArrowRight
                    size={17}
                  />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !form.confirmation ||
                    !emailVerified
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <Check
                        size={17}
                      />
                      Create Tutor Account
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-950">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   TEXT FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        min={
          type === "number"
            ? 0
            : undefined
        }
        max={
          type === "number"
            ? 4
            : undefined
        }
        step={
          type === "number"
            ? "0.01"
            : undefined
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
      />
    </div>
  );
}

/* =========================================================
   PASSWORD FIELD
========================================================= */

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <input
          type={
            show
              ? "text"
              : "password"
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          aria-label={
            show
              ? "Hide password"
              : "Show password"
          }
        >
          {show ? (
            <EyeOff
              size={18}
            />
          ) : (
            <Eye
              size={18}
            />
          )}
        </button>
      </div>

      {label ===
        "Password" && (
        <p className="mt-1.5 text-xs text-slate-400">
          Minimum 8 characters.
        </p>
      )}
    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
      >
        <option value="">
          Select...
        </option>

        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          )
        )}
      </select>
    </div>
  );
}

/* =========================================================
   FILE UPLOAD
========================================================= */

function FileUpload({
  label,
  file,
  accept,
  onChange,
  required = false,
  hint,
}: {
  label: string;
  file: File | null;
  accept: string;
  onChange: (
    file: File | null
  ) => void;
  required?: boolean;
  hint: string;
}) {
  return (
    <label className="group block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-slate-500 hover:bg-slate-100">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
          {file ? (
            <Check
              size={19}
            />
          ) : (
            <Upload
              size={19}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900">
            {label}

            {required && (
              <span className="ml-1 text-red-500">
                *
              </span>
            )}
          </div>

          <div className="mt-1 truncate text-xs text-slate-500">
            {file
              ? file.name
              : hint}
          </div>

          {file && (
            <div className="mt-1 text-xs font-medium text-green-600">
              {(
                file.size /
                (1024 * 1024)
              ).toFixed(2)}{" "}
              MB
            </div>
          )}
        </div>

        <FileText
          size={18}
          className="text-slate-400"
        />
      </div>

      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(
          event
        ) => {
          const selectedFile =
            event.target.files?.[0] ||
            null;

          onChange(
            selectedFile
          );

          /*
            Allows the same file to be
            selected again after an error.
          */

          event.target.value =
            "";
        }}
      />
    </label>
  );
}

/* =========================================================
   SUMMARY ITEM
========================================================= */

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 wrap-words text-sm font-semibold text-slate-900">
        {value ||
          "Not provided"}
      </div>
    </div>
  );
}

