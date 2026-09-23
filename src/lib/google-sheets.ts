import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

// ==========================================
// GOOGLE SHEETS API CLIENT
// ==========================================
//
// A thin wrapper over the Sheets API v4 REST endpoints, built on the
// runtime's own `fetch` — the same "did not seem worth a dependency
// for three methods" call `telegram.ts` makes.
//
// AUTH: Workload Identity Federation, not a service-account key. This
// org's `iam.disableServiceAccountKeyCreation` policy blocks creating
// or downloading a private key at all, and even without that policy a
// long-lived key is worse than what this does instead: Vercel signs a
// short-lived OIDC token into every function invocation
// (`getVercelOidcToken`, from `@vercel/oidc`); GCP is configured to
// trust that token's issuer directly (a Workload Identity Pool +
// Provider) and exchanges it for a Google access token, impersonating
// a service account that holds no downloadable credential of its own.
// Nothing secret is ever stored in this app's environment — every
// `GOOGLE_WIF_*` var below is a non-sensitive identifier (a pool ID,
// a provider ID, an email), not a credential.
//
// SERVER ONLY. Never imported from a `"use client"` file.
//
// Config is read *per call*, not at module load, exactly like
// `telegram.ts` — with `GOOGLE_SHEETS_SPREADSHEET_ID`,
// `GOOGLE_WIF_PROJECT_NUMBER`, `GOOGLE_WIF_POOL_ID`,
// `GOOGLE_WIF_PROVIDER_ID` or `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL`
// unset, this whole feature is an inert no-op: jobs still save, and
// `next build` still succeeds.
//
// This module knows nothing about `Job` or `Tutor` — it is a generic,
// job-agnostic wrapper for one spreadsheet, one tab, columns A:E, row
// 1 a header. The job-shaped orchestration lives in
// `job-sheet-sync.ts`, the same split `telegram.ts` /
// `telegram-job-post.ts` has.
//
// ==========================================

const SHEETS_API_ROOT = "https://sheets.googleapis.com/v4/spreadsheets";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/** Per-request ceiling. Sheets is normally far quicker than this. */
const REQUEST_TIMEOUT_MS = 8_000;

export type SheetRow = readonly [string, string, string, string, string];

interface SheetsConfig {
  spreadsheetId: string;
  tabName: string;
  projectNumber: string;
  poolId: string;
  providerId: string;
  serviceAccountEmail: string;
}

// ==========================================
// ERRORS
// ==========================================

/**
 * Raised when the spreadsheet id or service-account credentials are
 * unset. Callers are expected to check `isSheetSyncConfigured()`
 * first and skip the side effect entirely rather than record a
 * failure that isn't one.
 */
export class SheetsNotConfiguredError extends Error {
  constructor() {
    super(
      "Google Sheets sync is not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID, " +
        "GOOGLE_WIF_PROJECT_NUMBER, GOOGLE_WIF_POOL_ID, GOOGLE_WIF_PROVIDER_ID, " +
        "and GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL."
    );

    this.name = "SheetsNotConfiguredError";
  }
}

export class SheetsApiError extends Error {
  readonly method: string;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(init: { method: string; status: number | null; description: string }) {
    super(`Google Sheets ${init.method} failed: ${init.description}`);

    this.name = "SheetsApiError";
    this.method = init.method;
    this.status = init.status;

    this.retryable =
      init.status === null || init.status === 429 || init.status >= 500;
  }
}

// ==========================================
// CONFIGURATION
// ==========================================

function readConfig(): SheetsConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Sheet1";
  const projectNumber = process.env.GOOGLE_WIF_PROJECT_NUMBER?.trim();
  const poolId = process.env.GOOGLE_WIF_POOL_ID?.trim();
  const providerId = process.env.GOOGLE_WIF_PROVIDER_ID?.trim();
  const serviceAccountEmail = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?.trim();

  if (!spreadsheetId || !projectNumber || !poolId || !providerId || !serviceAccountEmail) {
    return null;
  }

  return {
    spreadsheetId,
    tabName,
    projectNumber,
    poolId,
    providerId,
    serviceAccountEmail,
  };
}

/**
 * Whether sheet mirroring is switched on at all. `job-sheet-sync.ts`
 * checks this before doing anything else, so an unconfigured
 * deployment never attempts auth.
 */
export function isSheetSyncConfigured(): boolean {
  return readConfig() !== null;
}

// ==========================================
// AUTH
// ==========================================

/**
 * The audience is what identifies this exact Workload Identity Pool
 * Provider to GCP's token exchange endpoint — the format GCP itself
 * documents for a workload (as opposed to workforce) pool.
 */
function buildAudience(config: SheetsConfig): string {
  return (
    `//iam.googleapis.com/projects/${config.projectNumber}` +
    `/locations/global/workloadIdentityPools/${config.poolId}` +
    `/providers/${config.providerId}`
  );
}

/**
 * Built lazily on first use per config, not at module load. The
 * client's own `getAccessToken()` handles caching/refreshing both the
 * exchanged GCP token and the impersonated service-account token
 * internally, so this only needs to avoid rebuilding the client on
 * every single call.
 */
let cachedAuth: { audience: string; client: ReturnType<typeof ExternalAccountClient.fromJSON> } | null = null;

