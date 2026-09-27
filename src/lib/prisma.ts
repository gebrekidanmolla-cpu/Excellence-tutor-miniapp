import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is not defined");
}

/*
 * The database sits behind Supabase's pooler, which caps the whole project at
 * a fixed number of client connections (15 in session mode). Every Vercel
 * function instance gets its own pool, so pg's default of 10 connections each
 * — held open while an instance sits frozen between requests — exhausted that
 * cap with only two or three warm instances, and every query then failed with
 * EMAXCONNSESSION.
 *
 * Keep each instance's pool small, drop idle connections quickly, and let
 * attachDatabasePool keep the instance alive just long enough to actually
 * close them before Vercel suspends it.
 */
function createPrismaClient(url: string) {
  const pool = new Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 5_000,
  });

  attachDatabasePool(pool);

  return new PrismaClient({
    adapter: new PrismaPg(pool),
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
