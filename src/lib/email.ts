import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";

type Attachment = NonNullable<SendMailOptions["attachments"]>[number];

/**
 * SMTP transport for the domain's own mailbox on the DirectAdmin host.
 *
 * `SMTP_HOST` is deliberately the shared *server's* hostname, not the vanity
 * `mail.<domain>` name: the host presents a certificate covering only its own
 * hostname, so verifying TLS against the vanity name fails. If a certificate
 * covering it is ever issued, this becomes a one-line env change.
 *
 * Built lazily and cached rather than at module load, so an unconfigured
 * environment fails on the first send instead of breaking `next build` — the
 * same per-call config read `telegram.ts` and `r2.ts` use. Unlike those two,
 * though, this module keeps its always-throw contract: callers are the ones
 * that decide whether a send failure is fatal.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "Email is not configured — SMTP_HOST, SMTP_USER and SMTP_PASSWORD are all required."
    );
  }

  const port = Number(process.env.SMTP_PORT ?? 587);

  transporter = nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS from the first byte; 587 opens in plaintext and must
    // be upgraded, so refuse to send at all if STARTTLS is unavailable.
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    // These sends are best-effort side effects on routes that have already
    // committed. Without bounds, one unreachable mail host stalls the whole
    // request for the function's full duration.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

type EmailContent = {
  subject: string;
  html: string;
  /** Plain-text alternative: read by text-only clients and spam filters. */
  text: string;
};

/**
 * Every send in this module funnels through here. Nodemailer rejects on any
 * delivery failure, which is what preserves this module's always-throw
 * contract now that there is no `{ data, error }` result to inspect.
 */
async function sendMail({
  to,
  attachments,
  ...content
}: EmailContent & { to: string; attachments?: Attachment[] }) {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("Email is not configured — EMAIL_FROM is required.");
  }

  return getTransporter().sendMail({ from, to, attachments, ...content });
}

// ==========================================
// ATTACHMENTS
// ==========================================
//
// The monthly attendance sheet goes out with every assignment email. It is
// read from disk at send time, so `next.config.ts` lists it under
// `outputFileTracingIncludes` for the assign route — without that entry the
// file is missing from the Vercel function bundle.
//
// ==========================================

const ATTENDANCE_SHEET_PATH = path.join(
  process.cwd(),
  "src/assets/attendance-sheet.pdf"
);

let attendanceSheet: Buffer | null = null;

/**
 * `null` when the file can't be read: the assignment email matters more than
 * its attachment, so a missing sheet is logged and the email still goes out.
 */
async function getAttendanceSheetAttachment(): Promise<Attachment | null> {
  try {
    attendanceSheet ??= await readFile(ATTENDANCE_SHEET_PATH);
  } catch (error) {
    console.error("Failed to read the attendance sheet attachment:", error);

    return null;
  }

  return {
    filename: "Excellence Tutors Attendance Sheet.pdf",
    content: attendanceSheet,
    contentType: "application/pdf",
  };
}

// ==========================================
// LAYOUT
// ==========================================
//
// Email clients (Outlook especially) ignore most modern CSS, so the layout
// is nested tables with inline styles, a 600px column and web-safe fonts —
// no external stylesheets, no images to be blocked. Colours are the app's
// brand tokens converted to hex.
//
// ==========================================

const BRAND = {
  primary: "#2f4fc4", // --primary, oklch(0.48 0.18 264)
  text: "#1c2233",
  muted: "#5f6679",
  border: "#e4e7ef",
  surface: "#f5f6fa",
} as const;

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Everything interpolated into a template goes through this. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Absolute link into the app, for use inside an email where a relative path
 * doesn't resolve. Falls back to `null` (rather than a placeholder domain)
 * so a template can just omit the link instead of
 * shipping a broken one when `NEXT_PUBLIC_APP_URL` is unset.
 */
function buildAppUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL;

  return base ? `${base.replace(/\/$/, "")}${path}` : null;
}

function paragraph(html: string, style = ""): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${BRAND.text};${style}">${html}</p>`;
}

