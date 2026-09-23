// ==========================================
// ONE-OFF: COPY TUTOR DOCUMENTS FROM SUPABASE TO R2
// ==========================================
//
// Run with:  npx tsx scripts/migrate-documents-to-r2.ts
//
// Needs DIRECT_URL, SUPABASE_URL, SUPABASE_SECRET_KEY and the R2_*
// variables. Every document key referenced by a Tutor row is copied to
// R2 under the *same* key, so the database needs no changes.
//
// Safe to re-run: keys that already exist in R2 are skipped.
//
// Delete this script, `@supabase/supabase-js` and the SUPABASE_* vars
// once production has been migrated.
//
// ==========================================

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { objectExists, putObject } from "../src/lib/r2";

const SUPABASE_BUCKET = "tutor-documents";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: requireEnv("DIRECT_URL"),
  }),
});

const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SECRET_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

async function main() {
  const tutors = await prisma.tutor.findMany({
    select: {
      transcriptUrl: true,
      entranceResultUrl: true,
      graduationDocumentUrl: true,
      cvUrl: true,
      governmentIdUrl: true,
    },
  });

  const keys = [
    ...new Set(
      tutors
        .flatMap((tutor) => Object.values(tutor))
        .filter(
          (key): key is string =>
            typeof key === "string" && key.length > 0,
        ),
    ),
  ];

  console.log(
    `Found ${keys.length} document(s) across ${tutors.length} tutor(s).`,
  );

  let copied = 0;
  let skipped = 0;
  const failed: { key: string; reason: string }[] = [];

  for (const key of keys) {
    try {
      if (await objectExists(key)) {
        skipped++;
        continue;
      }

      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .download(key);

      if (error || !data) {
        throw new Error(
          error?.message ?? "Supabase returned no data",
        );
      }

      await putObject(
        key,
        new Uint8Array(await data.arrayBuffer()),
        data.type || "application/octet-stream",
      );

      copied++;
      console.log(`copied  ${key}`);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error);

      failed.push({ key, reason });
      console.error(`FAILED  ${key}: ${reason}`);
    }
  }

  console.log(
    `\nCopied ${copied}, skipped ${skipped} (already in R2), failed ${failed.length}.`,
  );

  if (failed.length > 0) {
    console.error("\nFailed keys:");

    for (const { key, reason } of failed) {
      console.error(`  ${key} — ${reason}`);
    }

    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
