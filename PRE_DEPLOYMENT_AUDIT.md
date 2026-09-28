# Pre-deployment audit — Excellence Tutor

Audited 2026-09-28 on branch `feat/registration-improvements` (HEAD `2275337`).
Each item says **what** is wrong, **where**, **how to fix it**, and **how to check the fix**.
Work top to bottom: P0 blocks the deploy, P1 should ship with it, P2 can follow soon after.

---

## 1. What was tested and passed

| Area | How it was tested | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 problems |
| Production build | `npm run build` | ✅ all 58 routes compile, proxy included |
| Public pages | `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/admin/login`, `/application-success`, `/apply/E1000` | ✅ 200 |
| Unknown pages | `/apply/NOPE`, `/tutor-profile/<bad token>`, `/nonexistent` | ✅ 404 |
| Page auth gates | `/jobs`, `/tutor/**` → `/login`; `/admin/**` → `/admin/login` | ✅ 307 redirects |
| Admin API gates | All 17 admin endpoints with no session | ✅ 401 |
| Tutor API gates | `/api/applications`, `/api/tutor/profile`, `/api/tutor/files/*` (GET/POST/DELETE) | ✅ 401 |
| Forged cookies | Hand-made `admin_session` / `tutor_session` with bad signature | ✅ rejected |
| Validation | Malformed JSON, wrong types, empty bodies, bad phone, bad OTP, weak password, bad reset token, non-multipart register | ✅ clean 400s with field names, no 500s |
| Security headers | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy` | ✅ present |
| Ownership (IDOR) | `/tutor/applications/[id]` filters by `tutorId`; parent contact only shown to the assigned tutor | ✅ correct |
| Uploads | Type judged by magic bytes, size limits server-side, R2 private + presigned 10-min URLs | ✅ correct |
| Email templates | All interpolated values go through `escapeHtml` | ✅ no HTML injection |
| Google Sheet | Writes use `valueInputOption=RAW` | ✅ no formula injection |
| Assign / reopen / delete | Conditional claim in a transaction; race → 409 | ✅ correct |

**Not covered:** a real browser pass (no browser tool was available, so responsive UI was checked in code only), and end-to-end flows that would write to the live database, send real email, or post to the Telegram channel. Section 6 is a manual checklist for those.

---

## 2. P0 — fix before deploying

### P0-1 · Next.js 16.2.12 has two critical RCE advisories
- `npm audit` flags `next >=16.0.0 <16.3.3`:
  - *Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used.* This app uses `next/image` with remote patterns, so it is exposed.
  - *Unauthenticated RCE on Windows-hosted servers.* This one matters for local `next start`, not Vercel.
- **Fix:** bump `next` and `eslint-config-next` to `16.3.6` (still pinned, not `^`). Run `npm install`, then `npx tsc --noEmit`, `npm run lint` and `npm run build`. Read the 16.3 upgrade notes in `node_modules/next/dist/docs/` first (see AGENTS.md).
- Also run `npm audit fix` (without `--force`) for the transitive ones (`qs`, `postcss`, `sharp`, `fast-uri`, …), then re-run the build.
- **Verify:** `npm audit --omit=dev` shows no critical/high advisories for `next`.

### P0-2 · Admin tutor edit stores the phone number unnormalized
- **Where:** `src/app/api/admin/tutors/[id]/route.ts` (PATCH), `phone: String(phone).trim()`.
- **Problem:** everywhere else, phones are stored as `+2519XXXXXXXX`. If an admin types `0911223344`, it is saved exactly as typed. That causes three problems:
  1. The unique check stops working, because `0911…` and `+251911…` are different strings, so two accounts can share one number.
  2. A number that *is* taken hits the DB unique constraint (P2002) and returns a generic **500**, not a 409.
  3. The tutor's own edit form strips only `+251`, so it starts from a malformed value.
- **Fix:** use `canonicalEthiopianPhone()` from `src/lib/phone.ts` and return 400 when it gives `null`. Check whether another tutor owns the phone (like the email check), and map P2002 to a 409.
- **Verify:** edit a test tutor's phone to `0911…`; the DB should hold `+251911…`.

### P0-3 · Admin tutor edit doesn't re-sync the Google Sheet
- **Where:** same PATCH handler.
- **Problem:** the sheet shows the assigned tutor's **name and phone**. The tutor's own profile edit re-syncs (`src/app/api/tutor/profile/route.ts`), but the admin edit, which can change both fields, does not. The sheet goes stale until someone clicks "Sync all".
- **Fix:** select `assignedJobs: { select: { id: true } }`. After the update, call `safeSyncJobSheetRow(job.id)` for each job whenever `fullName` or `phone` changed.

### P0-4 · Stronger admin password
- The seed `ADMIN_PASSWORD` is 8 characters. The admin account can see every tutor's government ID, so it needs more.
- **Fix:** use a 16+ character password (password manager) for every admin in production, and rotate the seeded one if it is still in use.

### P0-5 · Make sure local development isn't using the production database
- Local `.env` points `DIRECT_URL` at a Supabase pooler, and the data it returns (jobs `E1001`, …) looks real. If that is production, then every local test, `prisma db push` and `prisma studio` session runs against live data.
- **Fix:** create a separate Supabase project (or a branch database) for development. Keep the production `DIRECT_URL` only in Vercel.

---

## 3. P1 — should ship with this release

### P1-1 · Forgot-password has no rate limit
- **Where:** `src/app/api/auth/forgot-password/route.ts`.
- **Problem:** anyone can fire unlimited reset emails at a real tutor's inbox. That is harassment, and it burns your SMTP sending reputation. It was already noted as a follow-up and is still open.
- **Fix:** reuse the `LoginAttempt` pattern: add a `scope: "RESET"` row per request, and limit to about 3 per email per hour and about 20 per IP per hour. Keep the response identical when limited (still 200, same message) so it doesn't reveal anything.

### P1-2 · Password reset doesn't end other sessions; admin sessions can't be revoked
- **Where:** `src/lib/session.ts`, `src/lib/admin-session.ts`.
- **Problem:** a tutor who resets because their account was stolen stays signed in on the thief's device for up to 30 days. An admin session can't be killed short of rotating `SESSION_SECRET`, which logs out everyone.
- **Fix:** add a `sessionVersion Int @default(0)` column to `Tutor` and `Admin`. Put it in the cookie payload and compare it in `getCurrentTutor()` / `getCurrentAdmin()`. Increment it on password reset (and add an admin "sign out everywhere" button). This is a schema change, so run `npx prisma db push`, then **restart the dev server** (see CLAUDE.md).

### P1-3 · Admin tutor edit has no range or consistency checks
- **Where:** `src/app/api/admin/tutors/[id]/route.ts`.
- **Problems:**
  - `email` isn't format-checked (use `EMAIL_PATTERN`).
  - `entrancePercentage` is taken from the client instead of computed. Score > total, negatives and 250 % are all accepted.
  - `currentGPA` / `CGPA` have no 0–4 range.
  - `gender` accepts `ANY`. A tutor saved as `ANY` can then never apply to a MALE- or FEMALE-only job, because `/api/applications` compares `job.gender !== tutor.gender`.
- **Fix:** allow only `MALE`/`FEMALE`. Compute the percentage server-side as `score / total * 100`, reject score > total, and range-check GPA. Ideally, validate with a Zod schema shared with `TutorEditForm`, as registration already does.

### P1-4 · Salary has no upper bound, so it can 500
- **Where:** `POST /api/admin/jobs` and `PATCH /api/admin/jobs/[id]`.
- **Problem:** `salary` is a Postgres `Int`. A typo like `30000000000` passes `Number.isInteger` and crashes the insert with a generic 500.
- **Fix:** cap it (e.g. `≤ 1_000_000`) with a clear message. While you're there, add max lengths to `grade`, `subject`, `place`, `parentName` and `parentPhone` (e.g. 120), and normalize `parentPhone` with the same phone helper.

### P1-5 · Add `robots.txt`
- `/robots.txt` and `/sitemap.xml` return 404, and the root layout sets `index: true` for everything, so `/admin/login`, `/login` and `/register` are all indexable.
- **Fix:** add `src/app/robots.ts` that disallows `/admin`, `/tutor`, `/api` and `/tutor-profile`. Optionally add `src/app/sitemap.ts` with `/`, `/register` and `/login`.

### P1-6 · Admin logout can redirect to localhost
- **Where:** `src/app/api/admin/auth/logout/route.ts`, which falls back to `http://localhost:3000` when `NEXT_PUBLIC_APP_URL` is missing.
- **Fix:** `NextResponse.redirect(new URL("/admin/login", request.url), 303)`. That always uses the current host, and 303 turns the POST into a GET.

