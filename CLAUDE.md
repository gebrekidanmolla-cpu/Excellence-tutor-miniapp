# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Next **16.2.12** / React **19.2.4**, both pinned. That warning in `AGENTS.md` is not boilerplate — this release is newer than most training data and the App Router APIs have moved. Two that have already caught people here: `error.tsx` receives **`unstable_retry`**, not `reset` (`reset` still exists but only clears the boundary without re-fetching — see `src/components/layout/RouteError.tsx`), and `params` in route handlers and pages is a `Promise` that must be awaited. `eslint-config-next/core-web-vitals` brings the react-hooks v6 rules, which reject `watch()` from `useForm` (use `useWatch`), `setState` called synchronously inside an effect, and `Date.now()` during render.

## Commands

```bash
npm run dev      # start dev server (Turbopack, http://localhost:3000)
npm run build    # production build
npm run start    # run a production build (run `build` first)
npm run lint     # eslint (flat config: eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit # typecheck — lint does not catch type errors, and `next dev` doesn't block on them
```

There is no test script/framework configured in this repo.

Prisma (schema at `prisma/schema.prisma`, config at `prisma.config.ts` — see below):

```bash
npx prisma db push        # apply schema changes (see the warning below)
npx prisma generate       # regenerate the Prisma Client after schema changes
npx prisma studio         # browse the database
npx prisma db seed        # runs prisma/seed.ts (upserts a sample Job + the initial Admin)
```

`npm install` also runs `prisma generate` via `postinstall`. Without it a fresh install (every Vercel build) has no generated client and `next build` fails on the Prisma types. Locally that failure stays hidden, because an old client is still sitting in `node_modules`.

**There is no `prisma/migrations/` directory, and this project has never run `prisma migrate`.** Schema changes are applied with `db push`. Do **not** reach for `npx prisma migrate dev`: against a populated database with no migration history it detects drift and offers to **reset**, which would drop every row. Adopting migrations properly (`migrate diff --from-empty` into a `0_init` baseline, then `migrate resolve --applied`) is a deliberate separate task, not something to do in passing.

**After any schema change, restart the dev server.** A long-running `next dev` keeps the previously generated Prisma Client in memory: routes hot-reload but queries silently drop the new columns, and selecting one throws `Unknown field`. `tsc` and a freshly started server both look fine, which makes this easy to misdiagnose as a bug in new code.

## Environment variables

Defined in `.env` (gitignored); `.env.example` lists every key. Required across the app: `DIRECT_URL` (Postgres connection string, used by both `prisma.config.ts` and `src/lib/prisma.ts`), `SESSION_SECRET` (HMAC key for both session cookies), `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (document storage; optional `R2_BUCKET`, default `tutor-documents`), `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` (outgoing mail; optional `SMTP_PORT`, default `587`), `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` (consumed only by the seed script), `PARENT_PROFILE_URL` (optional; origin of the parent-facing tutor profile links — see *Three surfaces*), `NEXT_PUBLIC_APP_URL` (applicant links in emails and in the Telegram post — a `localhost` value is deliberately ignored when building the channel post's button).

Telegram channel posting: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID` (secret — never `NEXT_PUBLIC_`), plus the testing-only `TELEGRAM_ALLOW_LOCAL_LINKS`. With either unset the whole feature is an inert no-op: jobs still save, and `next build` still succeeds — `src/lib/telegram.ts` reads its config per call rather than at module load, like `src/lib/r2.ts`. `NEXT_PUBLIC_BOT_USERNAME` is declared but read nowhere (safe to delete); the product is web-only and the channel post's button links to `/apply/<jobCode>`.