/** A button that survives Outlook: the link is padded, not the cell. */
function button(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
      <tr>
        <td style="border-radius:10px;background:${BRAND.primary};">
          <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

/** A bordered label/value table, e.g. job details. */
function detailsTable(rows: [label: string, value: string][]): string {
  const body = rows
    .map(
      ([label, value], index) => `
        <tr>
          <td style="padding:12px 16px;${index ? `border-top:1px solid ${BRAND.border};` : ""}font-size:13px;line-height:20px;color:${BRAND.muted};width:38%;">${escapeHtml(label)}</td>
          <td style="padding:12px 16px;${index ? `border-top:1px solid ${BRAND.border};` : ""}font-size:14px;line-height:20px;color:${BRAND.text};font-weight:600;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border:1px solid ${BRAND.border};border-radius:12px;border-collapse:separate;">
      ${body}
    </table>`;
}

function renderEmail({
  preheader,
  eyebrow,
  heading,
  bodyHtml,
  footerNote,
}: {
  /** The grey preview line inbox lists show after the subject. */
  preheader: string;
  eyebrow?: string;
  heading: string;
  bodyHtml: string;
  footerNote: string;
}): string {
  const siteUrl = buildAppUrl("/");
  const siteLabel = siteUrl
    ? escapeHtml(siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""))
    : "Excellence Tutor";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.surface};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;font-family:${FONT};">

          <!-- Brand -->
          <tr>
            <td style="padding:0 4px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:9px;background:${BRAND.primary};color:#ffffff;font-size:15px;font-weight:700;text-align:center;vertical-align:middle;">ET</td>
                  <td style="padding-left:10px;font-size:16px;font-weight:700;color:${BRAND.text};letter-spacing:-0.2px;">Excellence Tutor</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
              <div style="height:4px;background:${BRAND.primary};border-top-left-radius:16px;border-top-right-radius:16px;font-size:0;line-height:0;">&nbsp;</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:36px 36px 20px;">
                    ${
                      eyebrow
                        ? `<p style="margin:0 0 8px;font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.primary};">${escapeHtml(eyebrow)}</p>`
                        : ""
                    }
                    <h1 style="margin:0 0 20px;font-size:24px;line-height:32px;font-weight:700;letter-spacing:-0.3px;color:${BRAND.text};">${escapeHtml(heading)}</h1>
                    ${bodyHtml}
                    <p style="margin:8px 0 0;font-size:15px;line-height:24px;color:${BRAND.text};">— The Excellence Tutor team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 12px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:${BRAND.muted};">${escapeHtml(footerNote)}</p>
              <p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.muted};">
                ${siteUrl ? `<a href="${escapeHtml(siteUrl)}" style="color:${BRAND.muted};text-decoration:underline;">${siteLabel}</a>` : siteLabel}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text counterpart of `renderEmail`, sharing its sign-off. */
function renderText(lines: (string | null | false)[]): string {
  return [...lines.filter((line) => line !== null && line !== false), "", "— The Excellence Tutor team"].join("\n");
}

// ==========================================
// VERIFICATION CODE
// ==========================================

export function buildVerificationEmail(code: string): EmailContent {
  const digits = escapeHtml(code);

  return {
    // The code in the subject means it can be read from the notification.
    subject: `${code} is your Excellence Tutor verification code`,
    html: renderEmail({
      preheader: `Your code is ${code}. It expires in 10 minutes.`,
      eyebrow: "Tutor registration",
      heading: "Verify your email address",
      bodyHtml: `
        ${paragraph("Thanks for applying to tutor with Excellence Tutor. Enter this code in the registration form to confirm your email address:")}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
          <tr>
            <td align="center" style="padding:24px 16px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;">
              <div style="font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:36px;line-height:44px;font-weight:700;letter-spacing:10px;color:${BRAND.primary};padding-left:10px;">${digits}</div>
              <div style="margin-top:8px;font-size:13px;line-height:18px;color:${BRAND.muted};">Expires in 10 minutes</div>
            </td>
          </tr>
        </table>

        ${paragraph(
          "For your security, never share this code with anyone. Our team will never ask you for it.",
          `font-size:14px;line-height:22px;color:${BRAND.muted};`
        )}
      `,
      footerNote:
        "If you didn't try to register, you can safely ignore this email — no account will be created.",
    }),
    text: renderText([
      "Verify your email address",
      "",
      "Thanks for applying to tutor with Excellence Tutor. Enter this code in the registration form to confirm your email address:",
      "",
      `    ${code}`,
      "",
      "The code expires in 10 minutes. Never share it with anyone.",
      "",
      "If you didn't try to register, you can safely ignore this email.",
    ]),
  };
}

