import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { isTelegramConfigured } from "@/lib/telegram";
import { syncJobTelegramPost } from "@/lib/telegram-job-post";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Manual re-post / re-sync.
 *
 * Every other Telegram write is a side effect of a job change and is
 * deliberately silent about failure. This is the one route whose
 * entire purpose is the Telegram call, so here a failure *is* the
 * result: it answers 502 with Telegram's own wording, which the admin
 * UI shows inline.
 *
 * Body (optional, an empty body is fine):
 *   { force?: boolean }   defaults to true — see below
 *   { repost?: boolean }  forget the stored message and post anew,
 *                         abandoning the old one
 */
export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    // The button sends a body; a bare curl might not.
    const body = await request
      .json()
      .catch(() => ({}));

    // Forcing is the default here, unlike the five automatic call
    // sites. Their content-hash short-circuit exists to avoid pointless
    // API calls on every edit; on *this* route it would defeat the
    // purpose. Somebody pressing a retry button is usually asking
    // precisely because reality and the stored state disagree — most
    // often because the channel post was deleted, which is something
    // only an actual `editMessageText` attempt can discover.
    const force = body?.force !== false;
    const repost = body?.repost === true;

    const job = await prisma.job.findUnique({
      where: { id },

      select: {
        id: true,
        jobCode: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found.",
        },
        { status: 404 }
      );
    }

    if (!isTelegramConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Telegram posting is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID.",
        },
        { status: 409 }
      );
    }

    const telegram = await syncJobTelegramPost(
      job.id,
      {
        force,
        repost,
      }
    );

    if (telegram.status === "FAILED") {
      return NextResponse.json(
        {
          success: false,
          message: telegram.message,
          telegram,
        },
        { status: 502 }
      );
    }

    if (
      telegram.status === "SKIPPED" &&
      telegram.reason === "IN_PROGRESS"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: telegram.message,
          telegram,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: telegram.message,
      telegram,
    });
  } catch (error) {
    console.error(
      "Failed to sync the Telegram post:",
      error
    );

    // Everything Telegram can go wrong with is already contained and
    // returned as a FAILED outcome above, so reaching here means the
    // failure was ours — nearly always a Prisma client that predates
    // the last `prisma generate`, which a long-running dev server
    // keeps in memory. "Please try again" sends people in circles for
    // that, so surface the real message. This route is admin-gated
    // and diagnostic by nature; the bot token never appears in a
    // Prisma error.
    const detail =
      error instanceof Error ? error.message.split("\n")[0] : "";

    const looksStale =
      detail.includes("Unknown argument") ||
      detail.includes("Unknown field") ||
      detail.includes("telegram");

    return NextResponse.json(
      {
        success: false,

        message: looksStale
          ? "The server is running an out-of-date database client. Restart the dev server (the schema changed under it) and try again."
          : `Failed to sync the Telegram post: ${
              detail || "unexpected error"
            }`,
      },
      { status: 500 }
    );
  }
}
