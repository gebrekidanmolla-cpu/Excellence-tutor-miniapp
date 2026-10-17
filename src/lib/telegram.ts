// ==========================================
// TELEGRAM BOT API CLIENT
// ==========================================
//
// A thin wrapper over the Bot API's HTTP methods, built on the
// runtime's own `fetch`. This is the app's first outbound HTTP call
// and it did not seem worth a dependency for three methods.
//
// SERVER ONLY. The request URL embeds the bot token, so nothing in
// here may ever be imported from a `"use client"` file, and no error
// raised here may carry the URL — only Telegram's own `description`,
// which is what the admin UI renders.
//
// Messages are sent as plain text, with no `parse_mode`. See the
// header of `telegram-post.ts` for why.
//
// Unlike `prisma.ts`, which throws at module
// load when its environment is missing, the configuration here is
// read *per call* and its absence is a normal return value. Posting
// to Telegram is an optional side effect: a developer without a bot
// token, and a CI build, must still boot and build the app.
//
// Rendering lives in `telegram-post.ts`; persisting the outcome and
// containing failures lives in `telegram-job-post.ts`.
//
// ==========================================

const API_ROOT = "https://api.telegram.org";

/** Per-request ceiling. Telegram is normally far quicker than this. */
const REQUEST_TIMEOUT_MS = 8_000;

/** Total attempts per call, including the first. */
const MAX_ATTEMPTS = 3;

/** Whole-call wall-clock budget, so an outage can't pin a request open. */
const DEADLINE_MS = 12_000;

/** Ceiling on a 429's `retry_after`, which can be minutes. */
const MAX_BACKOFF_MS = 10_000;

// ==========================================
// TYPES
// ==========================================

export interface InlineKeyboardButton {
  text: string;
  url: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface SentMessage {
  chatId: string;
  messageId: number;
}

/** Tuning for one call. The create path passes a tighter budget. */
export interface TelegramCallOptions {
  timeoutMs?: number;
  deadlineMs?: number;
  attempts?: number;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

/**
 * The envelope every Bot API method answers with.
 * https://core.telegram.org/bots/api#making-requests
 */
interface TelegramEnvelope<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;

  parameters?: {
    retry_after?: number;
  };
}

// ==========================================
// ERRORS
// ==========================================

/**
 * Raised when `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHANNEL_ID` is unset.
 * Callers are expected to check `isTelegramConfigured()` first and
 * skip the side effect entirely rather than record a failure that
 * isn't one.
 */
export class TelegramNotConfiguredError extends Error {
  constructor() {
    super(
      "Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID."
    );

    this.name = "TelegramNotConfiguredError";
  }
}

interface TelegramApiErrorInit {
  method: string;

  /** `null` for a transport failure, which has no Telegram error code. */
  errorCode: number | null;

  /** Telegram's own wording. Safe to show an admin — carries no token. */
  description: string;

  retryAfter?: number | null;
}

export class TelegramApiError extends Error {
  readonly method: string;
  readonly errorCode: number | null;
  readonly description: string;
  readonly retryAfter: number | null;
  readonly retryable: boolean;

  constructor(init: TelegramApiErrorInit) {
    super(`Telegram ${init.method} failed: ${init.description}`);

    this.name = "TelegramApiError";
    this.method = init.method;
    this.errorCode = init.errorCode;
    this.description = init.description;
    this.retryAfter = init.retryAfter ?? null;

    // A malformed keyboard, unparseable HTML, or a channel the bot was
    // never added to will fail identically forever. Retrying those only
    // burns time inside a request an admin is waiting on.
    this.retryable =
      init.errorCode === null ||
      init.errorCode === 429 ||
      init.errorCode >= 500;
  }

  /**
   * Telegram answers an edit that changes nothing with a 400. It means
   * the post already says exactly what we wanted it to, so this is a
   * success wearing an error's clothes.
   */
  get isNotModified(): boolean {
    return this.description.includes("message is not modified");
  }

  /** Someone deleted the post in the channel; our message id is stale. */
  get isMessageGone(): boolean {
    return (
      this.description.includes("message to edit not found") ||
      this.description.includes("MESSAGE_ID_INVALID") ||
      this.description.includes("message can't be edited")
    );
  }
}

// ==========================================
// CONFIGURATION
// ==========================================

function readConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHANNEL_ID?.trim();

  if (!botToken || !chatId) {
    return null;
  }

  return {
    botToken,
    chatId,
  };
}