---

## 4. P2 — cleanup and hardening (after launch is fine)

1. **Dead code:**
   - `src/public/**` is never served; Next only serves a root-level `public/`. Nothing references it, so delete it.
   - `src/components/motion/Magnetic.tsx` and `ScrollReveal.tsx` are unused.
   - `GET /api/jobs/[jobCode]` has no caller.
   - `NEXT_PUBLIC_BOT_USERNAME` is read nowhere; remove it from `.env` and from Vercel.
2. **Job codes can be reused.** `generateNextJobCode()` takes the max *existing* code, so deleting the newest job (e.g. `E1005`) hands `E1005` to the next job. Old Telegram links and the tutors' memory of that code then point at a different job. Fix: store a counter (a one-row table or a Postgres sequence), or never delete, only close.
3. **Account enumeration.** `/api/auth/check-phone` and `/api/auth/send-email-code` (409 "already exists") reveal whether a phone or email is registered, and `check-phone` has no rate limit. That's acceptable for a signup flow, but add a per-IP limit to `check-phone`, as `send-email-code` has.
4. **No pagination.** `/api/jobs`, `/admin/jobs`, `/admin/tutors` and `/admin/applications` load every row. That's fine at today's size; add cursor pagination before several hundred rows.
5. **`shadcn` is in `dependencies`.** It's a CLI, so move it to `devDependencies`. Also consider `"engines": { "node": ">=22" }`.
6. **Content-Security-Policy.** Only `frame-ancestors` is set. A full CSP (script-src with nonces) is the next hardening step. HSTS isn't set by the app: confirm Vercel sends `Strict-Transport-Security` on `excellencehometutor.com` (`curl -sI https://excellencehometutor.com | grep -i strict`).

