"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ApplicationSuccessContent() {
  const searchParams = useSearchParams();

  const jobCode = searchParams.get("jobCode");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">

          {/* Success Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Application Submitted Successfully
          </h1>

          {/* Description */}
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-600 sm:text-base">
            Thank you for applying to Excellence Tutor.
            We have received your application and will
            contact you if you are selected.
          </p>

          {/* Job Code */}
          {jobCode && (
            <div className="mt-6 rounded-2xl bg-gray-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Job Code
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                {jobCode}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <Link
              href="/jobs"
              className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Explore More Jobs
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Back to Home
            </Link>

          </div>

        </div>
      </div>
    </main>
  );
}