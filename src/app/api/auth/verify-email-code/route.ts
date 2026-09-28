import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  MAX_ATTEMPTS,
  VERIFIED_TTL_MS,
  normalizeEmail,
  verificationCodeMatches,
} from "@/lib/email-verification";

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const email = normalizeEmail(String(body.email ?? ""));
    const code = String(body.code ?? "").trim();

    if (!email) {
      return fail("Email is required.", 400);
    }

    if (!/^\d{6}$/.test(code)) {
      return fail("Please enter the 6-digit verification code.", 400);
    }

    const verification = await prisma.emailVerification.findFirst({
      where: { email, verifiedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return fail(
        "No active verification code found. Please request a new code.",
        400
      );
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });

      return fail(
        "This verification code has expired. Please request a new one.",
        400
      );
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });

      return fail("Too many incorrect attempts. Please request a new code.", 429);
    }

    if (!verificationCodeMatches(email, code, verification.codeHash)) {
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });

      return fail("Incorrect verification code.", 400);
    }

    const verifiedAt = new Date();

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        verifiedAt,
        /*
         * The code's own 10 minutes would run out while the tutor is still
         * filling in the rest of the form; the register route requires an
         * unexpired record, so give a verified address a full sitting.
         */
        expiresAt: new Date(verifiedAt.getTime() + VERIFIED_TTL_MS),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return fail("Unable to verify email. Please try again.", 500);
  }
}