export async function sendVerificationEmail(email: string, code: string) {
  return sendMail({ to: email, ...buildVerificationEmail(code) });
}

// ==========================================
// APPLICATION STATUS EMAILS
// ==========================================
//
// Sent from the admin application-review and job-reopen routes, always as a
// best-effort side effect after the database change has already committed —
// callers wrap these in try/catch (or Promise.allSettled for the reopen
// route's whole pool) so a mail-server outage never fails the underlying action.
//
// ==========================================

interface JobSummary {
  jobCode: string;
  subject: string;
  grade: string;
}

const APPLICATIONS_FOOTER =
  "You're receiving this because you applied for a tutoring job with Excellence Tutor.";

/** A `tel:` target from a free-text phone number: digits and a leading +. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/(?!^\+)[^\d]/g, "")}`;
}

/** The parent's contact card plus the call-within-24-hours instruction. */
function parentContactHtml(parentName: string, parentPhone: string): string {
  const name = parentName.trim();
  const phone = parentPhone.trim();

  return `
    <p style="margin:8px 0 10px;font-size:13px;line-height:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND.muted};">Parent contact</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${BRAND.border};border-radius:12px;border-collapse:separate;">
      <tr>
        <td style="padding:16px;">
          ${name ? `<div style="font-size:16px;line-height:24px;font-weight:700;color:${BRAND.text};">${escapeHtml(name)}</div>` : ""}
          ${
            phone
              ? `<div style="margin-top:2px;font-size:16px;line-height:24px;"><a href="${escapeHtml(telHref(phone))}" style="color:${BRAND.primary};font-weight:600;text-decoration:none;">${escapeHtml(phone)}</a></div>`
              : ""
          }
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:16px 18px;background:#fdf4e3;border-left:4px solid #e3a034;border-radius:8px;">
          <div style="font-size:14px;line-height:20px;font-weight:700;color:#5c3d07;">Next step: call the parent</div>
          <div style="margin-top:4px;font-size:14px;line-height:22px;color:#5c3d07;">Please call the parent to introduce yourself and arrange the first session, then let us know what you discussed <strong>within 24 hours</strong>.</div>
        </td>
      </tr>
    </table>`;
}

export function buildApplicationAcceptedEmail({
  tutorName,
  job,
  place,
  salary,
  parentName,
  parentPhone,
}: {
  tutorName: string;
  job: JobSummary;
  place: string;
  salary: number;
  parentName: string;
  parentPhone: string;
}): EmailContent {
  const url = buildAppUrl("/tutor/applications");
  const salaryText = `${salary.toLocaleString("en-US")} ETB`;

  /* Parent details are optional on a job; without a phone there is no one
     to call, so fall back to the team following up instead. */
  const hasParentContact = parentPhone.trim() !== "";

  return {
    subject: `You've been assigned to job ${job.jobCode}`,
    html: renderEmail({
      preheader: hasParentContact
        ? `${job.subject} · ${job.grade}. Call the parent and let us know what you discussed within 24 hours.`
        : `${job.subject} · ${job.grade} · ${place}. The team will be in touch with next steps.`,
      eyebrow: "Job assigned",
      heading: "Congratulations — the job is yours",
      bodyHtml: `
        ${paragraph(`Hi ${escapeHtml(tutorName)},`)}
        ${paragraph("You've been assigned to the tutoring job below.")}
        ${detailsTable([
          ["Job code", job.jobCode],
          ["Subject", job.subject],
          ["Grade", job.grade],
          ["Place", place],
          ["Salary", salaryText],
        ])}
        ${
          hasParentContact
            ? parentContactHtml(parentName, parentPhone)
            : paragraph("The Excellence Tutor team will be in touch with next steps.")
        }
        ${paragraph("We've attached the <strong>monthly attendance sheet</strong>. Please print it, record each session, and have the parent sign it — it is the record your monthly payment is verified against.")}
        ${url ? button("View your applications", url) : ""}
      `,
      footerNote: APPLICATIONS_FOOTER,
    }),
    text: renderText([
      `Hi ${tutorName},`,
      "",
      "Congratulations — you've been assigned to this tutoring job:",
      "",
      `Job code: ${job.jobCode}`,
      `Subject:  ${job.subject}`,
      `Grade:    ${job.grade}`,
      `Place:    ${place}`,
      `Salary:   ${salaryText}`,
      "",
      ...(hasParentContact
        ? [
            "PARENT CONTACT",
            parentName.trim() ? `Name:  ${parentName.trim()}` : null,
            `Phone: ${parentPhone.trim()}`,
            "",
            "NEXT STEP: Please call the parent to introduce yourself and arrange the first session, then let us know what you discussed within 24 hours.",
          ]
        : ["The Excellence Tutor team will be in touch with next steps."]),
      "",
      "We've attached the monthly attendance sheet. Please print it, record each session, and have the parent sign it — it is the record your monthly payment is verified against.",
      url ? `\nView your applications: ${url}` : null,
    ]),
  };
}

