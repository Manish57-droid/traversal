# Changelog

## [2026-09-09] — Project audit and documentation setup
- What changed: Audited the existing codebase (Next.js 14 App Router + Supabase project, no ORM,
  Tailwind with custom design tokens, React Three Fiber for 3D). Confirmed what's live today:
  auth + role/approval workflow (student/teacher/admin via Supabase Auth + a `users` table +
  `handle_new_user` sign-up trigger), the DSA practice module (question bank, question sets,
  class assignment, per-student progress tracking, teacher rollup dashboard), and the static 3D
  topic-explanation player (`/topics`). Confirmed aptitude practice, technical round practice,
  the off-campus opportunities board, and the "protocol test" simulated drive are all not yet
  started (PLANNED). Created `project.md` (vision, roles, module status table, tech stack, draft
  data model including planned `Drive`/`Round`/`RoundType` entities, open decisions, non-goals)
  and `ai.md` (coding conventions, state/API/error-handling patterns, hard rules) as ongoing
  references for all future work in this project.
- Files touched: `project.md` (new), `ai.md` (new), `changelog.md` (new).
- Why: Requested groundwork before any new feature work begins, so future prompts build on a
  documented shared understanding of scope, architecture, and conventions instead of re-deriving
  them each time — and so two decisions that materially affect the data model (a possible third
  "Recruiter/Placement Cell" role, and how customizable simulated drives should be in v1) get
  flagged for a decision instead of silently assumed.

## [2026-09-09] — Resolve open decisions; design Aptitude module schema
- What changed: Resolved both open decisions from `project.md` §6: (1) no separate
  Recruiter/Placement Cell role — Admin covers cross-class oversight for now; (2) v1 ships one
  fixed, system-defined drive template (Aptitude → Technical MCQ → Coding → Results) rather than
  a custom drive builder, though the `Drive`/`Round`/`RoundType` schema keeps round order as data
  so a v2 builder UI won't need a schema rewrite. Added a resolved build-order note (Aptitude →
  Technical → Opportunities board → Drive system) explaining that Drive rounds need real
  Aptitude/Technical content to reference before the Drive system itself is meaningful to build.
  Also designed (not applied) the Aptitude module: SQL schema draft covering the question bank,
  per-student practice history, teacher-built tests, test questions, class assignments, and
  scored test attempts — plus a planned route structure for practice mode and test mode. No app
  code or schema was applied in this pass; schema is presented for review only, per instruction.
- Files touched: `project.md` (updated §2, §6), `changelog.md` (this entry). No SQL/app files
  changed — the Aptitude schema design was presented in-conversation for review, not written to
  `lib/supabase/schema.sql`.
- Why: The two open decisions were blocking confident module sequencing; resolving them and
  recording the reasoning keeps `project.md` accurate as the source of truth. The Aptitude module
  is next in the resolved build order, and per `ai.md`'s "ask before changing the DB schema" rule,
  the schema is designed and reviewed before being applied.

## [2026-09-09] — Finalize and add Aptitude schema
- What changed: Added `negative_marking_fraction numeric not null default 0` to the draft
  `aptitude_tests` table (fraction of a mark deducted per wrong answer; 0 = no negative marking),
  and wrote the full, reviewed Aptitude schema (`aptitude_questions`, `aptitude_practice_history`,
  `aptitude_tests`, `aptitude_test_questions`, `aptitude_assignments`, `aptitude_test_attempts`,
  plus the `aptitude_category`/`aptitude_attempt_status` enums and RLS enablement) into
  `lib/supabase/schema.sql`, following the file's existing conventions. Added the corresponding
  TypeScript types to `types/index.ts`. Updated `project.md` §3 (Aptitude row) and §5 (data model)
  to reflect the finalized schema. Note: this repo has no DB migration tooling, `psql`, or
  Supabase CLI/connection string — same as the original schema, this addition needs to be run
  once in the Supabase SQL editor to go live; it is not executed automatically by this change.
- Files touched: `lib/supabase/schema.sql`, `types/index.ts`, `project.md`.
- Why: Both open decisions blocking the Aptitude module were resolved, and the schema needed to
  reflect scoring with negative marking before Practice Mode (which writes to
  `aptitude_practice_history`) could be built against a stable shape.

