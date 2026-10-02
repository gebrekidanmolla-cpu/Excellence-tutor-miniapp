import { cache } from "react";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "tutor_session";
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days

interface SessionPayload {
  tutorId: string;
  expiresAt: number;
  /**
   * `Tutor.sessionVersion` when the cookie was issued. A password reset
   * bumps the column, so every cookie issued before it stops matching —
   * that is how a reset signs the tutor out on their other devices.
   * Absent on cookies issued before the column existed, read as 0.
   */
  version?: number;
}

function payloadVersion(payload: SessionPayload): number {
  return typeof payload.version === "number" ? payload.version : 0;
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
 *
 * `sessionVersion` must be the tutor's current `Tutor.sessionVersion`;
 * a cookie stamped with an older value is refused.
 */
export async function createTutorSession(tutor: {
  id: string;
  sessionVersion: number;
}): Promise<void> {
  const cookieStore =
    await cookies();

  const expiresAt =
    Date.now() +
    SESSION_DURATION * 1000;

  const sessionValue =
    encodeSession({
      tutorId: tutor.id,
      expiresAt,
      version: tutor.sessionVersion,
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
 * The signed, unexpired cookie payload — not yet checked against the
 * database, so never trust it on its own: the tutor may have been deleted,
 * or signed out everywhere by a password reset.
 */
async function readSession(): Promise<SessionPayload | null> {
  const cookieStore =
    await cookies();

  const sessionCookie =
    cookieStore.get(
      SESSION_COOKIE_NAME
    );

  if (!sessionCookie?.value) {
    return null;
  }

  return decodeSession(
    sessionCookie.value
  );
}

/**
 * Get the currently authenticated tutor ID.
 *
 * Checks the database, like `getCurrentTutor()`: a deleted account or a
 * cookie from before the last password reset yields null.
 */
export async function getTutorId(): Promise<
  string | null
> {
  const session =
    await readSession();

  if (!session) {
    return null;
  }

  const tutor =
    await prisma.tutor.findUnique({
      where: { id: session.tutorId },
      select: { id: true, sessionVersion: true },
    });

  if (
    !tutor ||
    tutor.sessionVersion !== payloadVersion(session)
  ) {
    return null;
  }

  return tutor.id;
}

/**
 * Get the currently authenticated tutor.
 *
 * Use this from protected server pages
 * and server-side API routes. Memoized per request (React `cache`): the
 * portal layout and the page both call it, and that should cost one query.
 */
export const getCurrentTutor = cache(async () => {
  const session =
    await readSession();

  if (!session) {
    return null;
  }

  const tutor =
    await prisma.tutor.findUnique({
      where: {
        id: session.tutorId,
      },
      select: {
        sessionVersion: true,

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
        profilePhotoUrl: true,

        telegramId: true,

        createdAt: true,
        updatedAt: true,
      },
    });

  /*
   * If the account was deleted while the session still exists, or the
   * password was reset since this cookie was issued, return null.
   */
  if (
    !tutor ||
    tutor.sessionVersion !== payloadVersion(session)
  ) {
    return null;
  }

  // Internal to the session check; pages have no use for it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sessionVersion, ...currentTutor } = tutor;

  return currentTutor;
});

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