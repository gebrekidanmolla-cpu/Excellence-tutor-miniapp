import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET_NAME = "tutor-documents";

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_CV_SIZE = 5 * 1024 * 1024; // 5 MB

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const CV_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function validateFile(
  file: File,
  type: "document" | "cv",
) {
  if (!file || file.size === 0) {
    throw new Error("A file is required.");
  }

  const maxSize =
    type === "cv" ? MAX_CV_SIZE : MAX_DOCUMENT_SIZE;

  const maxSizeText =
    type === "cv" ? "5 MB" : "2 MB";

  if (file.size > maxSize) {
    throw new Error(
      `${file.name} is too large. Maximum allowed size is ${maxSizeText}.`,
    );
  }

  const allowedTypes =
    type === "cv" ? CV_TYPES : IMAGE_TYPES;

  if (!allowedTypes.includes(file.type)) {
    if (type === "cv") {
      throw new Error(
        `${file.name} must be an image or PDF.`,
      );
    }

    throw new Error(
      `${file.name} must be a JPG, PNG, or WebP image.`,
    );
  }
}

export async function uploadDocument(
  file: File,
  folder: string,
  filename: string,
  type: "document" | "cv" = "document",
) {
  validateFile(file, type);

  const path = `${folder}/${filename}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(
      `Failed to upload ${filename}: ${error.message}`,
    );
  }

  return data.path;
}

export async function deleteDocuments(paths: string[]) {
  const validPaths = paths.filter(Boolean);

  if (validPaths.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .remove(validPaths);

  if (error) {
    console.error(
      "Failed to clean up uploaded documents:",
      error,
    );
  }
}