## [2026-09-09] — Build Aptitude question bank + Practice Mode
- What changed: Built the teacher-facing Aptitude question bank (create/list/filter/edit/delete
  MCQs, mirroring `app/teacher/questions/page.tsx`'s layout and interaction patterns) and the
  full student Practice Mode flow: category tiles → topic picker (topics derived from distinct
  `aptitude_questions.topic` values per category) → one-question-at-a-time practice with
  immediate correct/incorrect feedback and explanation. Each answer upserts
  `aptitude_practice_history` (attempts_count, last_selected_option, last_correct,
  last_attempted_at, first_correct_at set once on first correct answer) via a new
  `/api/aptitude/practice` route that grades server-side against `correct_option` — the client
  never receives the answer key up front. Question selection within a topic prioritizes
  never-attempted and previously-wrong questions over already-mastered ones, with randomization
  within each tier (and avoids immediately repeating the just-answered question when another
  candidate exists), so practice doesn't feel like a fixed-order quiz. Added Aptitude nav links
  to `components/Navbar.tsx` for both student and teacher roles. Test Mode (timed tests, teacher
  assignment, scoring with negative marking) was explicitly left out of this pass, per
  instruction — `aptitude_tests`/`aptitude_test_questions`/`aptitude_assignments`/
  `aptitude_test_attempts` exist in the schema but have no routes or UI yet.
- Files touched: `app/api/aptitude/questions/route.ts` (new), `app/api/aptitude/practice/route.ts`
  (new), `app/teacher/aptitude/questions/page.tsx` (new), `app/student/aptitude/page.tsx` (new),
  `app/student/aptitude/practice/[category]/page.tsx` (new),
  `app/student/aptitude/practice/[category]/[topic]/page.tsx` (new), `components/Navbar.tsx`,
  `project.md` (§3 Aptitude row now reflects Practice Mode as built).
- Why: Practice Mode was the requested scope for this task; Test Mode is deliberately deferred to
  a follow-up so it can be reviewed as its own unit once Practice Mode + the question bank are
  confirmed working end-to-end.

## [2026-09-09] — Redesign the public landing page with light/dark theming
- What changed: Rebuilt the logged-out landing page (`app/page.tsx`) into a component-per-section
  structure under `components/landing/` — PublicNavbar (logo, smooth-scroll anchor nav, mobile
  menu, ThemeToggle, Login/Get Started), Hero (broader multi-module pitch + a "simulated drive"
  round-progress mockup card, no 3D), Features (6 cards: DSA, Aptitude, Technical, Opportunities,
  Simulated Drives, Analytics — presented uniformly/confidently regardless of build status),
  Platforms (LeetCode/CodeChef/Codeforces/GfG/HackerRank, honest framing instead of invented
  stats), HowItWorks (Teachers/Students tabs with real Traversal workflows), CtaBand, and Footer.
  Added `next-themes` and `lucide-react` as new, justified dependencies (theme persistence/toggle
  and iconography — nothing existing covered either). Extended the existing CSS-variable token
  system in `app/globals.css` with a `.light` palette (same token names, new values, deepened for
  contrast on a warm-paper background) alongside the original palette, now also exposed as an
  explicit `.dark` class. Built `ThemeToggle` (animated Sun/Moon swap, mounted-check to avoid
  hydration mismatch) and a `ThemeProvider` wrapper (`attribute="class"`, `defaultTheme="light"`).
  Deliberately scoped the toggle to the landing page only: `next-themes` still writes its class to
  `<html>` as documented, but `<body>` in `app/layout.tsx` now carries a hardcoded `dark` class
  that overrides it for every other page, and `LandingPage` mirrors the resolved theme onto its
  own root element to opt back in — so no authenticated page (or sign-in/sign-up/topics/etc.)
  changes appearance, without editing any file under `app/student/**`, `app/teacher/**`, or any
  other existing page. Updated root `<title>`/description in `app/layout.tsx` to match the
  broader positioning. Also updated `ai.md` with the theming pattern for future public pages.
  Design choice: kept the existing R3F `Hero3D` tree visual out of the new hero — it reads as
  DSA/traversal-algorithm-specific, which undersells the broader aptitude/technical/opportunities/
  drives pitch; went with a 2D product-mockup card instead. `components/Hero3D.tsx` is left
  in place, unreferenced, in case it's wanted elsewhere later.
- Files touched: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `package.json` (+
  `next-themes`, `lucide-react`), `ai.md`. New: `components/ThemeProvider.tsx`,
  `components/ThemeToggle.tsx`, `components/landing/LandingPage.tsx`,
  `components/landing/PublicNavbar.tsx`, `components/landing/Hero.tsx`,
  `components/landing/Features.tsx`, `components/landing/Platforms.tsx`,
  `components/landing/HowItWorks.tsx`, `components/landing/CtaBand.tsx`,
  `components/landing/Footer.tsx`.
- Why: The old landing page pitched Traversal as a DSA-only tool; the requested redesign needed to
  reflect the full product vision from `project.md` §1/§3 and add real theme support, without
  putting any part of the existing authenticated app at visual risk from a global CSS-variable
  toggle.

## [2026-09-09] — Migrate authenticated pages to the token system; real navbars for Teacher/Student
- What changed: **This replaces the previous task's temporary workaround with the real fix** — the
  hardcoded `dark` class the last entry put on `<body>` (to stop the new theme toggle from leaking
  into pages that still used hardcoded Tailwind colors) is gone. In its place: every file under
  `app/student/**`, `app/teacher/**`, `app/admin/**`, `app/sign-in`, `app/sign-up`,
  `app/pending-approval`, `app/topics/**`, and every shared component they use
  (`components/Navbar.tsx`, `QuestionRow.tsx`, `ProgressBar.tsx`, `components/concept/*`) had its
  hardcoded colors (`text-white`, `text-slate-100/200/300/400/500`, `border-white/5/10/25`,
  `border-slate-500`, `bg-white/10`) mechanically replaced with the equivalent token class
  (`text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-line`/`border-line/70`/`border-line/40`,
  `bg-surface-2`) — same visual result in dark mode, now reachable through tokens so light mode
  renders correctly too. Scope note: the task named `app/student/**`/`app/teacher/**`/`app/admin/**`
  specifically; I extended the migration to sign-in/sign-up/pending-approval/topics and their
  shared components as well, since leaving them hardcoded would have broken exactly the same way
  once the toggle went global — flagging this scope extension rather than silently doing it.
  `next-themes` now writes a single `.light`/`.dark` class straight to `<html>`, one persisted
  preference for the whole site, default light, per the original decision.
  Found and fixed two real bugs during the verification pass (Step 5): (1) the platform badge in
  `components/QuestionRow.tsx` and `app/teacher/questions/page.tsx` used `text-bg` to get
  always-dark badge text — that worked only because `--bg` used to be permanently dark; in light
  mode it flipped to near-white text on the colorful platform badges. Fixed by switching both to
  `text-ink-fixed` (the existing theme-independent ink token already used by `.btn-primary`).
  (2) The new `.light` palette's `--fg-subtle` only hit ~3.55:1 contrast against `--bg` (below
  WCAG AA), versus ~4.9:1 for the equivalent dark-mode pairing — darkened it from `#8A8276` to
  `#786F65` (~4.5:1) in `app/globals.css`.
  Built `TeacherNavbar` and `StudentNavbar` (`components/TeacherNavbar.tsx`,
  `components/StudentNavbar.tsx`), each with the logo, active-route-aware nav links, the *same*
  `ThemeToggle` component from the landing page (not reimplemented), and a new `UserMenu`
  (`components/UserMenu.tsx`, shared by both) — avatar-initial + name, dropdown with email and
  Sign out, click-outside-to-close. Both collapse into a mobile menu on small screens, matching
  `PublicNavbar`'s pattern. `app/teacher/layout.tsx` and `app/student/layout.tsx` now render these
  instead of the generic `components/Navbar.tsx` (which still serves `app/admin/layout.tsx`
  unchanged, just with migrated colors). Nav links only point at routes that exist today —
  "Classes" and the DSA/Aptitude question bank links go to `/teacher/dashboard` (which currently
  does both class management *and* progress rollup — there's no separate analytics page yet, so
  I didn't add a second, redundant "Dashboard" link to the same URL); kept `Question sets` and
  `Assign` in the teacher nav too even though the task's link list didn't name them, since dropping
  them would have made working pages unreachable from navigation.
  Verified both themes (Step 5) by re-reading the full source of the four target pages (teacher
  DSA question bank, teacher dashboard, student DSA page, student aptitude practice flow — plus
  `QuestionRow`, `ProgressBar`, and the aptitude question bank) end to end and computing WCAG
  contrast ratios for every token pair against both palettes; both bugs above were caught this way
  and fixed rather than left for you to find.
  **Flagged, not applied** (per the task's "don't invent a token silently" instruction) — one real
  gap remains: error/destructive states (`text-red-400`, `border-red-500/40`, `border-red-500/50`,
  `bg-red-500/5`, `bg-red-500/10`, used across sign-in/sign-up errors, delete/reject actions, and
  wrong-answer feedback) have no token yet. They're left as literal Tailwind classes — legible in
  both themes (not broken), but not theme-integrated, and light-mode contrast for `text-red-400`
  on the new light `--bg` is borderline (~2.7:1, under AA for small text). Proposing
  `--danger: 248 113 113` / `--danger-2: 252 165 165` for dark (the existing red-400/red-300
  values, unchanged, since they already read fine against the dark bg) and `--danger: 178 42 42` /
  `--danger-2: 138 30 30` for light (deepened for ~6:1 contrast, computed the same way as
  `--fg-subtle` above) — same naming pattern as `--warn`/`--success`. Waiting for confirmation
  before adding these and doing the red-* to danger-* sweep.
- Files touched: `app/globals.css`, `app/layout.tsx`, `ai.md`, `components/Navbar.tsx`,
  `components/QuestionRow.tsx`, `components/ProgressBar.tsx`, `components/concept/ConceptPlayer.tsx`,
  `components/concept/TheoryPanel.tsx`, `components/concept/TopicQuiz.tsx`,
  `components/landing/LandingPage.tsx` (simplified — no longer needs to work around the body pin),
  every page under `app/student/**`, `app/teacher/**`, `app/admin/**`, plus `app/sign-in/page.tsx`,
  `app/sign-up/page.tsx`, `app/pending-approval/page.tsx`, `app/topics/**`. New:
  `components/TeacherNavbar.tsx`, `components/StudentNavbar.tsx`, `components/UserMenu.tsx`.
  `app/teacher/layout.tsx` and `app/student/layout.tsx` updated to use the new navbars.
- Why: The previous task's `<body className="dark">` pin was explicitly a stopgap to ship the
  landing-page toggle without a full app-wide color audit; this task was that audit. Real
  Teacher/Student navbars (with the toggle actually usable inside the app, not just on `/`) only
  make sense once the pages behind them render correctly in both themes.

## [2026-09-09] — Combined DSA + Aptitude analytics dashboard for teachers
- What changed: Replaced the DSA-only rollup at `/teacher/dashboard` with a combined analytics
  view. Added two API routes: `GET /api/teacher/analytics?classId=` (class-wide DSA
  completed/attempted/not_started counts and Aptitude correct/incorrect counts from `progress`
  and `aptitude_practice_history`, plus a per-student array with DSA completion %, Aptitude
  accuracy %, and total questions attempted) and
  `GET /api/teacher/analytics/student/[studentId]?classId=` (that one student's full DSA question
  list with status/timestamps, and full Aptitude question list with topic/category/correctness/
  attempts). Both use `requireRole(["teacher", "admin"])` (matching the existing app-wide
  convention — the task said `["teacher"]` specifically, but every other teacher-scoped route
  already includes admin as a cross-class bypass, e.g. `/api/teacher/progress`, so I kept that
  consistent rather than introducing a route admin suddenly can't use) and verify the requesting
  teacher owns the class before returning anything (admin bypasses ownership, same as elsewhere).
  Added `recharts` (new, justified dependency — the only chart renderer in the app). Built three
  new components under `components/analytics/`: `ClassSummaryCharts` (a bar chart of DSA status
  counts, a donut chart of Aptitude correct-vs-incorrect — exactly the two chart types asked for,
  no trend/time-series chart), `StudentTable` (sortable by any column, click a row to open the
  drawer), and `StudentDrawer` (fixed overlay, not a page navigation — DSA and Aptitude sections
  clearly separated, scrollable, closes on backdrop click/X/Escape). Rebuilt
  `app/teacher/dashboard/page.tsx` around these: kept the existing class-create form and join-code
  display (still needed — that's how classes get made, and nothing else in the task described
  replacing it), added the class selector before the analytics view.
  No hardcoded colors anywhere in the new code, including inside Recharts (whose props take CSS
  color strings, not Tailwind classes) — every fill/stroke/tick/tooltip color is
  `rgb(var(--token))`, resolved live against whichever theme is active, so charts stay legible and
  correctly themed without any JS-side theme detection. Where a chart needed a color for
  "incorrect"/"needs attention" and the app has no `--danger` token yet (see the previous
  changelog entry's still-pending proposal), reused `--warn` rather than hardcoding a red — same
  token, different chart context, no conflict.
  Both new API routes and the per-student rollup share a known simplification already present in
  the pre-existing `/api/teacher/progress` route: `progress` and `aptitude_practice_history` rows
  aren't themselves scoped to a class (aptitude has no assignment/class model yet — that's Test
  Mode, still unbuilt), so a student enrolled in more than one class sees their totals across all
  of them here, not just the selected class's assignments. Not a regression I introduced — kept
  consistent with the existing dashboard's behavior rather than silently changing the semantics.
- Files touched: `app/teacher/dashboard/page.tsx` (rewritten), `app/api/teacher/analytics/route.ts`
  (new), `app/api/teacher/analytics/student/[studentId]/route.ts` (new),
  `components/analytics/ClassSummaryCharts.tsx` (new), `components/analytics/StudentTable.tsx`
  (new), `components/analytics/StudentDrawer.tsx` (new), `types/index.ts` (added
  `ClassAnalyticsSummary`, `StudentAnalyticsRow`, `StudentDsaDetailRow`,
  `StudentAptitudeDetailRow`, `StudentAnalyticsDetail`), `package.json` (+ `recharts`),
  `project.md` (§3 dashboard row).
- Why: Teachers had no single place to see how a class was doing across both modules at once —
  DSA and Aptitude progress lived in separate, disconnected views. Doing this after the theming
  migration (rather than before) meant every new component could be built on tokens from the
  start instead of needing its own follow-up audit.

## [2026-09-09] — Fix two class-ownership authorization bugs; polish the teacher navbar
- **What changed (Step 1 — ownership audit, security-critical):** Traced every `app/api/**`
  route a teacher can reach and checked whether it scopes by the requesting teacher's own
  classes/sets rather than just their role. Two routes were genuinely vulnerable — both let a
  signed-in teacher **write into another teacher's data**, not just read it, by passing a
  `class_id` or set id they didn't own:
  - **`POST /api/assign`** had no ownership check at all on either `class_id` or
    `question_set_id`. Any teacher could assign an arbitrary question set (including one they
    didn't create) into an arbitrary class (including one they don't teach), which — because the
    handler upserts `progress` rows for every member of that class — meant a malicious or just
    curious teacher could inject assignments and progress rows straight into another teacher's
    class. **Fixed**: added a check (skipped for admin) that `class_id` belongs to
    `classes.teacher_id = <requester>` and `question_set_id` belongs to
    `question_sets.created_by = <requester>`, 404ing on either mismatch, before anything is
    written.
  - **`POST`/`DELETE /api/question-sets/[id]/items`** had no ownership check on the set id in the
    URL — any teacher could add or remove questions from any other teacher's question set by
    knowing or guessing its UUID. **Fixed**: both handlers now confirm the set's `created_by`
    matches the requester (admin bypasses) before mutating, 404ing otherwise.
  Routes checked and confirmed **already correctly scoped** (no changes needed): `GET/POST
  /api/classes` (filters by `teacher_id` unless admin), `GET /api/teacher/progress` (same),
  `GET /api/teacher/analytics` and `GET /api/teacher/analytics/student/[studentId]` (both verify
  the class belongs to the requester, and the student-detail route additionally re-verifies the
  student is actually a member of that specific class via `class_members`, so a valid classId
  paired with someone else's studentId still 404s). Verified by tracing the exact Supabase query
  chains end to end (which filters apply to which table, in what order) rather than live HTTP
  exploit testing — this environment has no seeded multi-teacher test accounts or session tooling
  to script that with, so I'm flagging the method rather than overstating it as a live pen test.
  Two things reviewed and judged **not** ownership bugs, left as-is: `GET /api/questions` and
  `GET /api/question-sets` return every teacher's questions/sets unfiltered, but both are
  explicitly, intentionally shared (the DSA question bank is documented as shared across teachers
  in the README and in `question-sets/route.ts`'s own comment) — not a leak of anything meant to
  be private. `PATCH`/`DELETE /api/aptitude/questions` let any teacher edit/delete any question in
  the aptitude bank regardless of who authored it — this mirrors the DSA bank's shared-content
  model by design, and isn't a class-ownership question at all (aptitude questions have no
  `class_id`/`teacher_id`), so it's out of this audit's scope; noting it here in case shared vs.
  per-author editing rights for the aptitude bank turns out to be a real product decision later.
- **What changed (Step 2 — navbar polish):** Rebuilt `components/TeacherNavbar.tsx` on the same
  top-navbar layout (not a sidebar, as instructed). Added a lucide icon to every nav item: Classes
  → `Users`, Assign → `Send`, and — reusing the exact icons `Features.tsx` already uses for these
  concepts on the landing page, for consistency — DSA Questions → `Binary`, Aptitude Questions →
  `Calculator`, plus `ListChecks` for Question sets and `BookOpen` for the "Content" trigger
  itself. Consolidated Question sets / DSA Questions / Aptitude Questions into a single "Content"
  dropdown (click to open, closes on outside click or Escape, chevron rotates) instead of three
  flat links. Active-route indicator is a filled pill (`bg-accent/10 text-accent`, matching the
  active-filter-pill style already used elsewhere in the app, e.g. the DSA sheet's status filters)
  on whichever item matches the current route — the "Content" trigger itself gets the same
  treatment whenever the current page is one of its three children. Mobile menu reuses the
  landing navbar's hamburger pattern, with "Content" as its own expandable accordion section
  (tap to expand/collapse the three sub-links) rather than three more flat rows. Right side
  unchanged: the same `ThemeToggle` and `UserMenu` components, not reimplemented. Sticky +
  backdrop-blur + bottom border was already how both this navbar and the public landing navbar
  worked (always-on, not scroll-triggered) — kept that as-is since it's what "matching the
  landing navbar's polish level" describes; didn't add a new scroll-position listener the
  reference implementation itself doesn't have. No hardcoded colors — every state (active/hover/
  default) uses existing tokens (`fg`, `fg-muted`, `accent`, `line`, `surface-2`), verified by
  reading the component against both `.light` and `.dark` palette values.
  One open item, disclosed rather than silently resolved: the task named three flat icons —
  "Classes, Assign, Dashboard" — but there is still only one route (`/teacher/dashboard`) behind
  both "Classes" and "Dashboard," a limitation already noted (and left as one link, not two
  pointing at the same URL) in the previous navbar task. That's unchanged here for the same
  reason: adding a second, redundant nav item to the identical URL would be worse UX, not better.
- Files touched: `app/api/assign/route.ts`, `app/api/question-sets/[id]/items/route.ts`,
  `components/TeacherNavbar.tsx`.
- Why: The ownership audit was requested because the analytics endpoints were new and
  correctness-critical (teacher-facing data about students); tracing every teacher-reachable route
  while at it surfaced two real, pre-existing bugs unrelated to the analytics work itself. The
  navbar had grown to five flat top-level links across three tasks' worth of new pages
  (Aptitude's teacher routes, then analytics) without ever being revisited as a whole.
