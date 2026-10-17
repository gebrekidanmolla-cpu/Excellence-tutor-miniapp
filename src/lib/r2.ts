// ==========================================
// CLOUDFLARE R2 DOCUMENT STORAGE
// ==========================================
//
// R2 speaks the S3 API, so this is the AWS SDK pointed at the
// account's R2 endpoint. The bucket is private: uploads happen
// server-side and admins read documents through short-lived
// presigned GETs, so it needs neither public access nor CORS.
//
// SERVER ONLY — the client carries the R2 secret key.
//
// Configuration is read on first use rather than at module load, so
// `next build` does not depend on storage credentials. A storage call
// without them still fails loudly.
//
// ==========================================

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2 = {
  client: S3Client;
  bucket: string;
};

let cached: R2 | null = null;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

function getR2(): R2 {
  if (cached) {
    return cached;
  }

  const accountId = requireEnv("R2_ACCOUNT_ID");

  cached = {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    }),
    bucket: process.env.R2_BUCKET || "tutor-documents",
  };

  return cached;
}

/**
 * Uploads an object. Refuses to overwrite an existing key
 * (`If-None-Match: *`), matching the old Supabase `upsert: false`.
 */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
) {
  const { client, bucket } = getR2();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      IfNoneMatch: "*",
    }),
  );
}

/**
 * The stored `Content-Type`, or null when the object is missing. Keys
 * carry no extension, so this is how a caller tells a PDF CV from an
 * image one.
 */
export async function getObjectContentType(key: string) {
  const { client, bucket } = getR2();

  try {
    const result = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    return result.ContentType ?? null;
  } catch (error) {
    if (
      error instanceof NotFound ||
      (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}

/**
 * Best-effort cleanup: logs failures instead of throwing, since it
 * runs on error paths that already have a failure to report.
 */
export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) {
    return;
  }

  try {
    const { client, bucket } = getR2();

    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );

    if (result.Errors?.length) {
      console.error(
        "Failed to delete some documents:",
        result.Errors,
      );
    }
  } catch (error) {
    console.error("Failed to delete documents:", error);
  }
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number,
) {
  const { client, bucket } = getR2();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: expiresInSeconds },
  );
}
