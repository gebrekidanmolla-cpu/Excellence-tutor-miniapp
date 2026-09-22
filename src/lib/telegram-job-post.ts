import { prisma } from "@/lib/prisma";
import {
  editChannelMessageText,
  isTelegramConfigured,
  sendChannelMessage,
  TelegramApiError,
  TelegramNotConfiguredError,
  type TelegramCallOptions,
} from "@/lib/telegram";
import { renderJobChannelPost } from "@/lib/telegram-post";

// ==========================================
// JOB ↔ CHANNEL POST SYNC
// ==========================================
//
// The single entry point every route uses. Publishes a job that has
// no channel post yet, edits the one it already has, and records the
// outcome on the row.
//
// SERVER ONLY.
//
// This inverts the contract of `email.ts`, which always throws and
// leaves containment to its callers. Containment *is* this module's
// job: it is called from five routes, and duplicating the try/catch
// in each of them is how one of them eventually gets it wrong. A
// Telegram failure comes back as a `FAILED` outcome, never as an
// exception, so a successful job creation can never turn into a 500.
//
// ==========================================

/**
 * How long a claim is honoured. Must comfortably exceed the Telegram
 * client's own deadline (12s by default), or a slow-but-succeeding
 * send could be raced by a second request that steals the claim.
 */
const LOCK_TTL_MS = 60_000;

/** `telegramPostError` is rendered in the admin UI; keep it readable. */
const ERROR_MAX_LENGTH = 500;

export type TelegramSyncOutcome =
  | {
      status: "SKIPPED";
      reason: "NOT_CONFIGURED" | "NO_CHANGE" | "IN_PROGRESS";
      message: string;
    }
  | { status: "PUBLISHED"; messageId: number; message: string }
  | { status: "EDITED"; messageId: number; message: string }
  | { status: "FAILED"; message: string };

export interface SyncOptions extends TelegramCallOptions {
  /** Re-send the edit even when the content hash says nothing changed. */
  force?: boolean;

  /** Forget the stored message id and publish a brand-new post. */
  repost?: boolean;
}

const JOB_SELECT = {
  id: true,
  jobCode: true,
  gender: true,
  grade: true,
  subject: true,
  place: true,
  salary: true,
  daysPerWeek: true,
  hoursPerDay: true,
  additionalDetails: true,
  status: true,
  telegramMessageId: true,
  telegramPostHash: true,
  telegramPostStatus: true,
} as const;

function describe(cause: unknown): string {
  // Only Telegram's own `description` is ever surfaced. A raw fetch
  // error can echo the request URL back, and that URL carries the
  // bot token.
  if (cause instanceof TelegramApiError) {
    return cause.description;
  }

  if (cause instanceof TelegramNotConfiguredError) {
    return cause.message;
  }

  return "Telegram post failed.";
}

/**
 * Publish or re-sync a job's channel post.
 *
 * Never throws for a Telegram failure — the failure is written to the
 * job row and returned, so the admin UI can show it and offer a
 * retry.
 */
