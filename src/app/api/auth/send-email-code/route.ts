import { NextResponse } from "next/server";
import { randomInt } from "crypto";

import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import {
  CODE_TTL_MS,
  EMAIL_PATTERN,
  IP_LIMITS,
  RECORD_RETENTION_MS,
  RESEND_COOLDOWN_MS,
  hashVerificationCode,
  normalizeEmail,
  requestIp,
} from "@/lib/email-verification";

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const email = normalizeEmail(String(body.email ?? ""));

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return fail("Please enter a valid email address.", 400);
    }

    const now = Date.now();

    /*
     * Rows past the longest rate-limit window are no longer needed by
     * anything; clear them opportunistically.
     */
    await prisma.emailVerification.deleteMany({
      where: { createdAt: { lt: new Date(now - RECORD_RETENTION_MS) } },
    });

    const existingTutor = await prisma.tutor.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingTutor) {
      return fail("An account with this email already exists.", 409);
    }

    /*
     * Per-IP limit: see IP_LIMITS in `email-verification.ts` for why.
     * Inert where no IP is known (local dev).
     */
    const ip = requestIp(request);

    if (ip) {
      for (const { windowMs, max } of IP_LIMITS) {
        const sent = await prisma.emailVerification.count({
          where: { requestIp: ip, createdAt: { gt: new Date(now - windowMs) } },
        });

        if (sent >= max) {
          return fail(
            "Too many verification codes have been requested from your network. Please try again later.",
            429
          );
        }
      }
    }

    const recentVerification = await prisma.emailVerification.findFirst({
      where: {
        email,
        createdAt: { gt: new Date(now - RESEND_COOLDOWN_MS) },
      },
      select: { id: true },
    });

    if (recentVerification) {
      return fail("Please wait 60 seconds before requesting another code.", 429);
    }

    await prisma.emailVerification.deleteMany({ where: { email } });

    const code = randomInt(100000, 1000000).toString();

    const verification = await prisma.emailVerification.create({
      data: {
        email,
        codeHash: hashVerificationCode(email, code),
        expiresAt: new Date(now + CODE_TTL_MS),
        requestIp: ip,
      },
      select: { id: true },
    });

    try {
      await sendVerificationEmail(email, code);
    } catch (error) {
      /*
       * The code never arrived, so the row must not start the resend
       * cooldown. `deleteMany` rather than `delete`: nothing to do if it
       * is already gone.
       */
      await prisma.emailVerification.deleteMany({
        where: { id: verification.id },
      });

      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully.",
    });
  } catch (error) {
    console.error("Send email verification error:", error);

    return fail("Unable to send verification code. Please try again.", 500);
  }
}
