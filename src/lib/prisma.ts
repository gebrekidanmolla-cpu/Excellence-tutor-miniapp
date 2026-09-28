import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is not defined");
}

/*
 * `DIRECT_URL` is Supabase's session-mode pooler, which caps the whole
 * project at 15 client connections and holds each one for as long as it is
 * open. node-postgres defaults to 10 per pool, so two or three warm Vercel
 * instances were enough to exhaust it and every query then failed with
 * EMAXCONNSESSION. A small pool that lets idle connections go keeps several
 * instances inside the limit; the heaviest page runs three queries at once.
 */
const adapter = new PrismaPg({
  connectionString,
  max: 3,
  idleTimeoutMillis: 10_000,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}