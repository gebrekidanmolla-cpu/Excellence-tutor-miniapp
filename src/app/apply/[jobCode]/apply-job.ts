import { cache } from "react";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatSalary } from "@/lib/format";
import {
  OPEN_GRAPH_DEFAULTS,
  SITE_LOGO_URL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

/** The job columns both `/apply` renderings read. */
export const APPLY_JOB_SELECT = {
  id: true,
  jobCode: true,
  gender: true,
  grade: true,
  subject: true,
  place: true,
  salary: true,
  status: true,
  additionalDetails: true,
  createdAt: true,
} satisfies Prisma.JobSelect;

export type ApplyJob = Prisma.JobGetPayload<{
  select: typeof APPLY_JOB_SELECT;
}>;

/**
 * Both `generateMetadata` and the page call this; `cache` hands the second
 * caller the first one's result, so the metadata costs no extra query.
 */
export const findApplyJob = cache((jobCode: string) =>
  prisma.job.findUnique({
    where: { jobCode },
    select: APPLY_JOB_SELECT,
  })
);

/** Admins type "8" and "3 & 8" as often as "Grade 8" or "KG". */
function gradeLabel(grade: string): string {
  const value = grade.trim();
  return /^\d/.test(value) ? `Grade ${value}` : value;
}

/** "All" on its own means every subject. */
function subjectLabel(subject: string): string {
  const value = subject.trim();
  return /^all$/i.test(value) ? "All subjects" : value;
}

/** "Grade 3 & 8, All subjects" */
function jobSummary(job: ApplyJob): string {
  return [gradeLabel(job.grade), subjectLabel(job.subject)]
    .filter(Boolean)
    .join(", ");
}

/** Search results cut a description off around 160 characters anyway. */
function clip(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max - 1))}…`;
}

/**
 * The job page's title, description and indexing rule. The page's own
 * `<h1>` is the generic "Tutor application", so the title is what tells a
 * search result — or a link preview in a chat — which job this is.
 */
export function applyJobMetadata(job: ApplyJob | null): Metadata {
  // The page answers with `notFound()`, whose 404 carries its own `noindex`.
  if (!job) {
    return {};
  }

  const place = job.place.trim();
  const summary = jobSummary(job);
  const path = `/apply/${job.jobCode}`;

  const title = place
    ? `Tutor job in ${place}: ${summary}`
    : `Tutor job: ${summary}`;

  // One line, ending like a sentence: it is appended after the others.
  const details = job.additionalDetails
    ?.trim()
    .replace(/\s+/g, " ")
    .replace(/([^.!?])$/, "$1.");

  const description =
    job.status === "OPEN"
      ? clip(
          [
            `Home tutoring job ${job.jobCode}${place ? ` in ${place}` : ""}: ${summary}.`,
            `Monthly salary ${formatSalary(job.salary)}.`,
            `Apply with your ${SITE_NAME} profile.`,
            details,
          ]
            .filter(Boolean)
            .join(" ")
        )
      : `Tutoring job ${job.jobCode} is closed and no longer accepting applications. See the open home tutoring jobs on ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH_DEFAULTS, title, description, url: path },
    // A filled job is a dead end for someone arriving from a search, so it
    // leaves the index. Closing a job refreshes the cached guest copy
    // (`refreshPublicJobPages`), so crawlers see this on their next visit.
    ...(job.status === "OPEN" ? {} : { robots: { index: false, follow: true } }),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * `JobPosting` structured data, which is what lists a job in Google's job
 * search (available across Sub-Saharan Africa, Ethiopia included). Render it
 * only for an open job: Google's guidelines require the markup to go once a
 * position is filled.
 *
 * The tutor gender requirement stays on the page but out of the markup, so
 * job search never shows it as a hiring criterion out of context.
 */
export function jobPostingJsonLd(job: ApplyJob) {
  const place = job.place.trim();
  const details = job.additionalDetails?.trim();

  const facts = [
    ["Grade", gradeLabel(job.grade)],
    ["Subject", subjectLabel(job.subject)],
    ["Place", place],
    ["Monthly salary", formatSalary(job.salary)],
  ].filter(([, value]) => value);

  // Google requires the description as HTML.
  const description = [
    `<p>Home tutoring job ${escapeHtml(job.jobCode)}${place ? ` in ${escapeHtml(place)}` : ""}, posted by ${SITE_NAME}.</p>`,
    details ? `<p>${escapeHtml(details).replace(/\n/g, "<br>")}</p>` : "",
    `<ul>${facts.map(([label, value]) => `<li>${label}: ${escapeHtml(value)}</li>`).join("")}</ul>`,
    `<p>Sign in with your ${SITE_NAME} profile to apply.</p>`,
  ].join("");

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `Home tutor: ${jobSummary(job)}`,
    description,
    identifier: {
      "@type": "PropertyValue",
      name: SITE_NAME,
      value: job.jobCode,
    },
    datePosted: job.createdAt.toISOString(),
    employmentType: "PART_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_URL,
      logo: SITE_LOGO_URL,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(place ? { addressLocality: place } : {}),
        addressCountry: "ET",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "ETB",
      value: {
        "@type": "QuantitativeValue",
        value: job.salary,
        unitText: "MONTH",
      },
    },
    url: `${SITE_URL}/apply/${job.jobCode}`,
  };
}