export async function sendApplicationAcceptedEmail({
  to,
  ...details
}: {
  to: string;
  tutorName: string;
  job: JobSummary;
  place: string;
  salary: number;
  parentName: string;
  parentPhone: string;
}) {
  const attendanceSheet = await getAttendanceSheetAttachment();

  return sendMail({
    to,
    ...buildApplicationAcceptedEmail(details),
    attachments: attendanceSheet ? [attendanceSheet] : undefined,
  });
}

/**
 * Sent to every applicant whose status a job re-open just reset back to
 * `PENDING`. `previousStatus` only varies the second line — the tutor who
 * was assigned reads "reversed", everyone else reads "reconsidered".
 */
export function buildJobReopenedEmail({
  tutorName,
  job,
  previousStatus,
}: {
  tutorName: string;
  job: JobSummary;
  previousStatus: "ACCEPTED" | "REVIEWED" | "REJECTED";
}): EmailContent {
  const url = buildAppUrl("/tutor/applications");

  const changeDescription =
    previousStatus === "ACCEPTED"
      ? "Your assignment to this job has been reversed, and"
      : previousStatus === "REJECTED"
        ? "Your application is being reconsidered, and"
        : "Your application is being looked at again, and";

  return {
    subject: `Job ${job.jobCode} has reopened`,
    html: renderEmail({
      preheader: `${job.subject} · ${job.grade} is open again. Your application is pending review.`,
      eyebrow: "Application update",
      heading: `Job ${job.jobCode} has reopened`,
      bodyHtml: `
        ${paragraph(`Hi ${escapeHtml(tutorName)},`)}
        ${paragraph(
          `Job <strong>${escapeHtml(job.jobCode)}</strong> (${escapeHtml(job.subject)} · ${escapeHtml(job.grade)}) has reopened for new applications.`
        )}
        ${paragraph(
          `${escapeHtml(changeDescription)} your application status is now <strong style="color:${BRAND.primary};">pending review</strong> again.`
        )}
        ${url ? button("Check your application status", url) : ""}
      `,
      footerNote: APPLICATIONS_FOOTER,
    }),
    text: renderText([
      `Hi ${tutorName},`,
      "",
      `Job ${job.jobCode} (${job.subject} · ${job.grade}) has reopened for new applications.`,
      "",
      `${changeDescription} your application status is now pending review again.`,
      url ? `\nCheck your application status: ${url}` : null,
    ]),
  };
}

export async function sendJobReopenedEmail({
  to,
  ...details
}: {
  to: string;
  tutorName: string;
  job: JobSummary;
  previousStatus: "ACCEPTED" | "REVIEWED" | "REJECTED";
}) {
  return sendMail({ to, ...buildJobReopenedEmail(details) });
}
