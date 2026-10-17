import { createHash } from "node:crypto";

import type { InlineKeyboardMarkup } from "@/lib/telegram";

// ==========================================
// TELEGRAM POST RENDERING
// ==========================================
//
// Turns a `Job` row into the exact text and inline keyboard that go
// into the channel.
//
// SERVER ONLY — it reads `node:crypto` and server env.
//
// The post is sent as PLAIN TEXT — no `parse_mode`. The format below
// carries no bold or italics, so there is nothing to gain from a
// markup mode, and a whole class of failure disappears with it: a
// subject like "Math & Physics <Advanced>" reaches the channel
// verbatim instead of risking a `can't parse entities` 400. If bold
// is ever wanted here, it has to come back together with escaping
// every interpolated field.
//
// The rendered post is a pure function of the row. Nothing is stored
// about "the open variant", so re-opening a job simply re-renders
// without the closed header and edits — the restore falls out for
// free instead of needing its own path.
//
// ==========================================

/** Bot API cap on `sendMessage.text`. */
const TELEGRAM_TEXT_LIMIT = 4096;

/** Headroom, so an off-by-a-few in the estimate can't cost a post. */
const SAFETY_MARGIN = 48;

/** Below this much room left, the details line is dropped entirely. */
const MIN_DETAILS_BUDGET = 40;

/** Printed on every post, under the job's own details. */
const CLOSING_LINE =
  "📖We need highly committed, punctual and talented tutor";

const OPEN_HEADER = "🟢 OPEN";
const CLOSED_HEADER = "Closed 🔐🔐🔐";

/** Starts the optional additional-details line. */
const DETAILS_PREFIX = "🚨 ";

export interface JobForChannelPost {
  jobCode: string;
  gender: "MALE" | "FEMALE" | "ANY";
  grade: string;
  subject: string;
  place: string;
  salary: number;
  daysPerWeek: number;
  hoursPerDay: number;
  additionalDetails: string | null;
  status: "OPEN" | "CLOSED";
}

export interface RenderedChannelPost {
  text: string;
  replyMarkup: InlineKeyboardMarkup | undefined;

  /** sha256 of text + markup. Short-circuits no-op edits. */
  contentHash: string;
}

// ==========================================
// CALL TO ACTION
// ==========================================

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

/**
 * Local base URLs are refused by default: a `http://localhost:3000`
 * button is a dead link for everyone reading the channel, and the
 * post is better off without one.
 *
 * `TELEGRAM_ALLOW_LOCAL_LINKS=true` opts out of that, for testing the
 * real end-to-end flow against a real channel from a dev machine.
 * Never set it in production.
 */
function allowLocalLinks(): boolean {
  return process.env.TELEGRAM_ALLOW_LOCAL_LINKS === "true";
}

/**
 * Where the "Apply Now" button points: the apply page for this job.
 * `/apply/<jobCode>` stays readable signed out and swaps its apply
 * button for a sign-in prompt, so one link serves both a tutor with
 * an account and someone arriving from the channel cold.
 *
 * Returns `null` rather than a placeholder when there is no usable
 * base URL — a post with no button beats a post with a broken one.
 */
export function buildJobApplyUrl(jobCode: string): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");

  if (!raw) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  if (isLocalHost(parsed.hostname)) {
    if (!allowLocalLinks()) {
      return null;
    }

    // Telegram validates inline-keyboard URLs and rejects the literal
    // hostname `localhost` outright — "inline keyboard button URL is
    // invalid: Wrong HTTP URL" — while accepting the loopback address
    // that resolves to the very same server. Verified against the live
    // API. Swapping it is the difference between a button that posts
    // and a post that fails.
    if (parsed.hostname === "localhost" || parsed.hostname === "0.0.0.0") {
      parsed.hostname = "127.0.0.1";
    }
  }

  const base = parsed.toString().replace(/\/+$/, "");

  return `${base}/apply/${jobCode}`;
}

/** Whether a post rendered right now would carry its apply button. */
export function canRenderApplyButton(): boolean {
  return buildJobApplyUrl("E0") !== null;
}

// ==========================================
// RENDERING
// ==========================================

function formatTutorType(gender: JobForChannelPost["gender"]): string {
  switch (gender) {
    case "FEMALE":
      return "Female Tutor";

    case "MALE":
      return "Male Tutor";

    case "ANY":
      return "Male/Female Tutor";

    default:
      return "Tutor";
  }
}

/** `3 days & 2:00 hour`, with half hours as `1:30`. */
function formatDuration(job: JobForChannelPost): string {
  const days = `${job.daysPerWeek} ${
    job.daysPerWeek === 1 ? "day" : "days"
  }`;

  const wholeHours = Math.floor(job.hoursPerDay);

  const minutes = Math.round((job.hoursPerDay - wholeHours) * 60);

  const hours = `${wholeHours}:${String(minutes).padStart(2, "0")}`;

  return `${days} & ${hours} hour`;
}

/**
 * Longest prefix of `raw` that fits `budget`, with an ellipsis when
 * it had to cut. Never splits a surrogate pair — a lone half is
 * invalid UTF-16 and Telegram rejects the whole message.
 */
function fit(raw: string, budget: number): string {
  const trimmed = raw.trim();

  if (trimmed.length <= budget) {
    return trimmed;
  }

  let cut = trimmed.slice(0, budget - 1);

  if (/[\uD800-\uDBFF]$/.test(cut)) {
    cut = cut.slice(0, -1);
  }

  return `${cut.trimEnd()}…`;
}

function hashContent(
  text: string,
  replyMarkup: InlineKeyboardMarkup | undefined
): string {
  return createHash("sha256")
    .update(text)
    .update("\u0000")
    .update(JSON.stringify(replyMarkup ?? null))
    .digest("hex")
    .slice(0, 32);
}

export function renderJobChannelPost(
  job: JobForChannelPost
): RenderedChannelPost {
  const isOpen = job.status === "OPEN";

  // The blank lines are load-bearing — this is the channel's
  // established layout, not incidental whitespace.
  const head = [
    isOpen ? OPEN_HEADER : CLOSED_HEADER,
    "",
    `     📖 ${formatTutorType(job.gender)} 📖`,
    "",
    `Job code: #${job.jobCode}`,
    "",
    "",
    `✅Grade : ${job.grade.trim()}`,
    `✅Place : ${job.place.trim()}`,
    `✅Subject : ${job.subject.trim()}`,
    `✅Duration : ${formatDuration(job)}`,
    `✅Salary : ${job.salary.toLocaleString("en-US")} ETB`,
    "",
    "",
  ];

  const tail = [CLOSING_LINE];

  const details = job.additionalDetails?.trim();

  if (details) {
    const budget =
      TELEGRAM_TEXT_LIMIT -
      [...head, ...tail].join("\n").length -
      DETAILS_PREFIX.length -
      SAFETY_MARGIN;

    if (budget >= MIN_DETAILS_BUDGET) {
      head.push(`${DETAILS_PREFIX}${fit(details, budget)}`, "");
    }
  }

  const text = [...head, ...tail].join("\n");

  const applyUrl = buildJobApplyUrl(job.jobCode);

  // A closed job keeps its post as a record but loses the call to
  // action — an apply button on a filled position wastes the reader's
  // time and ours.
  const replyMarkup: InlineKeyboardMarkup | undefined =
    isOpen && applyUrl
      ? {
          inline_keyboard: [
            [
              {
                text: "Apply Now",
                url: applyUrl,
              },
            ],
          ],
        }
      : undefined;

  return {
    text,
    replyMarkup,
    contentHash: hashContent(text, replyMarkup),
  };
}
