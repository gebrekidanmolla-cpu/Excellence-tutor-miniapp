import { deleteObjects, putObject } from "@/lib/r2";
import {
  documentRules,
  formatMegabytes,
  type DocumentKind,
} from "@/lib/document-rules";

/** A document that failed validation; its message is safe to show the user. */
export class DocumentError extends Error {}

export type PreparedDocument = {
  body: Uint8Array;
  /** Detected from the bytes, never the browser-supplied `File.type`. */
  contentType: string;
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** The real type of the file, judged by its leading bytes. */
function sniffContentType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  // "RIFF" <size> "WEBP"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }

  // "%PDF-"
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }

  return null;
}

/**
 * Validates a submitted file and reads it into memory. Throws `DocumentError`
 * naming `label` when it is empty, too large, or not actually one of the
 * allowed types — whatever extension or MIME type it claims.
 */
export async function prepareDocument(
  file: File,
  kind: DocumentKind,
  label: string
): Promise<PreparedDocument> {
  const { maxSize, allowedTypes, typeLabel } = documentRules(kind);

  if (file.size === 0) {
    throw new DocumentError(`${label}: the selected file is empty.`);
  }

  if (file.size > maxSize) {
    throw new DocumentError(
      `${label} must be ${formatMegabytes(maxSize, 0)} or smaller.`
    );
  }

  const body = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffContentType(body);

  if (!contentType || !allowedTypes.includes(contentType)) {
    throw new DocumentError(`${label} must be ${typeLabel}.`);
  }

  return { body, contentType };
}

export async function storeDocument(key: string, document: PreparedDocument) {
  try {
    await putObject(key, document.body, document.contentType);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to upload ${key}: ${message}`);
  }
}

export async function deleteDocuments(paths: string[]) {
  await deleteObjects(paths.filter(Boolean));
}