Google Sheets mirroring: `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_WIF_PROJECT_NUMBER`, `GOOGLE_WIF_POOL_ID`, `GOOGLE_WIF_PROVIDER_ID`, `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL`, plus the optional `GOOGLE_SHEETS_TAB_NAME` (defaults to `"Sheet1"`). Same inert-no-op contract as Telegram — `src/lib/google-sheets.ts` reads its config per call. Auth is Workload Identity Federation, **not** a service-account key — this org's `iam.disableServiceAccountKeyCreation` policy forbids downloading one. Vercel signs a short-lived OIDC token into every invocation (`VERCEL_OIDC_TOKEN`, via `@vercel/oidc`'s `getVercelOidcToken()` — never set this by hand; `vercel env pull` / `vercel dev` populate it for local dev), and GCP exchanges it for a token impersonating the service account named by `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL` — that account is what's shared with the sheet as Editor, and it holds no downloadable credential of its own. None of the `GOOGLE_WIF_*` vars are secrets; they're identifiers. Read-only mirror/backup, never a trigger: `src/lib/job-sheet-sync.ts`'s `safeSyncJobSheetRow` is called from four of the five routes that call `safeSyncJobTelegramPost` — job create, edit, application assign, job reopen; not `.../status`, because the sheet has no status column — and writes the job's Code / Parent's Name / Parent's Phone / Tutor's Name / Tutor's Phone into a matching sheet row. Nothing ever reads the sheet for business logic. Like the Telegram sync it never throws and records every outcome on the `Job` row (`sheetSyncStatus`, `sheetSyncError`, `sheetSyncedAt`). The job page has a per-job retry (`POST /api/admin/jobs/[id]/sheet`, which calls the throwing `syncJobSheetRow`) and the jobs list a "Sync all to sheet" backfill (`POST /api/admin/jobs/sheet-sync` → `syncAllJobSheetRows`), which costs three Sheets API calls in total rather than two per job — the API allows 60 requests a minute. Closing a job does not touch the sheet. Deleting one removes its row (`safeRemoveJobSheetRow`, by job code, since the `Job` row is already gone — so the outcome goes in the DELETE response rather than onto the row).

### Outgoing email

`src/lib/email.ts` sends over plain SMTP through the domain's own DirectAdmin
mailbox (nodemailer). It replaced Resend — there is no email API key any more,
and no `resend` dependency.

Two things about this setup are easy to get wrong:

- **`SMTP_HOST` is the shared server's hostname, not `mail.<domain>`.** The host
  presents a Let's Encrypt certificate covering only its own name, so pointing
  `SMTP_HOST` at the vanity `mail.` record fails TLS verification even though
  DNS resolves it to the same machine. Do not "fix" that by disabling
  `rejectUnauthorized`; either keep the server hostname, or get a certificate
  issued that covers the vanity name (DirectAdmin's default request asks for a
  *wildcard*, which forces DNS-01 validation and fails, because DirectAdmin
  writes the challenge record into a zone it does not serve — DNS is on Vercel).
- **`EMAIL_FROM` must be a mailbox that actually exists on that account.** An
  SMTP server rejects a `From:` it does not own. Resend was laxer here, so a
  value that worked before may not now.

Port 587 (STARTTLS) and 465 (implicit TLS) both work from Vercel functions;
**port 25 is blocked** and will hang until the socket timeout.

Outgoing mail leaves through the host's outbound filter rather than the web
server's own IP, which is why the domain's SPF record needs the provider's
`include:` and not just an `ip4:` of the server. That filter also keeps a
per-recipient suppression list: a `550 ... suspended — recent hard bounces`
rejection comes from the filter, not from the recipient's provider, and only
the host can clear it.

Unlike `telegram.ts`, this module **always throws** on failure. Callers decide
what that means — the notify steps in the assign and reopen routes catch and
swallow, because the database write has already committed.

## Deployment

The site is hosted on Vercel as project `excellence-tutor-miniapp`, served at `excellencehometutor.com`. The project is Git-connected with `main` as its production branch, so production is whatever is merged into `main`. Work on a feature branch reaches production only through a merged PR. A changed env var only takes effect after a redeploy (`vercel redeploy <deployment-url>`), which rebuilds from the same Git commit. Many API routes catch errors and return only a generic message such as "Unable to send verification code". The real cause is in the runtime logs: `vercel logs https://excellencehometutor.com` tails them live, so start it *before* you send the request. When testing email, send to a real mailbox you control, not `@example.com`: reserved domains accept no mail, so the message hard-bounces — and hard bounces are what feed the outbound filter's suppression list (see *Outgoing email*).