export async function syncJobTelegramPost(
  jobId: string,
  options: SyncOptions = {}
): Promise<TelegramSyncOutcome> {
  if (!isTelegramConfigured()) {
    // Not an error: nobody asked for Telegram posting. Mark the row so
    // the UI can say so, but never overwrite a job that really is live
    // in the channel from a previous deployment.
    await prisma.job
      .updateMany({
        where: {
          id: jobId,
          telegramMessageId: null,
          telegramPostStatus: { not: "DISABLED" },
        },
        data: {
          telegramPostStatus: "DISABLED",
        },
      })
      .catch(() => undefined);

    return {
      status: "SKIPPED",
      reason: "NOT_CONFIGURED",
      message: "Telegram posting is not configured.",
    };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: JOB_SELECT,
  });

  if (!job) {
    return {
      status: "FAILED",
      message: "Job not found.",
    };
  }

  const rendered = renderJobChannelPost(job);

  const existingMessageId = options.repost
    ? null
    : job.telegramMessageId;

  // Nothing changed and the last attempt succeeded — no API call at
  // all. This is also what keeps Telegram's "message is not modified"
  // 400 from firing on every no-op PATCH.
  if (
    !options.force &&
    !options.repost &&
    existingMessageId !== null &&
    job.telegramPostStatus === "POSTED" &&
    job.telegramPostHash === rendered.contentHash
  ) {
    return {
      status: "SKIPPED",
      reason: "NO_CHANGE",
      message: "The Telegram post is already up to date.",
    };
  }

  // ---------------------------------------------------
  // Claim
  // ---------------------------------------------------
  //
  // The same conditional-write idiom the rest of the admin API uses:
  // a `where` that restates the precondition, so only one of two
  // concurrent requests can match. The `telegramMessageId` term is a
  // compare-and-swap — two requests that both see "unpublished" race
  // here, and exactly one of them wins the right to send.

  const claim = await prisma.job.updateMany({
    where: {
      id: job.id,
      telegramMessageId: existingMessageId,

      OR: [
        { telegramLockedAt: null },
        { telegramLockedAt: { lt: new Date(Date.now() - LOCK_TTL_MS) } },
      ],
    },

    data: {
      telegramLockedAt: new Date(),
    },
  });

  if (claim.count === 0) {
    return {
      status: "SKIPPED",
      reason: "IN_PROGRESS",
      message: "Another Telegram sync is already running for this job.",
    };
  }

  const callOptions: TelegramCallOptions = {
    timeoutMs: options.timeoutMs,
    deadlineMs: options.deadlineMs,
    attempts: options.attempts,
  };

  try {
    // ---------------------------------------------------
    // Publish
    // ---------------------------------------------------

    if (existingMessageId === null) {
      const sent = await sendChannelMessage(
        {
          text: rendered.text,
          replyMarkup: rendered.replyMarkup,
        },
        callOptions
      );

      const now = new Date();

      await prisma.job.update({
        where: { id: job.id },
        data: {
          telegramPostStatus: "POSTED",
          telegramChatId: sent.chatId,
          telegramMessageId: sent.messageId,
          telegramPostHash: rendered.contentHash,
          telegramPostedAt: now,
          telegramSyncedAt: now,
          telegramPostError: null,
          telegramLockedAt: null,
        },
      });

      return {
        status: "PUBLISHED",
        messageId: sent.messageId,
        message: "Posted to the Telegram channel.",
      };
    }

    // ---------------------------------------------------
    // Edit
    // ---------------------------------------------------

    try {
      await editChannelMessageText(
        {
          messageId: existingMessageId,
          text: rendered.text,
          replyMarkup: rendered.replyMarkup,
        },
        callOptions
      );
    } catch (cause) {
      if (cause instanceof TelegramApiError && cause.isNotModified) {
        // The channel already shows exactly this. Fall through and
        // persist the hash so we stop asking.
      } else if (cause instanceof TelegramApiError && cause.isMessageGone) {
        // Someone deleted the post. Forget it and publish a fresh one.
        // Bounded: the row's message id is now null, so the recursive
        // call takes the publish branch and cannot recurse again.
        await prisma.job.update({
          where: { id: job.id },
          data: {
            telegramMessageId: null,
            telegramPostHash: null,
            telegramLockedAt: null,
          },
        });

        return syncJobTelegramPost(job.id, {
          ...options,
          repost: false,
        });
      } else {
        throw cause;
      }
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        telegramPostStatus: "POSTED",
        telegramPostHash: rendered.contentHash,
        telegramSyncedAt: new Date(),
        telegramPostError: null,
        telegramLockedAt: null,
      },
    });

    return {
      status: "EDITED",
      messageId: existingMessageId,
      message: "The Telegram post was updated.",
    };
  } catch (cause) {
    const description = describe(cause);

    console.error(
      `Telegram sync failed for job ${job.jobCode}:`,
      description
    );

    // Deliberately leaves `telegramMessageId` alone — a failed edit
    // does not mean the post is gone, and clearing it would make the
    // retry publish a duplicate.
    await prisma.job
      .update({
        where: { id: job.id },
        data: {
          telegramPostStatus: "FAILED",
          telegramPostError: description.slice(0, ERROR_MAX_LENGTH),
          telegramLockedAt: null,
        },
      })
      .catch((writeError) => {
        console.error("Failed to record the Telegram error:", writeError);
      });

    return {
      status: "FAILED",
      message: description.slice(0, ERROR_MAX_LENGTH),
    };
  }
}

/**
 * What the API routes call.
 *
 * `syncJobTelegramPost` already contains every Telegram failure; this
 * additionally swallows a database failure while *recording* one, so
 * that a side effect can never turn a committed job change into a
 * 500 under any circumstance.
 */
export async function safeSyncJobTelegramPost(
  jobId: string,
  options?: SyncOptions
): Promise<TelegramSyncOutcome> {
  try {
    return await syncJobTelegramPost(jobId, options);
  } catch (error) {
    console.error("Telegram sync crashed:", error);

    return {
      status: "FAILED",
      message: "Telegram post failed.",
    };
  }
}
