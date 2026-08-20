# Epic 2 Handover — Case Repository + Account Management

Team 2's ownership area on **CaseArena** (IIM Lucknow case prep platform, live app
built on TanStack Start + Supabase + shadcn/ui, originally scaffolded via Lovable).
This document is the single reference for anyone picking up this work: what's
shipped, what's left, and what needs a human with dashboard access to finish.

Last updated: 2026-08-19.

## 1. Scope

Epic 2 = **Case Repository** + **Account Management**. Case Repository
(`repository.tsx`, `community.tsx`) was already ~90% built when this work
started; the actual gap closed here was Account Management (Bookmarks, Profile,
Settings were stub pages) plus a set of real bugs found in Case Repository
during testing.

## 2. What's shipped (all merged to `main`)

| PR | What |
|---|---|
| [#1](https://github.com/AtulDeepYadav/CaseArena/pull/1) | Bookmarks, Profile, Settings pages built from scratch (were stubs). Migration: `user_settings` table, `avatars` storage bucket, `bookmarks` uniqueness fix. First test setup in the repo (vitest + Testing Library), 100% coverage on this module. |
| [#2](https://github.com/AtulDeepYadav/CaseArena/pull/2) | Fixed `files.like_count`/`rating_avg`/`rating_count` never syncing with `file_likes`/`file_ratings` (no DB trigger existed) + added `comment_count` for the "Discuss (N)" UI. |
| [#3](https://github.com/AtulDeepYadav/CaseArena/pull/3) | In-app PDF viewer — "View" button opens case PDFs in an embedded modal (native browser rendering via iframe against a signed non-download URL), no new dependency. Non-PDF files fall back to Download. |
| [#4](https://github.com/AtulDeepYadav/CaseArena/pull/4) | Dashboard's "Cohort Leaderboard" was 100% hardcoded mock data — now queries real top-3 XP from `profiles`. `toggleLike()` was silently swallowing errors (root cause of "like not registering"). Google SSO client code audited (already correct). |
| [#5](https://github.com/AtulDeepYadav/CaseArena/pull/5) | Bookmark icon never changed color / never actually un-bookmarked — now a real toggle with visual state. |
| [#6](https://github.com/AtulDeepYadav/CaseArena/pull/6) | Consolidated, idempotent one-shot SQL script for production (`supabase/manual-fix-run-in-sql-editor.sql`). |
| [#7](https://github.com/AtulDeepYadav/CaseArena/pull/7) | Like/rating/comment counts now computed **live** from `file_likes`/`file_ratings`/`file_comments` (all have permissive RLS) instead of the trigger-dependent stored columns — works immediately regardless of whether the pending migration has been run. |
| *(direct push, no PR)* | Personal Supabase project + DB toggle — see §4. |

> Note: the repo was renamed `AtulDeepYadav/EPIC-03---Bits-n-Bytes` →
> `AtulDeepYadav/CaseArena` early on, before any of the above PRs were opened.

## 3. Architecture quick reference

- **Frontend**: TanStack Start (file-based routing under `src/routes/`) + React
  + Tailwind + shadcn/ui (`src/components/ui/`). Routes under
  `src/routes/_authenticated/` require a session (guarded in
  `_authenticated/route.tsx`).
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime). No custom
  backend server beyond a couple of TanStack server functions.
- **State/data**: `@tanstack/react-query`, plain `supabase.from(...)` calls
  directly in route components (no service layer). Convention: query key
  `[resource, ...params]`, mutations invalidate by partial key.
- **Our new files**: `src/routes/_authenticated/{bookmarks,profile,settings}.tsx`,
  `src/lib/{bookmarks,profile,user-settings,errors,file-preview}.ts`,
  `src/components/file-preview-dialog.tsx`. Touched (not authored)
  `community.tsx`, `repository.tsx`, `dashboard.tsx`, `auth.tsx`.

## 4. Database — **read this before touching anything DB-related**

There are now **two** Supabase projects in play:

1. **Original shared project** (`bbfhftgwjmvltrnabjvw`) — what the live
   production app has always used. Owner is unreachable (this is why #2
   below exists). `.env`'s `SUPABASE_*` vars point here.
2. **Personal project** (`fnfnadbwottfhkgpxvwp`, name `casearena-personal`) —
   created because the original owner couldn't be reached to run pending
   migrations. Full schema applied and verified (all tables, RLS, triggers,
   both storage buckets, seed badges — covers all 3 epics, not just this
   one). `.env`'s `PERSONAL_SUPABASE_*` vars point here.

**Toggle**: `USE_PERSONAL_SUPABASE` / `VITE_USE_PERSONAL_SUPABASE` in `.env`,
currently `"false"` (using the original shared project — unchanged behavior).
Set both to `"true"` and **fully restart** the dev server (or redeploy, for
the live app) to switch. This is a build-time flag, not a live switch —
Vite's own `.env`-change auto-restart did not reliably pick up the new value
in testing; kill and rerun `npm run dev` if flipping it locally.

The toggle is wired into every place that resolves Supabase credentials:
`src/integrations/supabase/client.ts` (browser client), `client.server.ts`
(service-role admin client — currently unused anywhere in the app, so its
`PERSONAL_SUPABASE_SERVICE_ROLE_KEY` isn't provisioned; grab it from the
personal project's own Settings → API page if something starts needing it),
and `auth-middleware.ts` (also currently unused).

**Pending migration on the original project** — still not confirmed applied.
If/when the original owner resurfaces, run
`supabase/manual-fix-run-in-sql-editor.sql` in their Supabase Dashboard → SQL
Editor. It's idempotent (safe to run regardless of what's already applied)
and fixes: avatar upload ("bucket not found"), the Settings page (missing
`user_settings` table), duplicate bookmarks, and why like/rating/comment
counts don't update on Community Repository cards (as of PR #7, the counts
work live regardless — this migration is now mainly needed for the "Most
liked"/"Top rated" **sort** options, which still order by the old
trigger-dependent stored columns).

## 5. Things that need a human with dashboard access (I can't do these from code)

| Item | Where | Symptom if not done |
|---|---|---|
| Google OAuth Client ID/Secret | Supabase Dashboard → Auth → Providers → Google | `{"msg":"Unsupported provider: missing OAuth secret"}` on "Continue with Google" |
| Auth Site URL / Redirect URLs | Supabase Dashboard → Auth → URL Configuration | Password reset emails redirect to a stale Lovable preview domain instead of this app |
| `workflow` OAuth scope on `gh` | Run `gh auth refresh -h github.com -s workflow` | `.github/workflows/ci.yml` (sitting locally, untracked — see below) can't be pushed; every push has been getting rejected on just that one file |
| Run `manual-fix-run-in-sql-editor.sql` on the **original** project | Supabase Dashboard → SQL Editor | Avatar upload, Settings page, and sort-by-likes/rating stay broken on the original DB (all fixed already on the personal one) |

Full setup steps for the first two are in `docs/supabase-auth-config.md`.

**`.github/workflows/ci.yml`** exists locally (build + coverage + lint scoped
to this module, on PRs into `main`) but has never made it into a commit —
every push attempt gets rejected specifically on that file until the
`workflow` scope above is granted. Once it's granted, `git add
.github/workflows/ci.yml` and push it as its own small commit.

## 6. Testing

```bash
npm run build       # production build
npm run coverage     # vitest run --coverage
npm run test:watch   # vitest, watch mode
```

100% statement/branch/function/line coverage is **enforced** (`vitest.config.ts`
→ `coverage.thresholds`), but scoped via `coverage.include` to only the files
this module owns — not a retroactive backfill of other epics' pre-existing
untested code. If you add a new file to this module, add it to that
`include` list and write it up to 100% (see any existing `*.test.ts(x)` for
the mocking patterns — `src/test/supabase-mock.ts` has a reusable chainable
Supabase mock).

Route files under `src/routes/_authenticated/` get scanned by TanStack
Router's file-based routing, so co-located test files there are prefixed
`-` (e.g. `-bookmarks.test.tsx`) to exclude them from route generation —
Vitest still picks them up fine, only the router ignores them.

## 7. Known, intentionally-left-alone limitations

- **Sort order** ("Most liked" / "Top rated" on Community Repository) still
  orders by the stored `like_count`/`rating_avg` columns, which stay stale on
  the original DB until its migration runs. The *displayed* numbers are
  correct (computed live, PR #7); only the sort order can look inconsistent
  with what's shown until then.
- **Account deletion** was explicitly scoped out (a deliberate decision, not
  an oversight) — Settings covers profile/notifications/password/email only.
- `.env` is tracked in git (not just `.env.example`). Flagged as a hygiene
  issue early on; the values are Supabase's client-safe publishable keys
  (not secrets), and the maintainer deliberately restored tracking it at one
  point ("restore old lovable supabase keys for presentation"), so this was
  left alone rather than fixed unilaterally.
- Pre-existing hydration console warning on the auth-redirect flash
  (`Hydration failed because the server rendered HTML...`) reproduces
  identically on untouched pages (e.g. `/dashboard`) — confirmed pre-existing,
  not something introduced by this work, not fixed (out of scope).

## 8. Local setup

```bash
npm install
npm run dev          # http://localhost:8080 by default
```

Needs a `.env` with either the shared or personal Supabase credentials (see
`.env.example` for the full var list). No other local services required —
everything (DB, auth, storage) is hosted Supabase.
