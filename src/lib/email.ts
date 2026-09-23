import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  email: string,
  code: string
) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: [email],
    subject: "Verify your Excellence Tutor email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Excellence Tutor</h2>

        <p>Thank you for registering as a tutor.</p>

        <p>Your email verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 24px 0;
        ">
          ${code}
        </div>

        <p>This code expires in 10 minutes.</p>

        <p>If you did not request this code, you can safely ignore this email.</p>

        <p>
          — Excellence Tutor Team
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ==========================================
// APPLICATION STATUS EMAILS
// ==========================================
//
// Sent from the admin application-review and job-reopen routes, always as a
// best-effort side effect after the database change has already committed —
// callers wrap these in try/catch (or Promise.allSettled for the reopen
// route's whole pool) so a Resend outage never fails the underlying action.
//
// ==========================================

/**
 * Absolute link into the app, for use inside an email where a relative path
 * doesn't resolve. Falls back to `null` (rather than a placeholder domain
 * like `job-post.ts` does) so a template can just omit the link instead of
 * shipping a broken one when `NEXT_PUBLIC_APP_URL` is unset.
 */
function buildAppUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL;

  return base ? `${base}${path}` : null;
}

/** The shared wrapper every application-status email renders inside. */
function renderEmailLayout(bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>Excellence Tutor</h2>

      ${bodyHtml}

      <p style="margin-top: 24px;">
        — Excellence Tutor Team
      </p>
    </div>
  `;
}

function renderJobLink(url: string | null, label: string): string {
  return url ? `<p><a href="${url}">${label}</a></p>` : "";
}

interface JobSummary {
  jobCode: string;
  subject: string;
  grade: string;
}

export async function sendApplicationAcceptedEmail({
  to,
  tutorName,
  job,
  place,
  salary,
}: {
  to: string;
  tutorName: string;
  job: JobSummary;
  place: string;
  salary: number;
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: [to],
    subject: `You've been assigned to job ${job.jobCode}`,
    html: renderEmailLayout(`
      <p>Hi ${tutorName},</p>

      <p>Congratulations — you have been assigned to this tutoring job:</p>

      <ul style="line-height: 1.8;">
        <li><strong>Job code:</strong> ${job.jobCode}</li>
        <li><strong>Subject:</strong> ${job.subject}</li>
        <li><strong>Grade:</strong> ${job.grade}</li>
        <li><strong>Place:</strong> ${place}</li>
        <li><strong>Salary:</strong> ${salary.toLocaleString("en-US")} ETB</li>
      </ul>

      <p>The Excellence Tutor team will be in touch with next steps.</p>

      ${renderJobLink(buildAppUrl("/tutor/applications"), "View your applications")}
    `),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sent to every applicant whose status a job re-open just reset back to
 * `PENDING`. `previousStatus` only varies the second line — the tutor who
 * was assigned reads "reversed", everyone else reads "reconsidered".
 */
export async function sendJobReopenedEmail({
  to,
  tutorName,
  job,
  previousStatus,
}: {
  to: string;
  tutorName: string;
  job: JobSummary;
  previousStatus: "ACCEPTED" | "REVIEWED" | "REJECTED";
}) {
  const changeDescription =
    previousStatus === "ACCEPTED"
      ? "Your assignment to this job has been reversed, and"
      : previousStatus === "REJECTED"
        ? "Your application is being reconsidered, and"
        : "Your application is being looked at again, and";

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: [to],
    subject: `Job ${job.jobCode} has reopened`,
    html: renderEmailLayout(`
      <p>Hi ${tutorName},</p>

      <p>
        Job <strong>${job.jobCode}</strong> (${job.subject} · ${job.grade})
        has reopened for new applications.
      </p>

      <p>${changeDescription} your application status is now <strong>pending review</strong> again.</p>

      ${renderJobLink(buildAppUrl("/tutor/applications"), "Check your application status")}
    `),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}