Functions run in `dub1` (Dublin), pinned by `regions` in `vercel.json`, because the Supabase database is in `eu-west-1`. Vercel's default `iad1` puts every query, and every new pooler connection's TLS + SCRAM handshake, across the Atlantic.

The project is on the **Hobby** plan, whose binding limit is Fluid Active CPU (4 h per rolling 30 days). Cost is mostly per invocation, so:

- **A `<Link>` to a dynamic route gets `prefetch={false}`.** In this Next version (no Cache Components, no PPR), prefetching a dynamic route costs **two** function invocations: a `/_tree` request, then a render of every layout down to the nearest `loading.tsx`, session query included. Nav links, which appear on every page, multiplied that into about half of all invocations. The nav shows a pending state through `useLinkStatus` (`NavPendingDot` in `SidebarNav.tsx`, `TabIcon` in `PortalShell.tsx`) instead. Links to prerendered pages (`/`, `/login`, `/register`, `/forgot-password`) are `IntentLink` (`src/components/shared/IntentLink.tsx`), which prefetches on hover, touch or focus instead of on sight. Their prefetch costs no CPU, but every one is a CDN request against Hobby's 1M a month, and it pulls that page's scripts too: `/forgot-password` drew ~850 requests a day from the login page's link for ~15 real resets, and a viewport prefetch of `/register` downloaded the whole wizard (~150 KB) on every landing and job page visit. No `<Link>` in the repo prefetches on sight.
- **CDN requests are the closest Hobby limit** (1M a month; the site serves ~18–34K a day). The manifest and icons get a browser cache in `next.config.ts` `headers()`, because Next's `max-age=0` had every page view ask for them again. `/api/jobs` is `force-static` and refreshed by `refreshPublicJobPages`, so the `/jobs` list comes from the CDN instead of a function.
- **Fonts preload only where they're used.** next/font preloads a font on every route under the module that declares it, so the root layout declares only Geist (with Geist Mono not preloaded). Fraunces, the ~265 KB headline face, lives in `src/lib/fonts.ts`, and only the three pages that use it import it and put `fraunces.variable` on a wrapper. A new page using `font-display` / `font-serif` must do the same, or it renders in the fallback serif.
- **Don't export `maxDuration` from a route.** Fluid's default is already 300 s, and a route with any other value is split into a function of its own. That function cold-starts separately, and a cold start costs ~1–2 s of CPU (loading Next, React and Prisma), against ~10–50 ms for a warm request. The admin job routes had `30`/`60` from when the default was 10 s, which made them two extra rarely-warm functions.
- **Measuring CPU:** `src/lib/cpu-log.ts`, started from `src/instrumentation.ts`, logs one JSON line per request (`{"cpu":"req","p":…,"ms":…}`) and per new instance (`{"cpu":"boot"}`) to the runtime logs. Query strings are dropped and id-like path segments redacted. Read them with `vercel logs --json`, stepping `--until` back through the hour. `CPU_LOG=0` turns it off.
- **bcrypt is the fixed floor.** Each login, registration or reset is ~0.3 s of CPU at cost 12, and the cost stays at 12.
- Hobby keeps about an hour of runtime logs, and `vercel logs` returns the newest ~50 rows of a window. Stepping `--until` back to the oldest row returned walks the whole hour. `vercel firewall traffic inspect host excellencehometutor.com --group-by path` gives 24-hour per-path request counts without Observability Plus.

## Architecture

### Three surfaces under `src/app`

