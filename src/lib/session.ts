import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "tutor_session";
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days

interface SessionPayload {
  tutorId: string;
  expiresAt: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not defined in environment variables."
    );
  }

  return secret;
}

/**
 * Create an HMAC signature for the session payload.
 */
function sign(value: string): string {
  return createHmac(
    "sha256",
    getSessionSecret()
  )
    .update(value)
    .digest("base64url");
}

/**
 * Encode and sign session data.
 */
function encodeSession(
  payload: SessionPayload
): string {
  const encoded = Buffer.from(
    JSON.stringify(payload),
    "utf-8"
  ).toString("base64url");

  const signature = sign(encoded);

  return `${encoded}.${signature}`;
}

/**
 * Decode and verify a session.
 */
function decodeSession(
  value: string
): SessionPayload | null {
  try {
    const [encoded, signature] =
      value.split(".");

    if (!encoded || !signature) {
      return null;
    }

    const expectedSignature =
      sign(encoded);

    const signatureBuffer =
      Buffer.from(signature);

    const expectedBuffer =
      Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !timingSafeEqual(
        signatureBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const decoded = Buffer.from(
      encoded,
      "base64url"
    ).toString("utf-8");

    const payload =
      JSON.parse(decoded) as SessionPayload;

    if (
      !payload.tutorId ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    if (
      Date.now() > payload.expiresAt
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create a tutor authentication session.
 */
export async function createTutorSession(
  tutorId: string
): Promise<void> {
  const cookieStore =
    await cookies();

  const expiresAt =
    Date.now() +
    SESSION_DURATION * 1000;

  const sessionValue =
    encodeSession({
      tutorId,
      expiresAt,
    });

  cookieStore.set(
    SESSION_COOKIE_NAME,
    sessionValue,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    }
  );
}

/**
 * Get the currently authenticated tutor ID.
 */
export async function getTutorId(): Promise<
  string | null
> {
  const cookieStore =
    await cookies();

  const sessionCookie =
    cookieStore.get(
      SESSION_COOKIE_NAME
    );

  if (!sessionCookie?.value) {
    return null;
  }

  const session =
    decodeSession(
      sessionCookie.value
    );

  if (!session) {
    return null;
  }

  return session.tutorId;
}

/**
 * Get the currently authenticated tutor.
 *
 * Use this from protected server pages
 * and server-side API routes.
 */
export async function getCurrentTutor() {
  const tutorId =
    await getTutorId();

  if (!tutorId) {
    return null;
  }

  const tutor =
    await prisma.tutor.findUnique({
      where: {
        id: tutorId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,

        gender: true,

        country: true,
        city: true,
        subcity: true,
        exactPlace: true,
        address2Country: true,
        address2City: true,
        address2Subcity: true,
        address2ExactPlace: true,

        aboutMe: true,

        tutorStatus: true,

        university: true,
        department: true,
        currentYear: true,
        currentGPA: true,

        fieldOfGraduation: true,
        universityGraduatedFrom: true,
        CGPA: true,

        employmentStatus: true,
        currentJob: true,

        entranceScore: true,
        entranceTotal: true,
        entrancePercentage: true,

        transcriptUrl: true,
        entranceResultUrl: true,
        graduationDocumentUrl: true,
        cvUrl: true,

        telegramId: true,

        createdAt: true,
        updatedAt: true,
      },
    });

  /*
   * If the account was deleted while
   * the session still exists, return null.
   */
  if (!tutor) {
    return null;
  }

  return tutor;
}

/**
 * Destroy the current tutor session.
 */
export async function destroyTutorSession(): Promise<void> {
  const cookieStore =
    await cookies();

  cookieStore.delete(
    SESSION_COOKIE_NAME
  );
}

/**
 * Require an authenticated tutor.
 *
 * Useful for protected server pages.
 */
export async function requireTutor() {
  const tutor =
    await getCurrentTutor();

  if (!tutor) {
    return null;
  }

  return tutor;
}