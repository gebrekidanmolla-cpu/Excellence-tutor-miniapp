import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

interface AdminSessionPayload {
  adminId: string;
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

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function encodeSession(payload: AdminSessionPayload): string {
  const encoded = Buffer.from(
    JSON.stringify(payload),
    "utf-8"
  ).toString("base64url");

  const signature = sign(encoded);

  return `${encoded}.${signature}`;
}

function decodeSession(value: string): AdminSessionPayload | null {
  try {
    const [encoded, signature] = value.split(".");

    if (!encoded || !signature) {
      return null;
    }

    const expectedSignature = sign(encoded);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const decoded = Buffer.from(encoded, "base64url").toString("utf-8");

    const payload = JSON.parse(decoded) as AdminSessionPayload;

    if (
      !payload.adminId ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createAdminSession(
  adminId: string
): Promise<void> {
  const cookieStore = await cookies();

  const expiresAt =
    Date.now() + SESSION_DURATION * 1000;

  const sessionValue = encodeSession({
    adminId,
    expiresAt,
  });

  cookieStore.set(
    SESSION_COOKIE_NAME,
    sessionValue,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    }
  );
}

export async function getAdminId(): Promise<string | null> {
  const cookieStore = await cookies();

  const sessionCookie =
    cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  const session = decodeSession(
    sessionCookie.value
  );

  if (!session) {
    return null;
  }

  return session.adminId;
}

export async function getCurrentAdmin() {
  const adminId = await getAdminId();

  if (!adminId) {
    return null;
  }

  const admin = await prisma.admin.findUnique({
    where: {
      id: adminId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      createdAt: true,
    },
  });

  return admin;
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return null;
  }

  return admin;
}