- **Public site** — `/`, `/apply/[jobCode]`, `/login`, `/register`, `/application-success`. There is **no** `/jobs/[jobCode]` page: `/apply/[jobCode]` owns both showing a job and acting on it, which is why it stays readable signed out (it swaps the apply button for a sign-in prompt) — Telegram posts link straight to it. A request with no `tutor_session` cookie is rewritten in `next.config.ts` to `/apply/[jobCode]/guest`, a cached (ISR) copy that never reads the session; both renderings share `JobApplyView.tsx`. Every job write refreshes the job's copy through `refreshPublicJobPages(jobCode)`, which revalidates by the rewrite *destination*. A navigation that sets the cookie must call `router.refresh()`, as login and registration do, or the router cache can keep serving the signed-out copy. `/tutor-profile/[token]` is the tutor profile an admin sends to parents: gated by the random `Tutor.profileShareToken` (created, reset and turned off from the tutor's admin page via `/api/admin/tutors/[id]/share`), never by the tutor id, and dead after `Tutor.profileShareExpiresAt` — 30 days from creation or reset; a token with no expiry counts as expired. The page and its document route both resolve the token through `findSharedTutor` in `src/lib/tutor-profile-server.ts`, so the expiry rule lives in one place. It shows every document including the government ID, and omits phone, email and exact address; see `src/lib/tutor-profile.ts`. In production the admin copies `https://parent.excellencehometutor.com/<token>` instead: `PARENT_PROFILE_URL` names that origin, the subdomain is attached to the same Vercel project, and `src/proxy.ts` (Next 16's name for middleware — the only one in the repo) rewrites `/<token>` on that host to `/tutor-profile/<token>`, lets `/api/tutor-profile/**` through, and answers every other path (`/` included) with the profile route's own parent-facing 404 — the subdomain never shows the landing page. With the var unset (local dev) the proxy is a no-op and links use the long form, which keeps working on the main domain regardless.
- **Tutor portal** — `/tutor/**`, gated by `src/app/tutor/layout.tsx`, which calls `getCurrentTutor()` and redirects to `/login` if absent. `/jobs` is *also* signed-in-only and renders in the same `PortalShell` (`src/app/jobs/layout.tsx`) despite sitting outside `/tutor`.
- **Admin dashboard** — `src/app/admin/(dashboard)/**` (route group, doesn't affect the URL), gated by `src/app/admin/(dashboard)/layout.tsx` calling `getCurrentAdmin()`. `/admin/login` sits outside the group so it isn't gated.

### Auth: two independent, hand-rolled cookie sessions

No auth library — `src/lib/session.ts` (tutor, cookie `tutor_session`, 30 days) and `src/lib/admin-session.ts` (admin, cookie `admin_session`, 7 days) are near-identical implementations: JSON payload → base64url, signed with HMAC-SHA256 (`SESSION_SECRET`) via `createHmac`, verified with `timingSafeEqual`. Passwords are hashed with bcryptjs (`src/lib/auth.ts`, cost 12). When adding a new protected area, mirror the existing pattern rather than introducing a third session shape.

**Every non-auth route under `src/app/api/admin/**` gates itself** by calling `getCurrentAdmin()` and returning a 401 when it is null. Mirror that in any new route.

**Every page under `src/app/admin/(dashboard)/**` calls `requireAdmin()`** (`src/lib/admin-context.ts`) as well as the layout, because Next does not re-render a layout on client navigation. On a full load the call is memoized with the layout's. It runs one raw-SQL statement that returns the admin *and* the queue counts the nav badges and the overview tiles show, so the counts cost no extra query. The badges therefore refresh on a full load or a `router.refresh()`, not on every click between pages.

The two logout routes are not symmetric: `POST /api/admin/auth/logout` responds with a **redirect**, so it has to stay a real form POST; the tutor's `POST /api/auth/logout` returns JSON for a `fetch` caller.

### Data layer: Prisma 7 with a driver adapter

`prisma/schema.prisma` has no `url` in its `datasource` block — the connection string comes from `prisma.config.ts` (`defineConfig`, Prisma 7's config file) and from `DIRECT_URL` directly in `src/lib/prisma.ts`, which constructs `PrismaClient` with `@prisma/adapter-pg` (`PrismaPg`) rather than a bare connection string. `prisma/seed.ts` builds its own client the same way (adapter + `DIRECT_URL`) since it runs outside the app.

`DIRECT_URL` is Supabase's pooler, not a direct connection, and the pooler caps the whole project at 15 clients in session mode (port 5432). `src/lib/prisma.ts` therefore hands the adapter its own `pg` `Pool` capped at 3 connections with a 5 s idle timeout, registered with `attachDatabasePool` from `@vercel/functions` so idle connections are closed before Vercel suspends the instance. Don't go back to passing a bare `connectionString`: pg's default of 10 connections per instance, held open while instances sit frozen, is what produced `EMAXCONNSESSION max clients reached` in production.

Core models (`prisma/schema.prisma`): `Job` (a posting, optionally `assignedTutor`), `Tutor` (account + long profile: student vs. graduate fields gated by `tutorStatus`, document URLs, entrance exam scores), `Application` (join of `Tutor`↔`Job`, unique per pair, `status` enum PENDING→REVIEWED/ACCEPTED/REJECTED), `EmailVerification` (short-lived code + attempts for registration), `Admin`. Accepting an application (`.../assign/route.ts`) runs a single `$transaction` that accepts the one application, rejects the job's other applications, and closes the job — treat that flow as the reference pattern for any similar multi-row state change.

Closing a job with nobody assigned (`PATCH /api/admin/jobs/[id]/status` with `CLOSED`) makes it a **failed** job. In the same `$transaction` it rejects every `PENDING` or `REVIEWED` application, and nobody is emailed (the tutors the assign transaction rejects aren't emailed either). The outcome is derived, not stored. `getJobOutcome` in `src/lib/format.ts` calls a closed job with an `assignedTutorId` successful and one without failed. `getAdminContext` counts both for the dashboard, and `JobStatusBadge` shows them in admin views. Tutors and the channel still see only "Closed". Because of this, re-opening goes only through `.../reopen`: `.../status` refuses `OPEN`, and the edit form and `PATCH /api/admin/jobs/[id]` no longer carry `status`. A bare status flip would leave a failed job's applicants rejected, and `@@unique([tutorId, jobId])` stops them from applying again. Deleting a tutor leaves any job they filled closed and unassigned, so from then on it counts as failed.

`DELETE /api/admin/jobs/[id]` deletes a job whether or not tutors have applied. `Application.job` has no cascade, so the route deletes the job's applications itself, in the same `$transaction` as the job — those tutors lose the rows from their application history, and the confirm dialog says how many go. Ending a live vacancy while keeping the record is `PATCH .../status` with `CLOSED`. Deletion also removes the job's Telegram post and Google Sheet row, both best-effort after the transaction commits, and the response names whichever one was left behind.

`DELETE /api/admin/tutors/[id]` is its counterpart for tutors. Neither `Application.tutor` nor `Job.assignedTutor` cascades, so one `$transaction` deletes the tutor's applications, unassigns them from any job (which stays `CLOSED` until an admin re-opens it), and deletes the tutor. After it commits, the R2 documents are removed (best-effort via `deleteObjects`) and each formerly assigned job's sheet row is re-synced so it no longer names them. Their session cookie stops working by itself, because `getCurrentTutor()` finds no row.

### Telegram channel posting

Creating a job publishes it to the Telegram channel, and later changes edit that same post in place. Three modules, in dependency order: `src/lib/telegram.ts` (Bot API over `fetch`, bounded retry, `TelegramApiError`; server-only — the request URL embeds the bot token, so never let an error carrying it reach the UI), `src/lib/telegram-post.ts` (renders the post text, truncates to Telegram's 4096, builds the inline button), and `src/lib/telegram-job-post.ts` (`safeSyncJobTelegramPost` — the single entry point every route uses).

Posts are sent as **plain text — no `parse_mode`**. The channel's format uses no bold or italics, so there is nothing to gain from a markup mode, and dropping it removes the `can't parse entities` failure class: a subject like `Math & Physics <Advanced>` reaches the channel verbatim. Re-introducing bold means re-introducing escaping on every interpolated field. The blank lines in `renderJobChannelPost` are load-bearing — they are the channel's established layout, not incidental whitespace.

The apply button is omitted when `NEXT_PUBLIC_APP_URL` is not publicly reachable (localhost, `.local`), since a channel reader cannot open such a link; the job page warns when that is the case. `TELEGRAM_ALLOW_LOCAL_LINKS=true` overrides this for testing against a real channel from a dev machine — and rewrites the host to `127.0.0.1`, because Telegram *validates* inline-keyboard URLs and rejects the literal hostname `localhost` with `Wrong HTTP URL` while accepting the loopback address.

`safeSyncJobTelegramPost` never throws — it records the outcome on the `Job` row (`telegramPostStatus`, `telegramMessageId`, `telegramPostHash`, `telegramPostError`) and returns it. That inverts `email.ts`'s always-throw contract on purpose: five routes call it (create, edit, status, reopen, assign), all after their database write has committed and all awaited, and duplicating the try/catch in each is how one of them eventually gets it wrong. `telegramPostHash` short-circuits no-op edits, which is also what keeps Telegram's `message is not modified` 400 from firing on every redundant PATCH. If the channel post was deleted by hand, the next edit (any status change or job edit) finds the message gone, clears `telegramMessageId`, and silently **publishes a brand-new post**. That means deleting a test post from the channel and then touching the job puts it back.

### Document storage

Tutor-submitted files (transcript, entrance result, government ID, optional CV/graduation doc) go to a private Cloudflare R2 bucket (`tutor-documents` by default) through the S3 API (`src/lib/r2.ts`, `@aws-sdk/client-s3`). The `Tutor.*Url` columns hold bare object keys, not URLs; admins open a document via `/api/admin/tutors/[id]/documents/[document]`, which 302s to a 10-minute presigned GET. The public profile's documents go through `/api/tutor-profile/[token]/[document]` the same way, with a live share token in place of the admin session. The size/type limits (2 MB JPEG/PNG/WebP for documents, 3 MB image-or-PDF for CVs) are defined once, in `src/lib/document-rules.ts`, which both the wizard (`src/app/register/schema.ts`) and the server (`src/lib/upload-document.ts`) import. The server judges a file's type by its leading bytes (`prepareDocument`), never by the browser-supplied MIME type, and stores that detected type as the object's `ContentType`. The client also caps the **combined** size at 4 MB (`TOTAL_UPLOAD_MAX_SIZE` in `document-rules.ts`): every file goes to `/api/auth/register` in one multipart request, and Vercel rejects function bodies over 4.5 MB with a non-JSON 413 before the route runs, so raising a per-file limit without checking that ceiling brings the failure back. Tutors reach their own files through `/api/tutor/files/[kind]` (tutor session; kinds in `src/lib/tutor-files.ts`): GET works for every stored file, but POST/DELETE only for the optional ones — the profile photo (`Tutor.profilePhotoUrl`, keys under `tutors/<id>/`) and the CV. Their other self-service edits go through `PATCH /api/tutor/profile`, validated by `src/lib/tutor-profile-edit.ts`, which deliberately allows only phone, address, About me, a student's year and a graduate's employment; fields the documents vouch for stay admin-only. The profile-strength score is `src/lib/profile-strength.ts`. Before the client validates a picked image, `src/lib/compress-image.ts` re-encodes it to WebP at ≤2000px (800px for a profile photo). It never throws and never rejects a file; on any failure it passes the original through, so validation stays the only gate.

### Search and link-preview metadata

`src/lib/site.ts` holds the canonical origin (`SITE_URL` — a constant, not `NEXT_PUBLIC_APP_URL`, so no preview or local build writes its own origin into canonicals or the sitemap), the site name and `OPEN_GRAPH_DEFAULTS`. Two Next.js merge rules shape it. A page that sets `openGraph` **replaces** the layout's whole object, so it spreads `OPEN_GRAPH_DEFAULTS` back in. And the `opengraph-image.png` file convention's image is dropped from any page that sets its own `openGraph`, so the share image is `public/og-image.png`, listed in those defaults. That card recruits tutors; `/tutor-profile/**` overrides it in its own `layout.tsx` with a parent-facing one (`public/og-tutor-profile.jpg`), set at the layout so a dead link's 404 shows it too. Canonicals are set per page, never in a layout, because a layout's is inherited by every page below it. `/login`, `/register` and `/forgot-password` are client components, so their metadata lives in pass-through `layout.tsx` files. The home page carries the `WebSite` + `Organization` JSON-LD, which Google reads for the site name, and only on `/`. `/apply/[jobCode]` carries `JobPosting` JSON-LD and stays indexable only while the job is `OPEN` (`apply-job.ts`, whose cached `findApplyJob` keeps `generateMetadata` from costing a second query). `sitemap.ts` lists `/`, `/register`, `/login` and the open jobs, regenerated hourly at most. `www.` 308s to the apex in `next.config.ts`.

### UI

Primitives in `src/components/ui` were scaffolded by the shadcn CLI (`components.json`, style `base-nova`), but they are built on **`@base-ui/react`, not Radix** — there is no Radix package in this repo. Base UI's API differs: `Positioner`/`Popup`/`List`, `render={...}` instead of `asChild`, `data-checked:` instead of `data-[state=checked]`. Anything the shadcn CLI emits has to be checked against that before it is accepted, since Radix-shaped props typecheck against nothing here and render wrong. Tailwind v4 is configured entirely in CSS (`src/app/globals.css` via `@import "tailwindcss"` + `@theme inline`) — there is no `tailwind.config.*` file.

The admin lists (applications, jobs, tutors) load every row in one Prisma call (selects and row mappers in `src/lib/admin-rows.ts`) and search, filter and sort in the browser. Filters live in the query string through `useListFilters` (`src/lib/use-list-filters.ts`), which writes with `window.history.replaceState`: a chip tap or a keystroke costs no request, and a filtered view survives a refresh. Prisma 7 runs each relation `include`/`select` as its own SQL statement, while `_count` is joined into the main one; count statements before adding a relation to a list query. `DataTable`'s `breakpoint="xl"` keeps wide tables as cards until there is room for every column. Both shells share `MobileTabBar` below `lg`.

Forms are not uniform. The register wizard (`src/app/register/**`) uses `react-hook-form` + `@hookform/resolvers` against `src/app/register/schema.ts`; the admin forms (`CreateJobForm`, `EditJobForm`) are plain `useState` + `fetch`, and the job API routes hand-roll their validation rather than using Zod.

**Dark mode.** The site supports Light, Dark and System (the default). The preference lives in `localStorage` only. A cookie would mean reading the request, which would make every prerendered page dynamic.
- **Applying it.** `THEME_INIT_SCRIPT` (`src/lib/theme.ts`) is inlined in the root layout's `<head>`. It sets the `dark` class and `color-scheme` on `<html>` before the body is parsed, so there is no flash, and `<html>` carries `suppressHydrationWarning`.
- **Keeping it applied.** `ThemeSync` (`src/components/layout/ThemeSync.tsx`, mounted once in the root layout) re-applies the theme after Strict Mode's dev remount, which clears the class. It also follows the OS while on System, and follows other tabs.
- **Toggles.** `ThemeMenu` and `ThemeSegmented` (`ThemeToggle.tsx`) read the preference through `useSyncExternalStore` (`src/lib/use-theme.ts`). They render a neutral state until hydration.
- **theme-color.** There is one `theme-color` meta per scheme. A hand-picked theme switches between them by `media`, never by `content`: React matches a hoisted `<meta>` to its server element by `content`, so changing it duplicates the tag.
- **Tokens.** Every color comes from a token in `globals.css`. A raw `white`, `black` or `oklch(…)` in a component renders wrong in one theme, and a `dark:` class is a last resort. The shadcn primitives keep their upstream `dark:` classes, which rely on `--input` being translucent white.
- **Token pairs that are easy to confuse:**
  - `*-foreground` is text on the *solid* fill.
  - `*-strong` is the tone as small text on its own tint or on a card.
  - `brand-surface` and `brand-surface-foreground` are the deep indigo panels with white text, the same in both themes. Never build one from `--primary`, which turns light with dark text at night.
  - `ink` is the contrast slab (the landing's closing band, the phone mockup). It stays dark at night, while `bg-foreground text-background` buttons invert on purpose.
  - `glow` and `shade` are shadow colors, which all but disappear at night, where depth comes from surface lightness.
  - `overlay` is the dialog and sheet scrim.

### Registration

`POST /api/auth/register` parses its multipart body with the wizard's own `registerSchema`, so a rule changed in `schema.ts` changes on both sides. Keep that module free of browser-only and server-only imports. Error responses carry `field` (and `code: "EMAIL_NOT_VERIFIED"` for a lapsed verification), which the wizard maps back to the owning step via `stepOfField`. The tutor row is created in one `$transaction` with consuming the `EmailVerification` row. The uploaded R2 files are deleted only if that transaction fails. A successful registration signs the tutor in (`createTutorSession`), and the wizard lands them on `/tutor`.

The submit survives a bad mobile connection. A request that gets no reply is retried up to 3 times, after waiting out a short offline gap, and an upload with no progress for 45 s counts as dead. Once an attempt's upload has finished, though, the account may exist even though its reply was lost. Because creating the account uses up the `EmailVerification` row, a repeat is refused as `EMAIL_NOT_VERIFIED`, or as a 409 if it raced past that check. So in that case the wizard signs in through `/api/auth/login` with the credentials just entered, and does not treat the refusal as an error. Keep that ordering in mind when changing the route's checks. When every attempt fails, `connectionFailureMessage` names the cause: offline, a dropped connection, a stalled upload, the tutor leaving the screen, or "your documents were sent".

Email verification (`src/lib/email-verification.ts`): a code lives 10 minutes, but verifying it extends the row to 2 hours, because the register route requires an unexpired verified row and the wizard takes longer than 10 minutes. Codes are stored as `HMAC(SESSION_SECRET, email:code)`, so rotating `SESSION_SECRET` invalidates codes in flight. `send-email-code` limits requests per IP (`IP_LIMITS`, via `EmailVerification.requestIp`) because bounces from made-up addresses feed the mail host's suppression list. The limit does nothing when no IP header is present, as in local dev. `POST /api/auth/check-phone` lets step 1 reject a taken phone number early.

Password reset (`/forgot-password` → email → `/reset-password?token=…`) is stateless: `src/lib/password-reset.ts` signs `{tutorId, expiry}` with `SESSION_SECRET` *and the tutor's current password hash*, so a link dies after 30 minutes or the moment any new password is set — there is no table behind it. `POST /api/auth/forgot-password` answers identically for unknown addresses and does the lookup and send in `after()`, so neither the body nor the timing reveals whether an account exists. The link is built from `NEXT_PUBLIC_APP_URL`, never the request's Host header. It is also rate-limited (3 per email, 20 per IP per hour, as `RESET` rows in `LoginAttempt`), silently: a limited request gets the same answer. A successful reset signs the tutor in on that device and **signs them out everywhere else**: it increments `Tutor.sessionVersion`, which every tutor cookie carries and `getTutorId()` / `getCurrentTutor()` compare on each request. Cookies from before the column existed read as version 0. Anything else that should end all of a tutor's sessions (e.g. a future "sign out everywhere") should bump the same column.

The wizard keeps a draft of the non-secret fields in `sessionStorage` (never passwords or files) and always restores to step 1. It reads the draft through `useSyncExternalStore` and remounts `RegisterWizard` once after hydration. That is deliberate: reading storage in a `useState` initializer mismatches the server HTML, and restoring in an effect trips the react-hooks v6 `setState`-in-effect rule.