function getAuth(config: SheetsConfig) {
  const audience = buildAudience(config);

  if (cachedAuth && cachedAuth.audience === audience) {
    return cachedAuth.client;
  }

  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",

    // Exchanges the pool's (broad) token for a token scoped to this
    // one service account — the identity that's actually shared as
    // Editor on the sheet, not the pool itself.
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
      `${config.serviceAccountEmail}:generateAccessToken`,

    scopes: SCOPES,

    // The subject token is Vercel's own short-lived OIDC token, not a
    // file or URL `google-auth-library` would fetch itself — Vercel
    // injects it per invocation (and `vercel env pull`/`vercel dev`
    // refresh it for local development).
    subject_token_supplier: {
      getSubjectToken: async () => {
        const token = await getVercelOidcToken();

        if (!token) {
          throw new SheetsApiError({
            method: "auth",
            status: null,
            description: "No Vercel OIDC token is available.",
          });
        }

        return token;
      },
    },
  });

  cachedAuth = { audience, client };

  return client;
}

async function getAccessToken(config: SheetsConfig): Promise<string> {
  const client = getAuth(config);

  if (!client) {
    throw new SheetsApiError({
      method: "auth",
      status: null,
      description: "Could not build a Google Workload Identity Federation client.",
    });
  }

  try {
    const { token } = await client.getAccessToken();

    if (!token) {
      throw new SheetsApiError({
        method: "auth",
        status: null,
        description: "Could not obtain a Google access token.",
      });
    }

    return token;
  } catch (cause) {
    if (cause instanceof SheetsApiError) {
      throw cause;
    }

    // Deliberately does not interpolate `cause` — a transport error
    // here can echo back request/response details from the token
    // exchange, and none of that belongs in a log an admin might see.
    throw new SheetsApiError({
      method: "auth",
      status: null,
      description: "Could not authenticate with Google.",
    });
  }
}

// ==========================================
// TRANSPORT
// ==========================================

async function callSheetsApi<T>(
  method: string,
  path: string,
  init: { method: "GET" | "POST" | "PUT"; body?: unknown }
): Promise<T> {
  const config = readConfig();

  if (!config) {
    throw new SheetsNotConfiguredError();
  }

  const token = await getAccessToken(config);

  let response: Response;

  try {
    response = await fetch(`${SHEETS_API_ROOT}/${config.spreadsheetId}${path}`, {
      method: init.method,

      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },

      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,

      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),

      cache: "no-store",
    });
  } catch (cause) {
    throw new SheetsApiError({
      method,
      status: null,
      description:
        cause instanceof Error && cause.name === "TimeoutError"
          ? `No response from Google Sheets within ${REQUEST_TIMEOUT_MS}ms.`
          : "Could not reach Google Sheets.",
    });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new SheetsApiError({
      method,
      status: response.status,
      description:
        body?.error?.message ?? `Google Sheets returned HTTP ${response.status}.`,
    });
  }

  return (await response.json()) as T;
}

function encodeRange(tabName: string, range: string): string {
  return encodeURIComponent(`'${tabName}'!${range}`);
}

// ==========================================
// METHODS
// ==========================================

/**
 * 1-based row number of the first row (searching from row 2 onward —
 * row 1 is the header) whose column A equals `code`, or `null` if
 * none match. First match wins if the sheet somehow has duplicates.
 */
export async function findRowNumberByCode(code: string): Promise<number | null> {
  const config = readConfig();

  if (!config) {
    throw new SheetsNotConfiguredError();
  }

  const result = await callSheetsApi<{ values?: string[][] }>(
    "values.get",
    `/values/${encodeRange(config.tabName, "A2:A")}`,
    { method: "GET" }
  );

  const rows = result.values ?? [];
  const index = rows.findIndex((row) => (row[0] ?? "").trim() === code);

  return index === -1 ? null : index + 2;
}

/**
 * Appends one full row to the end of the table (columns A:E).
 *
 * `valueInputOption=RAW` is load-bearing, not incidental:
 * `USER_ENTERED` lets Sheets auto-interpret a numeric-looking string,
 * which would strip a leading `0` off a phone number like
 * `0911223344`. `RAW` stores exactly the string sent.
 */
export async function appendSheetRow(values: SheetRow): Promise<void> {
  const config = readConfig();

  if (!config) {
    throw new SheetsNotConfiguredError();
  }

  await callSheetsApi(
    "values.append",
    `/values/${encodeRange(config.tabName, "A:E")}:append` +
      "?valueInputOption=RAW&insertDataOption=INSERT_ROWS",
    {
      method: "POST",
      body: { values: [values] },
    }
  );
}

/** Overwrites columns A:E of an existing 1-based row number in one call. */
export async function updateSheetRow(
  rowNumber: number,
  values: SheetRow
): Promise<void> {
  const config = readConfig();

  if (!config) {
    throw new SheetsNotConfiguredError();
  }

  await callSheetsApi(
    "values.update",
    `/values/${encodeRange(config.tabName, `A${rowNumber}:E${rowNumber}`)}` +
      "?valueInputOption=RAW",
    {
      method: "PUT",
      body: { values: [values] },
    }
  );
}
