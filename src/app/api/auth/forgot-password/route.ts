import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  EMAIL_PATTERN,
  normalizeEmail,
  requestIp,
} from "@/lib/email-verification";
import {
  RESET_TOKEN_TTL_MINUTES,
  createPasswordResetToken,
} from "@/lib/password-reset";

const RESET_SCOPE = "RESET";
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_LIMIT_PER_EMAIL = 3;
/* Loose, like the other per-IP limits: carriers share addresses widely. */
const RESET_LIMIT_PER_IP = 20;

/**
 * Emails a reset link to a registered tutor.
 *
 * The response is identical whether or not the address has an account, and
 * both the lookup and the send happen in `after()` — so neither the body nor
 * the response time says whether an email exists. Mail only ever goes to an
 * address that already passed verification at registration, so this route
 * can't be used to spray bounces at made-up addresses.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : "";

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { success: false, message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const ip = requestIp(request);

  after(async () => {
    try {
      /*
       * Rate limit, so nobody can flood a tutor's inbox or burn the mail
       * host's reputation. Rows live in `LoginAttempt` under their own
       * scope, and are cleared by its 24-hour cleanup. Checked in here, not
       * before responding: a limited request still gets the same answer.
       */
      const since = new Date(Date.now() - RESET_WINDOW_MS);

      const [emailRequests, ipRequests] = await Promise.all([
        prisma.loginAttempt.count({
          where: { scope: RESET_SCOPE, email, createdAt: { gt: since } },
        }),
        ip
          ? prisma.loginAttempt.count({
              where: { scope: RESET_SCOPE, ip, createdAt: { gt: since } },
            })
          : 0,
      ]);

      await prisma.loginAttempt.create({
        data: { scope: RESET_SCOPE, email, ip },
      });

      if (
        emailRequests >= RESET_LIMIT_PER_EMAIL ||
        ipRequests >= RESET_LIMIT_PER_IP
      ) {
        console.warn("Password reset rate limit reached; no email sent.");
        return;
      }

      const tutor = await prisma.tutor.findUnique({
        where: { email },
        select: { id: true, fullName: true, email: true, passwordHash: true },
      });

      if (!tutor) {
        return;
      }

      await sendPasswordResetEmail({
        to: tutor.email,
        tutorName: tutor.fullName,
        token: createPasswordResetToken(tutor),
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    } catch (error) {
      console.error("Password reset email failed:", error);
    }
  });

  return NextResponse.json({
    success: true,
    message:
      "If an account exists for that email, a password reset link is on its way.",
  });
}