---

## 5. Recommendations

**Engineering**
- **Adopt Prisma migrations now, while the schema is small.** Every `db push` against production is a live, unreviewed schema change. Baseline it: `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`, then `prisma migrate resolve --applied 0_init`, then `migrate deploy` in the Vercel build. Do this as its own task and follow the warning in CLAUDE.md.
- **Add a minimal test suite.** There are no tests today. The highest-value ones:
  - Vitest unit tests for `phone.ts`, `password-reset.ts`, `session.ts` encode/decode, `upload-document.ts` sniffing and `registerSchema`.
  - One Playwright smoke test: register → apply → admin assigns → tutor sees the parent contact.
  Run them in a GitHub Action on every PR.
- **Use one validation style.** Registration and the tutor profile use shared Zod schemas; the admin job and tutor routes hand-roll their checks, and that's where every validation bug above lives. Moving those routes to Zod removes the whole class.
- **Add error monitoring.** Most routes log and return a generic message, so you only find failures by tailing `vercel logs`. Add Sentry (or Vercel's log drains plus an alert) so a failing registration or email send pages you.
- **Plan for the database connection limit.** `max: 3` per instance on Supabase's *session* pooler (15 connections) caps you at about 5 warm instances. Before a traffic spike, test Supabase's *transaction* pooler (port 6543) with the pg adapter, or add Vercel's `attachDatabasePool` for Fluid Compute.
- **Back up the database.** Confirm Supabase point-in-time recovery or daily backups are on for the production project. The Google Sheet only mirrors five columns and is not a backup.

**Product and privacy**
- **Government ID on the parent-facing profile.** Anyone holding a share link (forwarded, screenshotted) can view the tutor's national ID for 30 days. Consider showing it to admins only, or watermarking it, and state it in the tutor consent text at registration. It is the most sensitive item in the system.
- **Say who sees what.** Add a short privacy note and terms page (who sees documents, how long they're kept, how to delete an account), linked from the register wizard's confirmation step.
- **Let tutors delete their own account** (it currently needs an admin). The admin delete route already has the full cleanup logic to reuse.
- **Email rejected applicants, optionally.** Today only the accepted tutor is emailed. A batched "this job has been filled" note keeps tutors engaged, which matters for the growth you're announcing.

---

## 6. Manual checklist before you merge to `main`

Run these against a **preview deployment** backed by a non-production database. Use a real mailbox you control, not `@example.com` (see CLAUDE.md, *Deployment*).

- [ ] Register a student and a graduate (including a 4 MB total upload); both land on `/tutor`.
- [ ] Log out, then log in; wrong password 10× → a "too many attempts" message.
- [ ] Forgot password → email arrives → reset → the old link no longer works.
- [ ] Tutor edits phone, address and about; uploads, replaces and removes a photo and a CV.
- [ ] Admin: create a job → Telegram post appears → edit it → close → reopen → post updates each time.
- [ ] Tutor applies from the Telegram button; applying twice is refused; a gender-mismatched job is refused.
- [ ] Admin assigns → tutor gets the email with the parent contact and the attendance PDF → the sheet row shows the tutor.
- [ ] Share a tutor profile → open it on `parent.` in a private window → documents load → reset the link → the old one is a 404.
- [ ] Delete the test job and the test tutor; the Telegram post, sheet row and R2 files are gone.
- [ ] Phone-width pass (375 px) on `/`, `/register`, `/tutor`, `/jobs`, `/apply/…` and `/admin/jobs`: no horizontal scroll, bottom tab bar reachable, admin nav reachable.
- [ ] `vercel logs https://excellencehometutor.com` shows no errors during all of the above.

---

## 7. Local environment note

While auditing, a `next dev` (port 3000), a `next start -p 3123` and a second `next build` were all running from the same folder. The dev server was returning **500 on `/`**, and `:3123` served an outdated build (`/forgot-password` → 404). Concurrent builds overwrite `.next` under running servers. To reset: stop all of them, delete `.next`, and start one server.
