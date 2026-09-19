# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack, http://localhost:3000)
npm run build    # production build
npm run start    # run a production build (run `build` first)
npm run lint     # eslint (flat config: eslint-config-next core-web-vitals + typescript)
```

There is no test script/framework configured in this repo.

Prisma (schema at `prisma/schema.prisma`, config at `prisma.config.ts` — see below):

```bash
npx prisma generate       # regenerate the Prisma Client after schema changes
npx prisma migrate dev    # create/apply a migration in development
npx prisma studio         # browse the database
npx prisma db seed        # runs prisma/seed.ts (upserts a sample Job + the initial Admin)
```

## Environment variables

Defined in `.env` (gitignored). Required across the app: `DIRECT_URL` (Postgres connection string, used by both `prisma.config.ts` and `src/lib/prisma.ts`), `SESSION_SECRET` (HMAC key for both session cookies), `SUPABASE_URL` / `SUPABASE_SECRET_KEY` (document storage), `RESEND_API_KEY` / `EMAIL_FROM` (verification emails), `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` (consumed only by the seed script), `NEXT_PUBLIC_APP_URL` (used to build the applicant link in generated job posts), `NEXT_PUBLIC_BOT_USERNAME`.

## Architecture

### Three surfaces under `src/app`

- **Public site** — `/`, `/jobs`, `/jobs/[jobCode]`, `/apply/[jobCode]`, `/login`, `/register`, `/application-success`.
- **Tutor portal** — `/tutor/**`, gated by `src/app/tutor/layout.tsx`, which calls `getCurrentTutor()` and redirects to `/login` if absent.
- **Admin dashboard** — `src/app/admin/(dashboard)/**` (route group, doesn't affect the URL), gated by `src/app/admin/(dashboard)/layout.tsx` calling `getCurrentAdmin()`. `/admin/login` sits outside the group so it isn't gated.

### Auth: two independent, hand-rolled cookie sessions

No auth library — `src/lib/session.ts` (tutor, cookie `tutor_session`, 30 days) and `src/lib/admin-session.ts` (admin, cookie `admin_session`, 7 days) are near-identical implementations: JSON payload → base64url, signed with HMAC-SHA256 (`SESSION_SECRET`) via `createHmac`, verified with `timingSafeEqual`. Passwords are hashed with bcryptjs (`src/lib/auth.ts`, cost 12). When adding a new protected area, mirror the existing pattern rather than introducing a third session shape.

**Admin API routes do not check `requireAdmin()` themselves** — e.g. `src/app/api/admin/jobs/route.ts` and `src/app/api/admin/applications/[id]/assign/route.ts` trust that only the authenticated dashboard UI calls them; the only gate is the `(dashboard)` layout redirect. Keep this in mind (and check current callers) before treating an `/api/admin/**` route as protected on its own.

### Data layer: Prisma 7 with a driver adapter

`prisma/schema.prisma` has no `url` in its `datasource` block — the connection string comes from `prisma.config.ts` (`defineConfig`, Prisma 7's config file) and from `DIRECT_URL` directly in `src/lib/prisma.ts`, which constructs `PrismaClient` with `@prisma/adapter-pg` (`PrismaPg`) rather than a bare connection string. `prisma/seed.ts` builds its own client the same way (adapter + `DIRECT_URL`) since it runs outside the app.

Core models (`prisma/schema.prisma`): `Job` (a posting, optionally `assignedTutor`), `Tutor` (account + long profile: student vs. graduate fields gated by `tutorStatus`, document URLs, entrance exam scores), `Application` (join of `Tutor`↔`Job`, unique per pair, `status` enum PENDING→REVIEWED/ACCEPTED/REJECTED), `EmailVerification` (short-lived code + attempts for registration), `Admin`. Accepting an application (`.../assign/route.ts`) runs a single `$transaction` that accepts the one application, rejects the job's other applications, and closes the job — treat that flow as the reference pattern for any similar multi-row state change.

### Document storage

Tutor-submitted files (transcript, entrance result, government ID, optional CV/graduation doc) go to a Supabase Storage bucket `tutor-documents` via a service-role client (`src/lib/supabase-admin.ts`). `src/lib/upload-document.ts` enforces size/type limits before upload (2 MB images for documents, 5 MB image/PDF for CVs) — validation there and in the client-side Zod schema (`src/lib/validation.ts`, 5 MB / PDF+JPEG+PNG) are independent and can drift; check both when changing file constraints.

### UI

shadcn/ui (`components.json`, style `base-nova`, Tailwind base color `neutral`) components live in `src/components/ui`. Tailwind v4 is configured entirely in CSS (`src/app/globals.css` via `@import "tailwindcss"` + `@theme inline`) — there is no `tailwind.config.*` file. Forms use `react-hook-form` + `@hookform/resolvers` against the Zod schemas in `src/lib/validation.ts`.
