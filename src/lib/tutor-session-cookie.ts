/**
 * The tutor session cookie's name, in a module of its own so `next.config.ts`
 * can route on the cookie's presence without importing the session code (and
 * Prisma) behind it. `src/lib/session.ts` is what reads and verifies it.
 */
export const TUTOR_SESSION_COOKIE = "tutor_session";