/**
 * Whether channel posting is switched on at all. Server components
 * call this to decide between the live UI and the "not configured"
 * copy.
 */
export function isTelegramConfigured(): boolean {
  return readConfig() !== null;
}

interface ChatInfo {
  id: string;
  username: string | null;
}

const NUMERIC_CHAT_ID = /^-?\d+$/;

/**
 * `getChat` results by chat reference (`@username` or numeric id),
 * looked up once per server process. A failed lookup is forgotten, so
 * a transient outage isn't remembered until the next deploy.
 */
const chatLookups = new Map<string, Promise<ChatInfo>>();

function lookupChat(chatRef: string): Promise<ChatInfo> {
  const cached = chatLookups.get(chatRef);

  if (cached) {
    return cached;
  }

  const lookup = callTelegram<{ id: number; username?: string }>(
    "getChat",
    { chat_id: chatRef },
    { attempts: 1 }
  ).then((chat) => ({
    id: String(chat.id),
    username: chat.username ?? null,
  }));

  chatLookups.set(chatRef, lookup);

  lookup.catch(() => {
    chatLookups.delete(chatRef);
  });

  return lookup;
}

async function resolveChatId(chatRef: string): Promise<string> {
  return NUMERIC_CHAT_ID.test(chatRef)
    ? chatRef
    : (await lookupChat(chatRef)).id;
}

/** Usernames are case-insensitive; numeric ids compare exactly. */
function isSameChatRef(a: string, b: string): boolean {
  return (
    a === b ||
    (a.startsWith("@") &&
      b.startsWith("@") &&
      a.toLowerCase() === b.toLowerCase())
  );
}

/**
 * Whether a post recorded as sent to `postChatId` lives in the channel
 * `TELEGRAM_CHANNEL_ID` names now — `null` when Telegram couldn't be
 * asked. Never throws.
 *
 * A message id is only a number within one chat. In any other channel
 * the same number is some unrelated post, and the Bot API has no way to
 * read a post before editing or deleting it. So an edit or delete is
 * only safe once this says `true`; otherwise a job's sync overwrites
 * whichever old post happens to carry its number.
 */
export async function isInConfiguredChannel(
  postChatId: string | null
): Promise<boolean | null> {
  const configured = process.env.TELEGRAM_CHANNEL_ID?.trim();

  if (!configured || !postChatId) {
    return false;
  }

  if (isSameChatRef(postChatId, configured)) {
    return true;
  }

  // The same channel can be written as `@username` or `-100…`, so two
  // different strings only mean two channels once both are resolved.
  let configuredId: string;

  try {
    configuredId = await resolveChatId(configured);
  } catch {
    return null;
  }

  try {
    return (await resolveChatId(postChatId)) === configuredId;
  } catch (cause) {
    // The bot can see the configured channel but not this one — a
    // channel it was removed from, or a username that no longer
    // exists — so it is a different chat.
    if (cause instanceof TelegramApiError && !cause.retryable) {
      return false;
    }

    return null;
  }
}

/**
 * A public channel has a `t.me` permalink; a private one does not.
 *
 * `TELEGRAM_CHANNEL_ID` may be either an `@username` — which answers
 * the question by itself — or a numeric `-100…` id, which does not.
 * A numeric id is the more robust thing to configure (it survives a
 * rename), so rather than making people choose between robustness and
 * a working link, the username is looked up through `lookupChat`.
 */
async function resolveChannelUsername(): Promise<string | null> {
  const chatId = process.env.TELEGRAM_CHANNEL_ID?.trim();

  if (!chatId) {
    return null;
  }

  if (chatId.startsWith("@")) {
    return chatId.slice(1);
  }

  return lookupChat(chatId)
    .then((chat) => chat.username)
    .catch(() => null);
}

/**
 * The public `t.me` permalink for a post, or `null` if there isn't one
 * — including when the post was sent to a different channel than the
 * configured one, where the same message id is someone else's post.
 */
export async function buildChannelMessageUrl(
  messageId: number,
  postChatId: string | null
): Promise<string | null> {
  const [username, inChannel] = await Promise.all([
    resolveChannelUsername(),
    isInConfiguredChannel(postChatId),
  ]);

  return username && inChannel
    ? `https://t.me/${username}/${messageId}`
    : null;
}

// ==========================================
// TRANSPORT
// ==========================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One Bot API method call, with a bounded retry and a wall-clock
 * budget.
 *
 * Retryable: 429 (honouring `parameters.retry_after`), any 5xx, and
 * transport failures including the timeout. Everything else is
 * permanent — see `TelegramApiError.retryable`.
 */
