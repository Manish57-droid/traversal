# AI Operating Manual — Traversal

This is the standing operating manual for every future coding task in this project. Read this
before writing code. It's derived from what already exists in the repo (see `project.md` Section
4 for the audited stack) so new code stays consistent with old code.

## 0. First, orient

- If a prompt is ambiguous about which module/area it touches, check `project.md` Section 3
  (Core modules table) first to see what's EXISTING vs PLANNED before writing anything.
- If a task touches something listed under `project.md` Section 6 (Open Decisions), stop and ask
  the user instead of picking an answer yourself.

## 1. Coding conventions (derived from existing code)

- **Language**: TypeScript everywhere, strict-ish — existing code always types API payloads and
  DB rows via `types/index.ts`. Add new shared types there, not inline duplicated types per file.
- **File/folder structure**:
  - Route pages: `app/<role-or-area>/<feature>/page.tsx` (e.g. `app/student/dsa/page.tsx`,
    `app/teacher/question-sets/page.tsx`). Role-scoped areas (`app/student/**`, `app/teacher/**`,
    `app/admin/**`) each have their own `layout.tsx` doing a server-side role re-check.
  - API routes: `app/api/<resource>/route.ts`, with nested resources as
    `app/api/<resource>/[id]/<sub-resource>/route.ts` (e.g.
    `app/api/question-sets/[id]/items/route.ts`). One `route.ts` exports the HTTP verbs it
    handles (`GET`, `POST`, etc.) as named functions — don't split verbs across files.
  - Shared UI: `components/` (flat for generic pieces like `Navbar.tsx`, `QuestionRow.tsx`;
    subfoldered by feature for a cluster, e.g. `components/concept/*`).
  - Non-UI logic: `lib/` — `lib/roles.ts` (auth/role helpers), `lib/platform.ts` (pure helper
    functions + constants), `lib/supabase/*` (DB clients + schema.sql), `lib/concepts/data.ts`
    (static content data). Follow this split: pure functions/constants → a `lib/<domain>.ts`
    file; DB access helpers → `lib/supabase/`.
- **Naming**: PascalCase for components and their files (`QuestionRow.tsx`), camelCase for
  functions/variables, snake_case for DB columns/JSON payload keys (matches Postgres column
  names directly — don't camelCase API payloads).
- **Component pattern**: Page components are `"use client"` when they need state/effects (most
  do today — data is fetched client-side via `fetch()` in a `useEffect`, not via server
  components fetching Supabase directly, except for the initial auth/role check which happens
  server-side in layouts). Keep that split: role-gating and redirects → server (`layout.tsx`,
  `middleware.ts`); interactive data fetching/mutation → client components hitting `/api/*`.
- **Styling**: Tailwind utility classes inline in JSX, using the custom design tokens defined in
  `tailwind.config.ts` (`bg`, `surface`, `surface-2`, `fg`, `fg-muted`, `accent`, `success`,
  `warn`, plus a `.card` utility class used repeatedly). Reuse these tokens — don't hardcode hex
  colors or introduce a new color system. No CSS-in-JS, no styled-components, no separate CSS
  modules per component (`app/globals.css` is the one global stylesheet).
- **Theming (light/dark)**: `next-themes` wraps the whole app (`app/layout.tsx`) and applies a
  single `.light`/`.dark` class to `<html>`, site-wide — every page uses the same persisted
  preference (default: light), and every page renders correctly in both because every page is
  migrated to the token classes (`bg-bg`, `text-fg`, `text-fg-muted`, `text-fg-subtle`,
  `border-line`, `bg-surface-2`, etc. — see `tailwind.config.ts`) instead of hardcoded Tailwind
  colors (`text-white`, `text-slate-400`, ...). This is the real, final pattern — an earlier pass
  briefly pinned every non-landing page to dark via a hardcoded class on `<body>` as a stopgap
  while only the landing page was migrated; that workaround is gone (see changelog). **When you
  add new UI, use token classes from the start** — a hardcoded color class will look fine in dark
  (today's default in most people's heads) and break in light mode, and nothing will catch it
  except someone toggling the theme. Don't add a second theming library or a parallel token set —
  light mode reuses the exact same token names, just different values under `.light`.
  One known gap: error/destructive states (`text-red-400` and friends) are still hardcoded — there's
  no `--danger` token yet (see changelog's theming-migration entry for the proposed values,
  pending confirmation before adding it).
- **Comments**: existing code favors short, purposeful comments explaining *why* (business logic,
  non-obvious tradeoffs), not restating *what* the code does. Match that density — don't over- or
  under-comment relative to the surrounding file.

## 2. State management, API calls, error handling

- **State management**: local `useState`/`useEffect` in the page/component that owns the data.
  No global state library (no Redux/Zustand/Jotai/React Query) is in use — don't introduce one
  for a single page's data needs. If a genuine cross-page shared-state need comes up, ask before
  adding a library; it likely means restructuring data fetching instead.
- **API calls**: plain `fetch()` to the app's own `/api/*` routes, `Content-Type: application/json`,
  `JSON.stringify` body, `await res.json()` on the response. No axios, no SWR, no React Query.
  Follow the existing `loadX()` async function + `useEffect(() => { loadX() }, [])` pattern for
  initial fetch, and optimistic local state update + fire-and-forget POST for mutations (see
  `app/student/dsa/page.tsx`'s `handleStatusChange`).
- **API route pattern**: every route handler starts with an auth check
  (`getCurrentAppUser()` from `lib/roles.ts`, or `requireRole([...])` when the route is
  role-restricted), returns `NextResponse.json({ error }, { status })` on failure (401/400/500)
  and `NextResponse.json({ <resource>: data })` on success. Use `supabaseAdmin()` from
  `lib/supabase/server.ts` (service-role client, bypasses RLS by design — see schema.sql's RLS
  comment) for all reads/writes; RLS itself is defense-in-depth only, not the access-control
  mechanism the app relies on.
- **Error handling**: surface Supabase error messages directly in the JSON error response body
  (`error: error.message`) rather than swallowing or generic-messaging them — matches existing
  routes. On the client, existing pages don't yet do rich error UI (mostly just don't update
  state on failure) — keep new code at least that robust; don't skip error handling entirely.

## 3. Hard rules

- **Don't introduce a new library or pattern for something an existing one already handles.**
  E.g. no new HTTP client, state manager, styling system, date library, form library, etc. without
  checking first whether the existing stack (fetch + useState + Tailwind) already covers it.
- **Ask before changing the DB schema.** `lib/supabase/schema.sql` is hand-applied via the
  Supabase SQL editor, no migration tooling — a schema change is a manual, somewhat risky step
  for the user to run themselves. Propose the SQL, explain what it does, and wait for
  confirmation before telling the user to run it (and before writing app code that assumes it
  already ran).
- **Ask before changing auth.** This includes: the sign-up trigger (`handle_new_user`), the
  hard-coded admin email, `middleware.ts`'s role/path-gating logic, or `lib/roles.ts`. Auth
  changes are high-blast-radius (can lock users out or open access) — confirm first.
- **No ORM.** Keep using `@supabase/supabase-js` query builder directly; don't add Prisma/Drizzle/
  etc. (explicitly called out in the README as a deliberate choice).
- **Respect the role/approval gate.** Any new protected route needs the same
  server-side re-check pattern as existing `layout.tsx` files and API routes — don't rely on
  `middleware.ts` alone, and don't rely on client-side checks alone either.

## 4. End-of-task requirement

At the end of **every** task, before ending the session, append an entry to `changelog.md` using
the format defined there. Do this even for small changes. Do not skip this step.