async function callTelegram<T>(
  method: string,
  payload: Record<string, unknown>,
  options: TelegramCallOptions = {}
): Promise<T> {
  const config = readConfig();

  if (!config) {
    throw new TelegramNotConfiguredError();
  }

  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const maxAttempts = options.attempts ?? MAX_ATTEMPTS;
  const deadline =
    Date.now() + (options.deadlineMs ?? DEADLINE_MS);

  let lastError: TelegramApiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let envelope: TelegramEnvelope<T> | null = null;
    let httpStatus = 0;

    try {
      const response = await fetch(
        `${API_ROOT}/bot${config.botToken}/${method}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            chat_id: config.chatId,
            ...payload,
          }),

          signal: AbortSignal.timeout(timeoutMs),

          cache: "no-store",
        }
      );

      httpStatus = response.status;

      envelope = (await response
        .json()
        .catch(() => null)) as TelegramEnvelope<T> | null;
    } catch (cause) {
      // Timeout, DNS, TLS. Deliberately does not interpolate `cause`
      // into the message — a fetch error can echo back the request
      // URL, and that URL contains the bot token.
      lastError = new TelegramApiError({
        method,
        errorCode: null,
        description:
          cause instanceof Error && cause.name === "TimeoutError"
            ? `No response from Telegram within ${timeoutMs}ms.`
            : "Could not reach Telegram.",
      });
    }

    if (envelope?.ok && envelope.result !== undefined) {
      return envelope.result;
    }

    if (envelope && !envelope.ok) {
      lastError = new TelegramApiError({
        method,
        errorCode: envelope.error_code ?? httpStatus,
        description:
          envelope.description ?? `Telegram returned HTTP ${httpStatus}.`,
        retryAfter: envelope.parameters?.retry_after ?? null,
      });
    } else if (!lastError) {
      lastError = new TelegramApiError({
        method,
        errorCode: httpStatus || null,
        description: `Unreadable response from Telegram (HTTP ${httpStatus}).`,
      });
    }

    if (!lastError.retryable || attempt === maxAttempts) {
      break;
    }

    const backoff =
      lastError.retryAfter !== null
        ? Math.min(lastError.retryAfter * 1000 + 250, MAX_BACKOFF_MS)
        : 500 * 2 ** (attempt - 1);

    if (Date.now() + backoff >= deadline) {
      break;
    }

    await sleep(backoff);
  }

  throw (
    lastError ??
    new TelegramApiError({
      method,
      errorCode: null,
      description: "Telegram request failed.",
    })
  );
}

// ==========================================
// METHODS
// ==========================================

export async function sendChannelMessage(
  input: {
    text: string;
    replyMarkup?: InlineKeyboardMarkup;
  },
  options?: TelegramCallOptions
): Promise<SentMessage> {
  const result = await callTelegram<{
    message_id: number;
    chat: { id: number };
  }>(
    "sendMessage",
    {
      text: input.text,

      link_preview_options: {
        is_disabled: true,
      },

      reply_markup: input.replyMarkup,
    },
    options
  );

  // The numeric id Telegram answers with, not `TELEGRAM_CHANNEL_ID` as
  // written: it is what `isInConfiguredChannel` checks later, and it
  // stays the same however the variable spells the channel.
  return {
    chatId: String(result.chat.id),
    messageId: result.message_id,
  };
}

/**
 * Edits a post in place.
 *
 * `reply_markup` is always sent explicitly: omitting it on an edit
 * *drops* the existing keyboard, so `{ inline_keyboard: [] }` is the
 * deliberate "no button" — which is exactly what a closed job wants,
 * rather than a call to action leading nowhere.
 */
export async function editChannelMessageText(
  input: {
    messageId: number;
    text: string;
    replyMarkup?: InlineKeyboardMarkup;
  },
  options?: TelegramCallOptions
): Promise<void> {
  await callTelegram<unknown>(
    "editMessageText",
    {
      message_id: input.messageId,
      text: input.text,

      link_preview_options: {
        is_disabled: true,
      },

      reply_markup: input.replyMarkup ?? {
        inline_keyboard: [],
      },
    },
    options
  );
}

/** Not used by the sync flow — kept for a future "unpublish". */
export async function deleteChannelMessage(
  input: { messageId: number },
  options?: TelegramCallOptions
): Promise<void> {
  await callTelegram<unknown>(
    "deleteMessage",
    {
      message_id: input.messageId,
    },
    options
  );
}
