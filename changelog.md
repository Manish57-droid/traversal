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

## [2026-09-09] — Class collaboration model (owner + approved collaborators)
- What changed: Added `class_access_requests` and `class_collaborators` to
  `lib/supabase/schema.sql` (enums `class_access_request_status`, `class_collaborator_added_via`;
  a partial unique index so a teacher can't have two simultaneously-pending requests for the same
  class — they can re-request after a rejection, since only `pending` rows count; RLS enabled,
  same service-role-only posture as every other table). Needs the same manual
  paste-into-the-Supabase-SQL-editor step as always — no migration tooling in this repo. Added
  `lib/classAccess.ts`: `getClassAuthorization(classId, userId, userRole)` →
  `'owner' | 'collaborator' | 'admin' | 'none'`, and `getAuthorizedClassIds(userId, userRole)` for
  list views — the two functions every class-scoped route now calls instead of a raw
  `teacher_id = user.id` comparison.
  **Every route refactored to use the new helper** (cross-checked against the previous ownership
  audit's route list, per instruction, so nothing already-covered was missed):
  - `GET /api/classes` — now returns owner+collaborator classes (was owner-only) via
    `getAuthorizedClassIds`.
  - `POST /api/assign` — class-side check now `getClassAuthorization`+`isAuthorized` (question-set
    ownership check is unchanged and intentionally separate — see below).
  - `GET /api/teacher/progress` — both the single-`class_id` path and the "list every class I can
    manage" path refactored.
  - `GET /api/teacher/analytics` and `GET /api/teacher/analytics/student/[studentId]` — refactored;
    both now also return `authorization` in the response so the dashboard UI knows what to show
    (pending-requests section vs. leave-class button).
  Explicitly **not** touched, with reasons: `POST/PATCH/DELETE` on `question_sets` and
  `question_set_items` stay on the existing `created_by = user.id` check — question sets are not
  part of the class-collaboration model in this pass (a collaborator can assign a class only sets
  *they* personally created, same as before); sharing sets across collaborators would be a
  separate, unbuilt feature, noted here rather than silently expanded into scope.
  New endpoints: `GET /api/classes/browse` (every class in the system, owner name + student count
  + the requester's own relationship — no roster/content for classes they can't manage);
  `GET/POST /api/classes/[id]/access-requests` (list pending — owner/admin only; create — any
  teacher, blocked if already authorized or already pending); `POST
  .../access-requests/[requestId]/approve` and `.../reject` (owner/admin only); `GET
  /api/classes/[id]/collaborators` (anyone authorized for the class); `DELETE
  /api/classes/[id]/collaborators/[teacherId]` (owner, admin, or self-removal only — one
  collaborator can't remove another); `GET /api/admin/access-requests` (every pending request
  across every class, for the admin-wide view). Caught and fixed one real bug during
  implementation, not after: `class_access_requests` has two FKs to `users`
  (`requesting_teacher_id` and `resolved_by`), which makes PostgREST's automatic embed ambiguous —
  both places that embed it now use the explicit
  `users!class_access_requests_requesting_teacher_id_fkey(...)` constraint-name hint.
  UI: `app/teacher/classes/page.tsx` (browse-all list, click-through only for classes you're
  authorized for, "Request access" button otherwise); `components/analytics/ClassAccessPanel.tsx`
  (collaborators list + pending requests with Approve/Reject for owner/admin, "Leave class" for a
  plain collaborator) added to `app/teacher/dashboard/page.tsx`, which also now reads a `?classId=`
  query param (for the browse page's click-through) and resolves the current user's id client-side
  via `supabaseBrowser().auth.getUser()` for the leave-class action; `app/admin/access-requests/
  page.tsx` (admin-wide pending-request view). Added a "Browse" nav item (Compass icon) to
  `TeacherNavbar` and "Access requests"/"Browse classes" links to the admin section of the shared
  `Navbar`. Updated `ai.md` (the new required-helper rule, replacing the old raw-comparison
  guidance) and `project.md` §2 (Teacher role now describes co-teaching).
- **Step 6 verification**: same method as the prior ownership audit — traced the exact query/
  authorization chain for each scenario rather than live multi-teacher HTTP testing (no seeded
  test accounts or session tooling in this environment to script that with; flagging the method,
  not overstating it). A non-authorized teacher: `getClassAuthorization` returns `'none'` for them
  on that class (no `classes.teacher_id` match, no `class_collaborators` row), so `GET
  /api/teacher/analytics`/`.../student/[id]` both 404 before touching roster or progress data, and
  `POST /api/assign` 404s before writing anything. A pending request grants nothing: the
  authorization helper never queries `class_access_requests` at all — only `classes.teacher_id`
  and `class_collaborators` — so a pending (or rejected) row has zero effect on what a teacher can
  do until an owner/admin actually calls the approve endpoint, which is the only code path that
  inserts into `class_collaborators`. A rejected request likewise grants nothing, and (per the
  partial unique index) doesn't block the same teacher from requesting again later. Both theme
  modes checked by re-reading every new/changed file for hardcoded color classes — none found;
  all new UI uses existing tokens (`fg`, `fg-muted`, `fg-subtle`, `accent`, `success`, `warn`,
  `line`, `surface-2`), consistent with the earlier theming migration.
- Files touched: `lib/supabase/schema.sql`, `lib/classAccess.ts` (new), `types/index.ts`,
  `app/api/classes/route.ts`, `app/api/assign/route.ts`, `app/api/teacher/progress/route.ts`,
  `app/api/teacher/analytics/route.ts`, `app/api/teacher/analytics/student/[studentId]/route.ts`,
  `app/api/classes/browse/route.ts` (new), `app/api/classes/[id]/access-requests/route.ts` (new),
  `app/api/classes/[id]/access-requests/[requestId]/approve/route.ts` (new),
  `app/api/classes/[id]/access-requests/[requestId]/reject/route.ts` (new),
  `app/api/classes/[id]/collaborators/route.ts` (new),
  `app/api/classes/[id]/collaborators/[teacherId]/route.ts` (new),
  `app/api/admin/access-requests/route.ts` (new), `app/teacher/classes/page.tsx` (new),
  `app/teacher/dashboard/page.tsx`, `app/admin/access-requests/page.tsx` (new),
  `components/analytics/ClassAccessPanel.tsx` (new), `components/TeacherNavbar.tsx`,
  `components/Navbar.tsx`, `ai.md`, `project.md`.
- Why: Co-teaching (multiple teachers sharing a class) wasn't representable at all before — a
  class had exactly one manager with no path to add another. Centralizing the authorization check
  in one helper (rather than teaching each route its own owner-or-collaborator logic) was the
  point of Step 2: the next class-scoped route only has to call `getClassAuthorization` correctly
  once, instead of every future route risking its own subtly-wrong raw comparison the way `assign`
  and `question-sets/items` already had before the last audit.

## [2026-09-09] — Fix "teacher can't see other teachers' classes"; adopt per-migration SQL files
- **Diagnosis (Step 1, run live against the actual database, not assumed)**: queried the live
  Supabase project directly with the service-role key. Real multi-teacher data exists — 2 distinct
  teacher accounts (`Test1`, `Ankit Kumar`), each owning one class (`SBU`, `ankit-test`) — so this
  was a genuine bug, not an empty-data false alarm.
- **Root cause (Step 2, confirmed by executing the exact failing query live, not just reading the
  code)**: `GET /api/classes/browse` embeds `users(full_name, email)` directly off `classes` to
  get each class's owner name. That embed used to be unambiguous, but the previous task's
  `class_collaborators` table gave PostgREST a *second* many-to-many path between `classes` and
  `users` (on top of the one `class_members` already provided) — so a bare `users(...)` embed is
  now genuinely ambiguous and PostgREST rejects it outright with `PGRST201: Could not embed
  because more than one relationship was found for 'classes' and 'users'`. Running the exact query
  live reproduced this precisely. Compounding it: `app/teacher/classes/page.tsx` did
  `setClasses(data.classes ?? [])` with no check on `res.ok`, so the 500 error response (which has
  no `.classes` key) silently became an empty array — the page just rendered "No classes exist
  yet" with zero indication anything had failed. Two bugs, not one: the query itself, and a
  silent-failure pattern that hid it.
- **Fix**: disambiguated the embed to `users!classes_teacher_id_fkey(full_name, email)` in
  `app/api/classes/browse/route.ts` (the direct owner FK — not the `class_members` or
  `class_collaborators` paths). Also fixed the silent failure in
  `app/teacher/classes/page.tsx`: it now checks `res.ok` and surfaces `data.error` in the UI
  instead of quietly falling back to an empty list, so a future regression like this one would be
  visible immediately instead of looking like "no classes."
- **Step 3 verification (executed live, not traced)**: ran the exact fixed query against the real
  database, then ran the browse route's full relationship-computation logic verbatim against the
  real data, "as" the real teacher Ankit Kumar (`9ea4892e-...`). Raw result:
  `{"classes":[{"id":"1614d411-...","name":"ankit-test","owner_name":"Ankit Kumar",
  "student_count":0,"relationship":"owner"},{"id":"ce385291-...","name":"SBU",
  "owner_name":"Test1","student_count":1,"relationship":"none"}]}` — confirms Test1's class now
  correctly appears for Ankit Kumar with `relationship: "none"`, which is exactly what makes the
  "Request access" button render. (Ran via a temporary script using the service-role client
  against the live DB, since this environment has no way to fabricate a real browser session/
  cookie to drive an actual authenticated HTTP round-trip through Next's middleware — disclosing
  the method rather than overstating it as a full end-to-end HTTP test. The script was deleted
  after use, not committed.)
- **Per-migration SQL files adopted**: created `supabase/migrations/`, split the current
  `lib/supabase/schema.sql` retroactively into `0001_initial_schema.sql` (users/auth/classes/DSA
  question bank/assignments/progress), `0002_aptitude_module.sql`, and
  `0003_class_collaboration.sql` (which also carries a note explaining the PGRST201 ambiguity this
  migration introduced, pointing at this entry). Nothing was re-run — these are the same
  already-applied statements, just organized into legible per-change files going forward.
  `schema.sql` itself is kept as-is (not deleted), now explicitly documented at the top as a
  derived consolidated snapshot, not where new changes get authored. Updated `ai.md`'s
  "ask before changing the DB schema" rule to describe the new convention: author in
  `supabase/migrations/`, get it applied, then append to `schema.sql`.
- Files touched: `app/api/classes/browse/route.ts`, `app/teacher/classes/page.tsx`,
  `lib/supabase/schema.sql` (header note only), `ai.md`. New:
  `supabase/migrations/0001_initial_schema.sql`, `supabase/migrations/0002_aptitude_module.sql`,
  `supabase/migrations/0003_class_collaboration.sql`.
- Why: A real, user-reported visibility bug, root-caused by actually running the failing query
  against live data rather than trusting the code to be correct because it looked right — the
  ambiguous-embed error would not have been obvious from reading the route file alone, and did
  not show up in `npm run build`'s type-checking or the earlier code-trace-only "verification" for
  the collaboration feature, which is exactly the gap this task's insistence on executing real
  queries was meant to close.

## [2026-09-09] — Access-request visibility: no bug found (live-verified); fix redundant auth checks
- **Step 1 (access-request visibility)**: traced the "Pending requests" section
  (`components/analytics/ClassAccessPanel.tsx`, rendered from `app/teacher/dashboard/page.tsx`)
  and its endpoint (`GET /api/classes/[id]/access-requests`). Everything read correctly, so rather
  than trust that, ran it for real: created two fresh, isolated test teacher accounts (not reused
  from real data — creating them was additive-only; resetting a real account's password to get a
  session was considered and rejected as unnecessarily destructive), had one request access to
  the other's brand-new class, then actually launched a headless Chromium (Playwright, installed
  temporarily for this — not a project dependency) and drove the real login → dashboard → approve
  flow end to end. Screenshots confirmed: the "Pending requests (1)" section rendered with the
  requester's name and working Approve/Reject buttons, and clicking Approve moved them into
  "Collaborators" and cleared the pending list. **No bug found** — this was already correctly
  built and wired from the earlier class-collaboration task; reporting that plainly rather than
  inventing a fix for something that wasn't broken. Test accounts and the test class were deleted
  after verification; no residue in the real database.
- **Step 2 (measure first)**: added temporary `console.time`-style timing to the auth-check path
  (`middleware.ts`, `lib/roles.ts`'s `getCurrentAppUser()`) and to the Supabase queries in 4
  representative routes (`/api/teacher/analytics`, `/api/questions`, `/api/classes/browse`,
  `/api/aptitude/practice`), then drove a real authenticated session (Playwright again) through
  `/teacher/dashboard`, `/teacher/questions`, `/teacher/classes`, `/api/aptitude/practice`, and a
  fresh `/dashboard` hit, reading actual numbers off the dev server's console.
- **Step 3 (diagnosis, from the numbers, not a guess)**: for that one session, `middleware
  auth.getUser()` fired ~15 times (140–1322ms each) and — separately — `getCurrentAppUser`'s own
  `auth.getUser()` fired ~15 more times (161–1322ms each, summing to **~7.3 seconds** across the
  session) for the exact same already-verified session, because every layout AND every one of the
  4-5 client-side `/api/*` calls a single dashboard load triggers independently re-verified the
  JWT against Supabase Auth's API. This is precisely the first culprit the task flagged as most
  likely, confirmed by the numbers rather than assumed. The other three suspects were checked and
  ruled out: no N+1 queries anywhere (every list/rollup route already batches with `.in(...)` —
  confirmed by both reading the code and by each query showing as a single timed call, not a
  loop); `class_collaborators`/`class_access_requests` already have the indexes they need
  (`idx_class_collaborators_teacher`, `idx_class_access_requests_class/teacher`, plus their
  primary keys) from the migration that created them; and the one real client-side sequencing
  (class list before analytics) is a genuine dependency, not a fixable waterfall —
  `ClassAccessPanel` already parallelizes its two independent fetches with `Promise.all`.
- **Step 4 (fix)**: `middleware.ts` already does the one real, necessary `auth.getUser()` check
  per request — that stays. It now also sets `x-verified-user-id` on the request headers passed
  downstream once that check succeeds, after first stripping any client-supplied value for that
  same header name (so it can't be spoofed — middleware runs before every matched page and every
  `/api/**` route, per `config.matcher`, so nothing downstream is ever reachable without passing
  through this first). `getCurrentAppUser()` in `lib/roles.ts` now reads that header and, when
  present, skips its own `auth.getUser()` call entirely, falling back to a real check only when
  the header is absent (e.g. public paths middleware doesn't authenticate). **Correctness
  preserved deliberately**: the `users` table lookup for role/status/profile still runs fresh on
  every single call, exactly as before — nothing about role, approval status, or profile data is
  cached or reused across users or requests, only the redundant re-verification of an
  already-verified JWT is skipped. No tradeoff between correctness and speed was made here; if one
  had been necessary, it would be called out explicitly rather than shipped quietly, per
  instruction.
- **Step 5 (re-measured, not assumed)**: same 5 routes, same login flow, fresh server restart.
  `getCurrentAppUser`'s own auth check across the session: **~7,334ms → ~32ms** (15 calls
  averaging 489ms each → 16 calls averaging 2ms each) — essentially eliminated. `middleware
  auth.getUser()` numbers are unchanged (expected: that check was never redundant, it's the one
  real verification per request). Wall-clock page-load times were noisy and NOT used as the
  primary before/after signal — both runs were fresh `next dev` starts, so Next.js's dev-mode
  per-route cold-compile (a one-time, unrelated cost of 5–20s on a route's first hit) dominated
  and swamped the auth-check savings in a raw stopwatch reading; the [PERF] log deltas above are
  the real, isolated signal. Confirmed the app still works correctly post-fix: re-ran the
  Playwright session through login and `/teacher/dashboard` and screenshotted the result — correct
  user identity in the navbar, correct page render, no functional regression.
- Files touched: `middleware.ts`, `lib/roles.ts`. No other files changed — all timing
  instrumentation added for Steps 2/5 was removed before this entry; `git status` after cleanup
  showed only these two files modified.
- Why: The task specifically asked not to guess at performance fixes, and the redundant-auth-check
  hypothesis it flagged as most likely turned out to be exactly right — measured, not assumed, and
  fixed without touching how any role/status/authorization decision is actually made, only how
  many times the same already-verified identity gets re-verified per request.

## [2026-09-11] — Audit every role-mutating path; guard + log role changes
- **What was found (Step 1 — full enumeration)**: searched the entire codebase for every write to
  `users.role`. Exactly two exist: (1) the `handle_new_user` sign-up trigger, which only sets role
  at row *creation* (`on conflict (id) do nothing` — can never touch an existing row), and (2)
  `PATCH /api/admin/users`, the only endpoint that can mutate an existing user's role, called from
  the role `<select>` dropdown on `/admin/users`. Explicitly checked and ruled out, per the task's
  specific suspicion: the class access-request `approve`/`reject` endpoints and the collaborator-
  removal endpoint (all from the Prompt 8 collaboration feature) — none of them write to `users`
  at all; they only touch `class_access_requests`/`class_collaborators`, tables with no `role`
  column. They were never a candidate once actually read.
- **What was found (Step 2 — target-id check)**: traced `PATCH /api/admin/users` end to end. No
  ID-mixup bug — the frontend's `patchUser(u.id, {role})` always passes the row's own id, and the
  backend always updates `.eq("id", id)` from the request body, never falling back to the
  requesting admin's own session id. The actual flaw is a **missing safeguard**, not a wrong-target
  bug: `/admin/users` lists every account — including the admin's own — in one plain table, and
  each row's role is a live `<select>` that fires the PATCH on `onChange` with no confirmation
  dialog, updating optimistically before the network call even resolves. A single stray click on
  your own row's dropdown silently demotes you, with nothing to distinguish that row or stop it —
  this fully explains a role change nobody consciously remembers causing.
- **Fix (Step 3)**: `PATCH /api/admin/users` now rejects (400 "You can't change your own role.")
  any request where `role` is present and `id === admin.id`, before touching the database.
- **Audit log (Step 4)**: added `role_change_log` (`supabase/migrations/0004_role_change_log.sql`
  — `target_user_id`, `previous_role`, `new_role`, `changed_by`, `changed_at`; RLS enabled, no
  policies, same posture as every other table) after presenting the schema and getting explicit
  confirmation to apply it (this task didn't carry the earlier tasks' blanket schema go-ahead).
  `PATCH /api/admin/users` now fetches the current role before updating and inserts a log row only
  when the role is genuinely changing (new value differs from old) — not on every PATCH that
  happens to include a role matching what's already there. A failed log insert doesn't block the
  actual role change, which has already succeeded by that point; it's only surfaced server-side.
  **Applying this migration surfaced a real, separate issue worth recording**: after running the
  `CREATE TABLE`, the table was confirmed to exist at the Postgres catalog level
  (`information_schema.tables`) and was visible in Supabase Studio's Table Editor, yet PostgREST
  kept returning `PGRST205: Could not find the table 'public.role_change_log' in the schema cache`
  — surviving `NOTIFY pgrst, 'reload schema'` *and* a full project restart. Root cause turned out
  to be a privilege-grant gap: this table hadn't picked up the default `anon`/`authenticated`/
  `service_role` grants every other table in this project has automatically had since creation.
  Fixed with an explicit `grant select, insert, update, delete on role_change_log to anon,
  authenticated, service_role;` — resolved immediately. Worth knowing if a future table exhibits
  the same "exists but PostgREST can't see it" symptom.
- **Step 5 verification (live, two real test accounts, not code-traced)**: created a fresh admin
  test account (deliberately *not* the real hard-coded admin, so the real account was never
  touched) and a fresh pending-teacher target account. Drove a real logged-in session through
  `/admin/users`: approved the target (status `pending` → `approved`), changed the target's role
  (`teacher` → `student`), and attempted a self-role-change on the admin's own id directly against
  the API. Results, queried straight from the database afterward:
  - Admin's own row: `{"role":"admin","status":"approved"}` — unchanged.
  - Target's row: `{"role":"student","status":"approved"}` — correctly updated, and only the
    target.
  - Self-role-change attempt: `{"status":400,"body":{"error":"You can't change your own role."}}`.
  - The actual `role_change_log` row: `{"target_user_id":"c285dd2b-...","previous_role":"teacher",
    "new_role":"student","changed_by":"a4929bee-...","changed_at":"2026-09-11T04:21:36.803398+00:00"}`
    — `changed_by` is the admin test account's id, confirming attribution is correct.
  Test accounts and the log row deleted afterward; no fixtures left behind.
- Files touched: `app/api/admin/users/route.ts`, `lib/supabase/schema.sql`. New:
  `supabase/migrations/0004_role_change_log.sql`.
- Why: An admin's role changed with nobody able to say how or why — the fix isn't just patching
  the one flaw found, but making the whole class of "generic update endpoint accidentally targets
  the wrong/same row" bug both harder to trigger (the guard) and, if it ever happens again anyway,
  actually traceable (the log) instead of a repeat mystery.

## [2026-09-11] — Admin gets a real interface: sidebar shell, Overview, Role Log
- **Step 1 (routing check)**: traced `app/dashboard/page.tsx` (the post-login role router) and
  `middleware.ts`'s `/admin` guard. Both were already structurally correct — the router redirects
  `admin` to `/admin/dashboard` specifically (not a `/teacher/**` route), and middleware's
  `/admin` check is a real role comparison (`profile.role !== "admin"`), not just an
  "is logged in" check. Verified live rather than trusting the read: a fresh admin test account,
  logged in for real, landed at `http://localhost:3000/admin/dashboard` after the redirect chain
  settled (not `/teacher/dashboard` or anywhere else). No routing bug found in this pass — what
  *was* missing was a real admin interface behind that URL to land on, which is what the rest of
  this task builds. (What most plausibly explained the reported "immediate navigation bug" feel:
  before this task, `/admin/dashboard` existed but was a bare two-stat-card page sharing the
  generic `Navbar`, whose admin nav section pointed mostly at `/teacher/**` pages — landing there
  and then clicking anything took you straight into the teacher shell with no way back, which
  reads like a navigation bug even though the initial redirect itself was correct.)
- **Step 2 (sidebar shell)**: new `components/AdminSidebar.tsx` — full sidebar (icon + label) on
  large screens, collapses to an icon-only rail on medium screens, becomes a slide-out drawer
  (hamburger-triggered) on mobile. Five sections: Overview, Users, Classes, Access Requests, Role
  Log, with active-route highlighting. Users and Access Requests link straight to the real,
  already-existing pages (`/admin/users`, `/admin/access-requests`) rather than placeholders,
  since building fake stand-ins for working pages would've been worse than just wiring them in.
  Classes (`/admin/classes`) is a genuine placeholder — no dedicated admin classes view exists
  yet — with a link out to `/teacher/classes`, which admin already has full access to. Bottom of
  the sidebar: the same `ThemeToggle` component, and `UserMenu` (also shared with Teacher/Student
  navbars) extended with an optional `placement="top"` prop so its dropdown opens upward instead
  of clipping off the bottom of the viewport when anchored at the bottom of a sidebar — the only
  change made to that component; existing callers are unaffected (defaults to the old behavior).
  `app/admin/layout.tsx` now renders the sidebar instead of the shared `Navbar`.
- **Step 3 (Overview)**: `GET /api/admin/overview` (new) returns five stat counts (teachers,
  students, classes, pending sign-ups, pending class-access-requests) plus a merged, time-sorted
  "recent activity" feed — the 10 most recent `role_change_log` rows and the 10 most recent
  `class_access_requests` (any status), each rendered as a one-line description ("X changed Y's
  role: Teacher → Student", "Z approved X's access request to SBU"). `role_change_log` has two
  FKs to `users` (`target_user_id`, `changed_by`) — same PGRST201 ambiguity as
  `class_access_requests` elsewhere in this app — so both embeds use the explicit
  `users!role_change_log_target_user_id_fkey(...)` / `...changed_by_fkey(...)` constraint-name
  hints from the start, rather than discovering the error live again.
- **Step 4 (Role Log page)**: `GET /api/admin/role-log` (new) + `app/admin/role-log/page.tsx` —
  every `role_change_log` row with target/actor names resolved, sortable by timestamp, filterable
  by target user name. The audit trail from the last task now has an actual page.
- **Step 5 (live verification, not traced)**: created a fresh admin test account and a fresh
  non-admin test account (neither the real hard-coded admin). Logged in as the test admin for
  real: landed at `/admin/dashboard` after the redirect settled. Changed the non-admin test
  account's role via the *real* `/admin/users` UI (teacher → student) to produce a genuine
  `role_change_log` row, then cross-checked all five Overview stat card numbers against a direct
  database query taken at the same moment — **exact match on all five**:
  `{teacherCount: 2, studentCount: 2, classCount: 4, pendingSignups: 0, pendingAccessRequests: 2}`
  vs. cards showing `[2, 2, 4, 0, 2]`. `/admin/role-log` showed the real row just created
  (`Non Admin Test | Teacher → Student | Admin UI Test | <timestamp>`). Screenshotted both light
  and dark theme (Overview, Role Log, mobile drawer) — all render correctly on tokens, no
  hardcoded colors (grepped every new/changed file to confirm). The non-admin test account,
  navigating directly to `/admin/dashboard` by URL after its role-change, was redirected to
  `/student/dashboard` — confirmed blocked. Test accounts, the log row, and the test class were
  deleted afterward; two *real* pending access requests already in the database (from actual
  earlier use, not test fixtures) were deliberately left untouched and showed up correctly in the
  Overview's recent-activity feed as part of this same verification.
- Files touched: `app/admin/layout.tsx`, `app/admin/dashboard/page.tsx` (rewritten), `types/index.ts`,
  `components/UserMenu.tsx`, `project.md` (§2 Admin description). New: `components/AdminSidebar.tsx`,
  `app/admin/classes/page.tsx`, `app/admin/role-log/page.tsx`, `app/api/admin/overview/route.ts`,
  `app/api/admin/role-log/route.ts`.
- Why: Admin had no real home of its own — a bare two-stat page and a shared navbar mostly pointed
  at teacher routes. This gives admin a proper shell and makes the previous task's audit log
  actually usable, not just a table sitting in the database that nobody without direct DB access
  could ever look at.

## [2026-09-11] — Interview Preparation module + aptitude topic taxonomy
- **What changed**: two additions, both following the same rule — external sites referenced for
  categorization *structure* only (never fetched; used from general knowledge of how they group
  topics), zero question/answer/topic content copied from anywhere. All real content is authored
  in-app.
  - **Interview Preparation** (new, alongside — not replacing — the existing `/topics` 3D concept
    player): `interview_categories` (name, slug, description, icon, display_order) and
    `interview_questions` (category_id, question, answer, difficulty, `created_by` — same
    attribution pattern as every other question bank in this app) added via
    `supabase/migrations/0005_interview_prep.sql`. Authoring is teacher **and** admin (not
    admin-only) — matches the existing DSA and Aptitude question-bank convention rather than
    introducing a new, inconsistent restriction. Built `app/student/interview-prep/page.tsx`
    (category grid, icon + name + live question count) → `.../[category]/page.tsx` (accordion
    question list, answer hidden until clicked, difficulty + "Added by <name>" shown once
    expanded) and `app/teacher/interview-prep/page.tsx` (CRUD for both categories and questions).
    `lib/interviewIcons.ts` maps a small known set of lucide icon names (matching the category
    list) to components, falling back to a generic icon for anything unrecognized — icon choice
    stays admin-authored free text but can never render nothing. Added "Interview Prep" to both
    `StudentNavbar` (flat link, alongside Topics) and `TeacherNavbar`'s existing Content dropdown
    (alongside DSA/Aptitude Questions). Seeded the 10 categories proposed and confirmed with the
    user (C++, Java, Python, SQL, DBMS, Operating Systems, Computer Networks, System Design, OOP
    Concepts, JavaScript) plus one original example Q&A per category (attributed to the real admin
    account) — everything else is intentionally empty, pending real authoring.
  - **Aptitude topic taxonomy**: `lib/aptitudeTopics.ts` — a starting per-category topic-name list
    (Quant: Time & Work, Profit & Loss, Percentages, etc.; Logical: Blood Relations, Syllogisms,
    Seating Arrangement, etc.; Verbal: Reading Comprehension, Synonyms & Antonyms, Para Jumbles,
    etc. — full lists confirmed with the user before building), wired into the existing teacher
    aptitude question form as an HTML `<datalist>` autocomplete on the topic field. `topic` stays
    free text on `aptitude_questions` — this only suggests, never constrains.
- **Verification (live, not traced)**: fresh, isolated student and teacher test accounts (neither
  the real admin). As student: nav showed both "Interview Prep" and "Topics" together, the
  category grid rendered all 10 seeded categories, and opening the C++ category's accordion in
  dark mode revealed the real seeded answer with "Easy · Added by manish kushwaha" (the real admin
  account) — confirming `created_by` attribution displays correctly for authored content. As
  teacher: the Content dropdown showed "Interview Prep", and adding a brand-new test question
  through the actual authoring UI showed up immediately with "Added by IPrep Test Teacher" —
  confirming attribution saves correctly too, not just for pre-seeded rows. Both light and dark
  theme screenshotted throughout; every new/changed file grepped for hardcoded colors (none
  found, `text-red-400` on delete buttons excepted — the same pre-existing, already-flagged
  pattern used across the rest of the app). Test question and test accounts deleted afterward; the
  10 real seeded categories and their example Q&A were left in place.
- Files touched: `types/index.ts`, `project.md` (§3 new module row + aptitude taxonomy note),
  `components/StudentNavbar.tsx`, `components/TeacherNavbar.tsx`,
  `app/teacher/aptitude/questions/page.tsx`, `lib/supabase/schema.sql`. New:
  `supabase/migrations/0005_interview_prep.sql`, `lib/interviewIcons.ts`, `lib/aptitudeTopics.ts`,
  `app/api/interview-prep/categories/route.ts`, `app/api/interview-prep/questions/route.ts`,
  `app/student/interview-prep/page.tsx`, `app/student/interview-prep/[category]/page.tsx`,
  `app/teacher/interview-prep/page.tsx`.
- Why: Interview Prep gives students a browsable reference for the conceptual questions actual
  interviews ask (distinct from Aptitude's timed MCQs and DSA's judge-linked problems), authored
  entirely in-house rather than scraped — keeping the app's own voice and avoiding any copyright
  question. The aptitude taxonomy removes the "invent a topic name from scratch every time" friction
  for teachers without taking away the flexibility of free text.

## [2026-09-11] — DSA/Aptitude/Interview Prep seed data + link-curation workflow
- **What changed**: bulk-seeded starter content across all three question banks, all titles/topics
  used external sites (dsa.apnacollege.in, hynts.in) only for naming/categorization structure —
  zero scraped question or answer text; every prompt/answer word is either admin-authored or from
  the two ready-made seed JSON files.
  - **DSA question bank**: real per-problem links for `dsa.apnacollege.in`'s "Sigma" sheet turned
    out to be JS-rendered and partly "Coming Soon" (confirmed via a real headless-browser render,
    not just a text fetch) and hynts.in's problem list sits behind sign-up — rather than fabricate
    URLs, proposed and got explicit confirmation to seed all 447 titles unlinked, flagged for
    curation. Required a schema change: `supabase/migrations/0006_dsa_link_curation.sql` drops
    `not null` on `questions.url`, adds `needs_link_curation boolean not null default false` (+
    check constraint requiring one of `url`/`needs_link_curation`, + partial index), applied by the
    user before import. Added a `PATCH` handler to `app/api/questions/route.ts` for setting the
    real link later (auto-detects `platform`), a "447 questions still need a real link" filter
    banner + inline "Add link" mini-form per row in `app/teacher/questions/page.tsx`, and a
    "Link coming soon" state in `components/QuestionRow.tsx` for students. Result: 448 total (1
    pre-existing real link + 447 newly seeded, all flagged).
  - **Aptitude**: imported the 53-question seed file with `created_by` set to the real admin
    account, skipping exact-duplicate prompts against existing rows. 2 of 53 were exact duplicates
    of pre-existing (unrelated) "Number Series" rows and were skipped — 51 newly inserted, 53 total.
  - **Interview Prep**: imported the 36-question seed file across its 6 named categories, which
    already existed from the prior module-build task and were reused rather than duplicated. 1 of
    36 was an exact duplicate of a previously-seeded example and was skipped — 35 newly inserted.
    All 10 categories unchanged in count; only the 6 touched gained questions.
- **Verification (live, not traced)**: fresh, isolated student/teacher/admin test accounts. As
  student, in both light and dark mode: the Aptitude "Quant" category rendered its real seeded
  topics (Percentages, Profit and Loss, Ratio and Proportion, etc., 3 questions each); the
  Interview Prep C++ category rendered its real Q&A content. As teacher: the question bank showed
  the "447 questions still need a real link — click to filter →" banner with per-row "Add link"
  buttons, confirming the curation workflow renders correctly. Test accounts deleted afterward;
  seeded data left in place.
- Files touched: `app/api/questions/route.ts`, `components/QuestionRow.tsx`,
  `app/teacher/questions/page.tsx`, `types/index.ts`, `lib/supabase/schema.sql`. New:
  `supabase/migrations/0006_dsa_link_curation.sql`.
- Why: gives every question bank real starter content instead of empty/near-empty tables, without
  ever fabricating a URL or copying another site's written text — the curation flag makes the "447
  titles still need a real link" gap visible and actionable to teachers instead of silently wrong.

## [2026-09-11] — Interview Prep sidebar navigation, navbar role badges, real platform icons
- **What changed**: three independent, unrelated UI improvements.
  - **Interview Prep sidebar navigation**: `app/student/interview-prep/[category]/page.tsx`
    rewritten as a two-column desktop layout — a sticky left sidebar listing every question in the
    category as a numbered clickable link, main content on the right as the same accordion list.
    Clicking a sidebar entry scrolls to and expands that question (multiple questions can stay open
    at once — a deliberate choice, not auto-collapsing). The currently-in-view question is
    highlighted in the sidebar as the user scrolls, via a real `IntersectionObserver` (not
    click-only). Below `lg`, the sidebar collapses into a "Jump to question" button that opens a
    slide-in drawer instead of two columns.
  - **Role badges in every authenticated navbar**: new `components/RoleBadge.tsx` — a small
    pill (`Student`/`Teacher`/`Admin`) using the existing `accent` token, no new color. Added as an
    optional `role` prop on the already-shared `components/UserMenu.tsx` (one implementation, not
    three) and threaded through `TeacherNavbar`, `StudentNavbar`, and `AdminSidebar`'s user section
    via a one-line change in each of the three layout files (`app/teacher|student|admin/layout.tsx`)
    passing `role: user.role` down.
  - **Real platform icons on the landing page**: added `react-icons` and swapped the Platforms
    section's placeholder letter-badges for real brand marks — `SiLeetcode`, `SiCodechef`,
    `SiCodeforces`, `SiGeeksforgeeks`, `SiHackerrank` from `react-icons/si`, each rendered in its
    own brand color. All 5 were available — no fallback needed for any of them.
- **Verification (live, not traced)**: fresh, isolated student/teacher/admin test accounts, both
  themes. Interview Prep: clicking sidebar entry #3 scrolled the main panel to and expanded exactly
  that question (confirmed via screenshot, both themes) while the sidebar highlight tracked it;
  scrolling the page further moved the highlighted sidebar entry, confirming the scroll-spy is
  live, not just click-driven. Role badges: confirmed rendering next to the name in the student
  navbar ("STUDENT"), teacher navbar ("TEACHER"), and admin sidebar ("ADMIN"). Platform icons:
  confirmed all 5 render with their real brand colors on the landing page in both themes. `tsc
  --noEmit` clean, hardcoded-color grep clean, production build succeeded (all 42 routes).
  Test accounts deleted afterward.
- Files touched: `components/UserMenu.tsx`, `components/TeacherNavbar.tsx`,
  `components/StudentNavbar.tsx`, `components/AdminSidebar.tsx`,
  `app/teacher/layout.tsx`, `app/student/layout.tsx`, `app/admin/layout.tsx`,
  `components/landing/Platforms.tsx`, `package.json`. New: `components/RoleBadge.tsx`.
- Why: the sidebar turns a long flat accordion into something actually navigable once a category
  has more than a handful of questions; the role badge makes it obvious at a glance which account
  context you're in (useful for anyone who tests across roles, and clearer for real users too);
  real brand icons replace generic placeholders with marks students actually recognize.

## [2026-09-11] — Proctored Tests foundation (schema + authoring, no test-taking yet)
- **What changed**: the first slice of "Protocol test" / simulated placement drive — a new,
  separate exam type created by a teacher/admin under a specific class, with its own dedicated
  MCQ question bank. Schema and creation/authoring only; the secure test-taking screen (camera/mic
  capture, fullscreen enforcement, live violation detection, scoring) is a separate follow-up task.
  - **Schema** (`supabase/migrations/0007_proctored_tests.sql`, presented and confirmed before
    applying): `proctored_questions` (MCQ, same shape as `aptitude_questions` — options jsonb,
    correct_option index, reuses `question_difficulty`; MCQ only for v1, no coding questions, no
    in-house judge); `proctored_tests` (`class_id` NOT NULL — a test belongs to exactly one class,
    unlike `aptitude_tests`/`aptitude_assignments` which separate test from class-assignment;
    `time_limit_minutes`, `negative_marking_fraction`, `max_violations_before_autosubmit` default
    3, `require_camera`/`require_mic` toggles); `proctored_test_questions` (ordered junction,
    same explicit-`position` pattern as `aptitude_test_questions`); `proctored_test_attempts` (one
    per student per test, `violation_count`, unique on `(test_id, student_id)`); `proctored_violations`
    (full audit log per attempt — `tab_switch`/`fullscreen_exit`/`copy_attempt`/`camera_off` — this
    is the record a teacher reviews, since no camera images/video are stored per the no-storage
    decision). RLS enabled on all five, same service-role-bypass-only posture as every other table.
  - **Authorization**: every class-scoped route (`GET`/`POST /api/proctored-tests`) reuses the
    existing centralized `getClassAuthorization(classId, userId, userRole)` helper — no new ad-hoc
    ownership check — so a test can only be created/listed by the class's owner, an approved
    collaborator, or an admin.
  - **Question bank CRUD**: `app/teacher/proctored-questions/page.tsx` +
    `app/api/proctored-questions/route.ts`, mirroring the existing Aptitude/Interview-Prep bank
    patterns (options editor with a radio for the correct answer, difficulty, `created_by`
    attribution shown as "Added by <name>" via the same `users(full_name, email)` join). Added
    "Proctored Questions" to the teacher navbar's Content dropdown.
  - **Test creation UI**: a new "Proctored tests" panel (`components/ProctoredTestsPanel.tsx`) on
    the class detail page (`/teacher/dashboard`, the same view both teacher and admin already use
    for a selected class) — lists existing tests for the class and a "Create test" form (name,
    description, time limit, negative marking, violation threshold, camera/mic toggles, manual
    question checkboxes or "Pick N random"). Rendered only when the caller already has
    owner/collaborator/admin authorization on the selected class, alongside the existing
    `ClassAccessPanel`.
- **Bug found and fixed during verification**: the "N random" question-count input had a native
  HTML `max` attribute set to the bank size. With a small bank (e.g. 1 question) and the input's
  default value of 5, the browser's own validation silently blocked the entire form's submit —
  including manual checkbox selection, which doesn't even use that field — with no visible error
  until you noticed the tooltip. Fixed by dropping `max` (the random-pick logic already clamps
  via `Math.min(randomCount, bank.length)` in code, so the attribute was redundant and actively
  harmful).
- **Verification (live, not traced)**: fresh, isolated accounts — an owning teacher, an outsider
  teacher with no relationship to the test class, and an admin — plus a throwaway class and one
  seeded proctored question. Confirmed via direct API calls: the outsider teacher's
  `POST /api/proctored-tests` on the class returned **404 "Class not found"** (the class-not-found
  response, not a 403, matches the existing pattern elsewhere in the app of not confirming a
  class's existence to an unauthorized caller); the admin's request against the same class
  succeeded (201) regardless of not owning it. Confirmed via the real UI: the owning teacher
  opened the "Create test" form, filled it out, selected a question, and submitted — the test
  (`"UI Test Drive"`) was verified present in the database afterward with the exact submitted
  values. Both light and dark mode screenshotted on the class dashboard (list + panel) and the
  question bank page — dark mode renders cleanly, camera/violation-threshold badges visible.
  Production build succeeded with the two new routes (`/teacher/proctored-questions`,
  `/api/proctored-tests`, `/api/proctored-questions`) compiling cleanly. Test accounts, class,
  question, and all created test tests deleted afterward.
- Files touched: `types/index.ts`, `components/TeacherNavbar.tsx`, `app/teacher/dashboard/page.tsx`,
  `lib/supabase/schema.sql`, `project.md` (§3 status row now IN PROGRESS + §5 new tables). New:
  `supabase/migrations/0007_proctored_tests.sql`, `app/api/proctored-questions/route.ts`,
  `app/api/proctored-tests/route.ts`, `app/teacher/proctored-questions/page.tsx`,
  `components/ProctoredTestsPanel.tsx`.
- Why: proctored tests need their own bank because they're MCQ-only and graded under exam
  conditions — mixing them into the Aptitude bank would blur "practice content" with "exam
  content" and risk a question a student already saw in practice mode showing up in a proctored
  test. Scoping every test to exactly one class (rather than a separate assignment step like
  Aptitude/DSA) matches how a real placement drive works: a specific batch, sitting a specific
  exam, once. Building schema + authoring first — and deliberately stopping before the
  test-taking screen — lets the data model and authorization get reviewed and hardened before any
  student-facing surface (camera capture, violation detection) is built on top of it.

## [2026-09-11] — Proctored Tests: full student test-taking screen, violation detection, result release
- **What changed**: the second slice of Proctored Tests — the actual student-facing exam flow on
  top of last task's schema/authoring foundation. Everything security- or integrity-relevant
  (violation count, elapsed time, final score) is computed and enforced server-side; the client
  only ever reflects state it's told, never decides it.
  - **Schema additions**: `proctored_tests.results_released` (boolean, default false — gates the
    full review page) via `0008_proctored_results_release.sql`; an atomic-increment Postgres
    function `increment_proctored_violation_count` via `0009_proctored_violation_increment.sql`
    (see the bug below — this replaced a JS-side read-then-write).
  - **Pre-test screen** (`/student/proctored-tests/[testId]/start`): plainly states what's
    actually checked — fullscreen, tab-switch/copy logging, violation-count auto-submit — and
    explicitly does **not** claim to detect other running applications or remote-desktop software,
    since a browser has no way to see either. If the test requires camera/mic, `getUserMedia` is
    requested here with a live preview so the student can confirm it's working before starting;
    denial blocks the Start button. Clicking "Start Test" calls `requestFullscreen()` first (still
    inside the click's user-gesture window, before any `await`) and then starts/resumes the
    attempt server-side in the same handler.
  - **Test screen** (`/student/proctored-tests/[testId]/take`): top bar (student name + class,
    server-authoritative countdown), main question/options panel, right-side numbered palette
    (green = answered, yellow = visited, red = untouched), Submit with a confirmation dialog.
    Every answer selection immediately `PATCH`es the attempt's `answers` jsonb (autosave, not
    deferred to final submit) — a violation-triggered auto-submit or a crashed tab still scores
    real saved answers. The client's countdown is purely cosmetic: it's seeded from a server-given
    `remaining_seconds` and re-synced from the server every 30s; the server independently
    recomputes `(started_at + time_limit_minutes) − now()` on every write endpoint and force-closes
    an overdue attempt regardless of what the client believes.
  - **Violation detection**, each logged via `POST .../violations` (inserts a `proctored_violations`
    row and atomically bumps `violation_count` — never trusts a client-reported count): fullscreen
    exit (`fullscreenchange`, shows a blocking "Resume" overlay, logged the instant exit is
    detected, not on the Resume click), tab-switch/blur (`visibilitychange` + `blur`, debounced so
    overlapping events don't double-log), copy/cut/contextmenu/selectstart prevention over the
    question area (only copy/cut are logged as violations; the other two are silently blocked),
    and camera-off (`track.onended`/`mute`, only when the test requires a camera). Each violation
    shows a brief non-blocking toast with the running count; reaching
    `max_violations_before_autosubmit` immediately force-submits
    (`status = 'auto_submitted_violation'`) and redirects to the result screen.
  - **Submit + scoring**: `POST /api/proctored-tests/[id]/attempts/[attemptId]/submit` is the only
    place a score is ever computed — it takes no body at all. Whether the closeout is a normal
    submit, a timeout, or a violation-triggered auto-submit is derived entirely from the attempt's
    own server-known state (`violation_count` vs. the test's threshold, elapsed time vs. its
    limit) inside a shared `finalizeAttempt` helper (`lib/proctoredScoring.ts`), never from
    anything the client claims — a deliberately stricter reading of "client never decides" than a
    passed-in reason flag would have been. Idempotent: calling it twice just returns the existing
    result.
  - **Post-submit + review**: the result screen (`/student/proctored-tests/[testId]/result`) shows
    only the score, with wording specific to how the attempt ended — no per-question right/wrong
    here. `/student/proctored-tests/[testId]/review` is gated on `results_released`: a 403 with
    "Results haven't been released yet" until the teacher flips it, then the full per-question
    correct/incorrect + explanation view. A "Release results" / "Unrelease results" toggle was
    added to the teacher's per-test expandable detail (`components/ProctoredTestsPanel.tsx`),
    alongside a per-student violation audit — status, score, total violation count, and a
    breakdown chip per violation type (e.g. "Fullscreen exit: 1 · Tab switch: 1") — this is what
    makes the no-camera-storage tradeoff acceptable, since a teacher can still see a suspicious
    pattern without any recording ever existing.
- **Bug found and fixed during verification**: two violations landing within the same second (a
  fullscreen exit immediately followed by a tab switch — an entirely realistic sequence, e.g. a
  student exiting fullscreen by switching apps) raced on a plain read-then-write increment in
  application code. Both requests read the same starting `violation_count`, both computed `+1`,
  and the second write clobbered the first — two rows landed in `proctored_violations` but the
  count only advanced by one, silently letting the auto-submit-at-threshold check miss its
  trigger. Fixed with a single atomic `UPDATE ... SET violation_count = violation_count + 1
  ... RETURNING` done inside Postgres via an RPC function, since the JS client has no atomic
  increment of its own for a plain column.
- **Verification (live, not traced)** — fresh, isolated teacher/student accounts, a throwaway
  class, 3 real questions, and a real proctored test (2-violation threshold to make the auto-submit
  path reachable quickly):
  - **Fullscreen exit**: confirmed real `requestFullscreen()` engaged in the browser
    (`document.fullscreenElement` was genuinely truthy after Start), simulated exit fired the
    `fullscreenchange` listener, the blocking "You exited fullscreen" overlay appeared, and a
    `fullscreen_exit` row landed in `proctored_violations` immediately (not on the Resume click).
  - **Tab switch**: a `blur` event logged a `tab_switch` row.
  - **Violation threshold**: with the atomic-increment fix applied, the second violation correctly
    pushed `violation_count` to 2 (matching the test's threshold), the attempt was force-submitted
    server-side with `status = 'auto_submitted_violation'` and a real computed score (1/3, matching
    the one correct answer that had been saved), and the client was redirected to
    `/result?status=auto_submitted_violation&score=1&total=3`.
  - **Server-authoritative timer**: with the client's on-screen countdown still showing `29:56`,
    the attempt's `started_at` was rewound 2 hours into the past directly in the database (the
    "manually adjust the clock" check, done by directly manipulating the value the server actually
    trusts rather than the OS clock, since server and browser share a machine in local dev). The
    very next server call — the same endpoint the client's 30-second resync hits — independently
    computed `remaining_seconds: 0`, closed the attempt out as `status: "expired"` with a real
    score, and the client was auto-redirected to the result screen on its next check. The client's
    own displayed value never factored into the decision.
  - **Result-release gating**: `GET .../review` returned `403 "Results haven't been released yet."`
    before the teacher's toggle, and `200` with full `correct_option`/`selected_option` detail
    immediately after — same test, same attempt, only the flag changed.
  - **Teacher violation view**: the expandable per-test detail correctly showed
    `auto_submitted_violation · 1/3`, `2 violations`, and per-type chips `Fullscreen exit: 1` /
    `Tab switch: 1`.
  - **Both themes**: start screen, live exam screen (top bar, palette, options), the fullscreen-exit
    overlay, the result screen, the student review page, and the teacher violation/release view all
    screenshotted in light and dark — all render cleanly, no dark-mode contrast issues, no
    unstyled/raw-color leaks. One real bug found and fixed along the way: the exam screen's outer
    container had no explicit `z-index`, so the normal `StudentNavbar` (which does carry one)
    painted over the custom top bar instead of being fully covered by the immersive exam view —
    fixed by giving the exam container `z-50`, which also has the security-adjacent benefit of
    fully hiding the app's own nav links during a test rather than leaving them visually peeking
    through.
  - A production build was run clean (all new routes compiling) and all test accounts, class,
    questions, and attempts were deleted afterward.
- Files touched: `types/index.ts`, `lib/classAccess.ts` (new `isClassMember`), `lib/supabase/schema.sql`,
  `components/StudentNavbar.tsx`, `components/ProctoredTestsPanel.tsx`,
  `app/api/proctored-tests/route.ts`, `app/teacher/dashboard/page.tsx`, `project.md` (§3 status +
  honest limitations, §5 new column). New: `supabase/migrations/0008_proctored_results_release.sql`,
  `supabase/migrations/0009_proctored_violation_increment.sql`, `lib/proctoredScoring.ts`,
  `app/api/proctored-tests/[id]/route.ts`, `app/api/proctored-tests/[id]/attempts/route.ts`,
  `app/api/proctored-tests/[id]/attempts/[attemptId]/route.ts`,
  `app/api/proctored-tests/[id]/attempts/[attemptId]/submit/route.ts`,
  `app/api/proctored-tests/[id]/attempts/[attemptId]/violations/route.ts`,
  `app/api/proctored-tests/[id]/review/route.ts`, `app/api/student/proctored-tests/route.ts`,
  `app/student/proctored-tests/page.tsx`, `app/student/proctored-tests/[testId]/start/page.tsx`,
  `app/student/proctored-tests/[testId]/take/page.tsx`,
  `app/student/proctored-tests/[testId]/result/page.tsx`,
  `app/student/proctored-tests/[testId]/review/page.tsx`.
- Why: a proctored exam is only as trustworthy as its weakest enforcement point — every design
  choice here (server-computed timer, server-computed score, atomic violation counting, a
  reason-less submit endpoint that derives its own status) exists to make sure the one thing a
  student's browser controls is what they see, never what actually gets recorded. Being explicit
  in project.md about what this can't do (no cross-application detection, no camera storage) is
  as important as documenting what it can — anyone building on this later needs to know a
  "proctored" test here means "logged and auto-submitted on suspicious activity," not "cheating is
  impossible."

## [2026-09-16] — Profile editing, OTP-based forgot password, reusable password-visibility toggle
- **REQUIRED MANUAL STEP — not yet done, must be done for the OTP email to work for real users**:
  in the Supabase Dashboard, go to **Authentication → Email Templates → Reset Password** and change
  the template body to render `{{ .Token }}` (the 6-digit — in this project, actually 8-digit, see
  below — OTP) instead of the default `{{ .ConfirmationURL }}` link. Until this is done, the email
  a real user receives after using "Forgot password?" will contain a confirmation link, not a code,
  and the `/reset-password` screen this task built will have nothing to enter. This cannot be done
  from code; someone with dashboard access has to make this change directly.
- **What changed**: three related additions to account management.
  - **`PasswordInput`** (`components/PasswordInput.tsx`): a reusable wrapper around a standard
    input with an Eye/EyeOff (lucide-react) toggle button flipping between `type="password"` and
    `type="text"`. Migrated onto every password field in the app — sign-in, sign-up, the new
    profile password-change form, and both new OTP-reset fields — no field left as a raw
    `type="password"` input (confirmed via a repo-wide grep after migrating).
  - **`app/profile/page.tsx`** (works for any role — student/teacher/admin all land here):
    shows name, read-only email, and the existing `RoleBadge` component (reused, not
    reimplemented). An "Edit" button reveals an editable name field; Save calls the new
    `PATCH /api/profile` route, which updates only the caller's own `users.full_name` row
    (`getCurrentAppUser()` scopes it — no id is ever accepted from the client). A "Change
    Password" section takes current/new/confirm password (all `PasswordInput`): before calling
    `supabase.auth.updateUser({ password })`, it first re-authenticates via
    `signInWithPassword` with the current password — a failure there is surfaced as "Current
    password is incorrect" and the update is never attempted. New passwords are checked against a
    shared `lib/passwordStrength.ts` rule (min 8 characters, at least one number) with live visible
    feedback, and must match the confirm field, before the submit button even enables. A "Profile"
    link was added to the shared `UserMenu` dropdown (one implementation, reused across all three
    navbars, same pattern as the earlier role-badge work) so every role can actually reach the page.
    **Skipped, noted rather than faked**: the optional "send a notification email on password
    change" — this app has no email-sending infrastructure of its own (no Edge Function, no SMTP/
    third-party email API configured anywhere); Supabase Auth's built-in emails only cover its own
    specific flows (signup confirmation, password recovery), not arbitrary custom notifications, so
    building this properly is a separate infrastructure task, not a few lines here.
  - **Forgot password (OTP-based)**: a "Forgot password?" link added next to the password label on
    `/sign-in`. `app/forgot-password/page.tsx` collects an email and calls
    `resetPasswordForEmail` — once Step 0's template change is live, this is what triggers the code
    email. `app/reset-password/page.tsx` takes the emailed code, new password, and confirm
    (`PasswordInput` for both), calls `supabase.auth.verifyOtp({ email, token, type: 'recovery' })`
    to exchange the code for a real session, then `updateUser({ password })` to set the new
    password — same strength/match rule as the profile form. An expired/incorrect code surfaces
    Supabase's own error text plainly ("Token has expired or is invalid") rather than failing
    silently. Both new routes added to `middleware.ts`'s `PUBLIC_PATHS` so a signed-out visitor can
    actually reach them.
- **Real finding from live testing — this project's OTP is 8 digits, not 6**: the task described a
  6-digit code (Supabase's documented default), but retrieving the actual value this project's
  Supabase instance issues (via `supabase.auth.admin.generateLink({ type: 'recovery', email })`,
  which returns the identical OTP a real email would contain, in `properties.email_otp` — used here
  specifically because no real inbox was available to read from during automated testing) showed an
  8-digit numeric code. The code input originally had `maxLength={6}`, which would have silently
  truncated every real code a user typed and made the entire flow permanently fail end-to-end
  despite looking correct in isolation. Fixed by raising the cap to 12 and switching the on-screen
  copy from "6-digit code" to length-agnostic "verification code" wording in both
  `forgot-password` and `reset-password`, since the true length is a property of this Supabase
  project's configuration, not something the client should assume.
- **Another finding, unrelated to this app's code**: `resetPasswordForEmail` rejected one
  specific test address (`verify.account.test@gmail.com`) with `400 Email address ... is invalid`,
  even though the identical address works fine for `signUp`/`signInWithPassword` and other,
  similarly-dotted addresses at the same domain passed. This is a Supabase-side validation quirk on
  that specific endpoint, not a bug in this task's code — worth knowing if a real user ever reports
  "forgot password says my email is invalid" despite being able to sign in normally.
- **Verification (live, not traced)** — fresh, isolated test accounts, Playwright driving the real
  UI throughout:
  - **Name edit**: changed a name on `/profile`, confirmed the new value persisted (re-queried
    after a fresh page load) and showed correctly in the shared navbar afterward.
  - **Password change**: wrong current password → "Current password is incorrect", change
    rejected (confirmed the password was NOT altered). Correct current password → "Password
    changed successfully", and a direct sign-in call with the new password succeeded.
  - **Forgot-password → reset-password, fully end-to-end**: requested a code from the real
    `/forgot-password` UI ("Check your email" screen confirmed) → retrieved the real OTP via the
    admin-API method described above → submitted a wrong code first and confirmed "Token has
    expired or is invalid" rendered → submitted the real code with a new password → "Password
    updated" screen shown → **signed in with the new password against the real `/sign-in` page and
    confirmed it landed on `/student/dashboard`**, proving the whole chain actually works, not just
    that each API call individually succeeded.
  - **Eye-toggle**: confirmed `type` flips `password → text` (and the icon swaps Eye ↔ EyeOff) on
    every migrated field — sign-in, sign-up, and both profile password fields — via direct
    attribute checks and a visual screenshot showing one field's plaintext value next to two
    still-masked fields.
  - Both light and dark mode screenshotted for `/profile`, `/sign-in`, `/forgot-password`, and
    `/reset-password` (including its wrong-code error state and its success state) — all render
    cleanly, no dark-mode contrast issues.
  - `tsc --noEmit` clean; a full production build was run once mid-task and passed (all new routes
    compiling, including catching a `useSearchParams` missing-Suspense build error on
    `/reset-password`, fixed by wrapping the form in `<Suspense>`) — a second build was
    intentionally skipped at the end of this task to avoid clobbering a dev server the user was
    actively using in the same session. All test accounts deleted afterward.
- Files touched: `app/sign-in/page.tsx`, `app/sign-up/page.tsx`, `components/UserMenu.tsx`,
  `middleware.ts`. New: `components/PasswordInput.tsx`, `components/ProfileForm.tsx`,
  `lib/passwordStrength.ts`, `app/api/profile/route.ts`, `app/profile/page.tsx`,
  `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`.
- Why: password reset previously didn't exist at all — a locked-out user had no self-service path.
  OTP over a magic link keeps the flow inside the app's own UI (no separate email-client context
  switch to click a link) and matches what was explicitly asked for. Re-authenticating before a
  profile password change (rather than trusting the client's own claim that it knows the current
  password) closes the obvious hole where a session left open on a shared device could otherwise
  have its password silently changed by anyone at the keyboard.

## [2026-09-18] — Aptitude Test Mode: timed, teacher-assigned, scored tests
- **Step 1 — schema confirmation (queried before building, not assumed)**: all four tables designed
  earlier for this exist exactly as originally specced — `aptitude_tests` (`negative_marking_fraction`
  confirmed `numeric not null default 0` via a live insert probe; `category` nullable = mixed),
  `aptitude_test_questions` (ordered junction, `position`), `aptitude_assignments` (mirrors the DSA
  `assignments` shape: `test_id`, `class_id`, `assigned_by`, `due_date`), `aptitude_test_attempts`
  (`status`/`answers`/`score`/`total_questions`/`time_taken_seconds`, unique on `(test_id, student_id)`).
  All four were empty (0 rows) — Test Mode had genuinely never been used. The one thing missing was
  `results_released` on `aptitude_tests`, needed to gate the review page the same way Proctored Tests
  does — added via `supabase/migrations/0010_aptitude_results_release.sql`, confirmed and applied.
- **What changed**: the full timed/scored test flow on top of that schema, deliberately *not*
  proctored — no fullscreen lock, no camera/mic, no violation detection; that's what Proctored Tests
  is for, this is a plain timed test.
  - **Authorization**: every class-scoped route uses the existing `getClassAuthorization` helper,
    same as everywhere else in the app — no raw ownership check. Since `aptitude_tests` itself has
    no `class_id` (unlike `proctored_tests` — assignment is a separate `aptitude_assignments` row,
    matching the DSA question-set/assignment model), authorization checks against *every* class a
    test is currently assigned to and passes if the caller is authorized on any of them.
  - **Teacher UI** (`components/AptitudeTestsPanel.tsx`, added to the same class-detail view
    Proctored Tests and `ClassAccessPanel` live in): create a test (name, description, category or
    mixed, time limit, negative marking fraction, optional due date) and pick questions from the
    existing Aptitude bank — manually, or "Pick N random" scoped to a category+topic. Creating and
    assigning happen as one call (`POST /api/aptitude/tests`), since this UI always creates a test in
    the context of one class. Existing tests list with question count/time limit/negative marking/due
    date, each expandable into a **results rollup**: attempt count, average score, a score-distribution
    bar chart (recharts, bucketed), per-student score + status + time taken, and the "Release
    results" / "Unrelease results" toggle.
  - **Student take screen** (`app/student/aptitude/test/[testId]/page.tsx`): combined pre-test info
    (question count, time limit, negative marking, an explicit "no fullscreen lock, no camera, no
    activity monitoring" line) and the take-test UI in one route — unlike Proctored Tests, there's no
    fullscreen/camera permission gesture to arrange for, so no separate `/start` route was needed.
    Server-authoritative timer (identical math to Proctored Tests, extracted into shared
    `lib/testTiming.ts`), answers autosaved on every selection, auto-submit on timeout with whatever
    was answered. Also added to the student Aptitude index page as an "Assigned tests" section
    (`components/AssignedAptitudeTests.tsx`) so students have somewhere to actually find an assigned
    test.
  - **Scoring**: `lib/aptitudeScoring.ts`'s `finalizeAptitudeAttempt` — the only place a score is ever
    computed, mirroring `lib/proctoredScoring.ts`'s pattern exactly but with no violation concept:
    status is derived purely from elapsed time vs. the limit (`in_progress` → `submitted`, or
    `expired` on timeout), never from anything the client claims. Negative marking applied server-side
    only (`correct − wrong × negative_marking_fraction`).
  - **Result + review**: post-submit shows score only, matching the leak-safe pattern confirmed on
    Proctored Tests. The full per-question review stays gated behind `results_released` until the
    teacher flips it — same mechanism, and the same components: `TestResultBanner` and
    `TestReviewView` were *extracted* from the Proctored Tests pages (which now import them too,
    replacing what used to be inline JSX) and reused as-is for Aptitude, rather than reimplementing
    the pattern a second time. The right-side question palette (`QuestionPalette`) was extracted the
    same way and is now shared by both take screens.
- **Verification (live, not traced)** — fresh, isolated owner-teacher/outsider-teacher/student
  accounts, a throwaway class, and two real questions:
  - **Authorization**: the outsider teacher's `POST /api/aptitude/tests` against the class returned
    **404 "Class not found"** (masking existence, same as every other class-scoped route in the app);
    the owning teacher's identical request through the real UI succeeded and the test showed up
    correctly assigned, negative marking and all, alongside the (separately unaffected) Proctored
    Tests panel on the same page.
  - **Negative marking**: answered one question correctly and one incorrectly with
    `negative_marking_fraction = 1` — score came back **0/2** (`+1 − 1×1`). A second attempt with both
    answered correctly came back **2/2**. Confirmed by directly inspecting the saved `answers` jsonb
    against each question's `correct_option`, not just trusting the displayed number.
  - **Score-only until release**: `GET .../review` returned **403 "Results haven't been released
    yet"** before the teacher's toggle, and **200** with full `correct_option`/`selected_option` detail
    immediately after — same test, same attempt, only the flag changed. The result screen itself
    showed only "You scored 0/2", no per-question detail, both before and after (the review page is a
    separate route).
  - **Server-authoritative timer**: with the client's on-screen countdown still showing `29:57`, the
    attempt's `started_at` was rewound 2 hours into the past directly in the database (same method
    used for Proctored Tests — manipulating what the server actually trusts, since server and browser
    share a machine in local dev). The server's next check independently computed
    `remaining_seconds: 0` and closed the attempt out as `expired` with a real computed score; reloading
    the take page showed the correctly-scored "already completed" state rather than stale in-progress
    content — the client's own displayed value never factored into the decision.
  - **Both themes**: pre-test screen, live take screen, result screen, student review, and the
    teacher results rollup (including the score-distribution chart) all screenshotted in light and
    dark — all render cleanly, chart colors and contrast hold up in both.
  - A production build was run once mid-task (all new routes compiling); a second build at the end
    was intentionally skipped to avoid clobbering a dev server the user had open in the same session —
    `tsc --noEmit` confirmed clean instead. All test accounts, class, and questions deleted afterward.
- Files touched: `lib/proctoredScoring.ts` (now re-exports `remainingSeconds` from the new shared
  module instead of defining it locally), `lib/supabase/schema.sql`, `types/index.ts`,
  `app/teacher/dashboard/page.tsx`, `app/student/aptitude/page.tsx`,
  `app/student/proctored-tests/[testId]/result/page.tsx`,
  `app/student/proctored-tests/[testId]/review/page.tsx`,
  `app/student/proctored-tests/[testId]/take/page.tsx` (last three refactored to use the newly
  shared components, not just added to). New: `supabase/migrations/0010_aptitude_results_release.sql`,
  `lib/testTiming.ts`, `lib/aptitudeScoring.ts`, `components/QuestionPalette.tsx`,
  `components/TestReviewView.tsx`, `components/TestResultBanner.tsx`,
  `components/AptitudeTestsPanel.tsx`, `components/AssignedAptitudeTests.tsx`,
  `app/api/aptitude/tests/route.ts`, `app/api/aptitude/tests/[id]/route.ts`,
  `app/api/aptitude/tests/[id]/attempts/route.ts`,
  `app/api/aptitude/tests/[id]/attempts/[attemptId]/route.ts`,
  `app/api/aptitude/tests/[id]/attempts/[attemptId]/submit/route.ts`,
  `app/api/aptitude/tests/[id]/review/route.ts`, `app/api/student/aptitude/tests/route.ts`,
  `app/student/aptitude/test/[testId]/page.tsx`,
  `app/student/aptitude/test/[testId]/result/page.tsx`,
  `app/student/aptitude/test/[testId]/review/page.tsx`.
- Why: this was designed alongside Aptitude practice mode from the start and then deferred —
  building it now, on the same review-release pattern Proctored Tests already established and
  proved out, meant most of the hard design decisions (server-only scoring, score-only result
  screens, a teacher-controlled release gate) were already made and just needed a second, honest
  application rather than being re-argued from scratch. Extracting the shared components instead of
  copy-pasting them means the two test modes can't quietly drift apart on how a review page or a
  result banner behaves.

## [2026-09-18] — "Download Report" Excel exports: Proctored, Aptitude, and DSA
- **Library substitution, disclosed up front**: the task specified `chartjs-node-canvas`, which
  hard-depends on the `canvas` npm package requiring native compilation. This sandbox has no full
  Visual Studio + Windows SDK (only partial build tools) and the prebuilt-binary download timed
  out (network-restricted), so `canvas` cannot install here at all — confirmed by trying directly,
  not assumed. Substituted `@napi-rs/canvas` (ships a prebuilt native binary, installed cleanly) +
  `chart.js` directly, replicating exactly what `chartjs-node-canvas` does internally. Verified with
  a standalone test render before building anything on top of it — same Chart.js rendering, same
  visual output, just a different (actually installable) canvas backend. User confirmed this
  substitution before proceeding.
- **Chart image, not a live Excel chart**: every pie chart is a rendered PNG embedded at the top of
  its sheet, not an editable native Excel chart object — true native charts need paid tooling
  (SheetJS Pro). An image is the standard, practical approach for a plain-JS stack and is what's
  built here; noted explicitly since it's a real capability difference (no click-to-edit chart in
  Excel) from what "add a chart" might otherwise imply.
- **What changed**: a "Download Report" button generating a real `.xlsx` file, in three places.
  - **`lib/reports.ts`** (shared, so the three endpoints don't triplicate this): `requireReportAccess`
    (the same `getClassAuthorization`/`isAuthorized` pattern used everywhere else in the app, checked
    against every class a test/assignment could be scoped to), `renderPieChartPng` (the
    `@napi-rs/canvas` + `chart.js` renderer described above), `newReportWorkbook`/`styleHeaderRow`/
    `addChartSheet` (ExcelJS workbook + styling helpers, including a fix for a real bug: assigning
    `.columns` with a `header` property on a chart sheet auto-writes row 1, which collides with the
    image anchored there — the header row on a chart sheet is now written manually a fixed number of
    rows below the image instead), `safeFilenamePart`/`excelResponse` (filename sanitizing +
    `Content-Disposition` response headers), and the hardcoded `PASS_THRESHOLD_FRACTION = 0.5` (score
    >= 50% of total questions counts as a pass — not currently configurable per test, flagged as the
    one place to change it if that's ever needed). Also brand-matched the chart colors to this app's
    actual tokens (`--success` is gold, not green; `--warn` is a flux orange-red, not literal red).
  - **Proctored Tests** — `GET /api/proctored-tests/[id]/report`: Summary (pass/fail pie + a table of
    student/score/total/violation count/status/time taken), Detailed Answers (one row per student per
    question: prompt, selected option, correct option, correct/incorrect, points applied accounting
    for negative marking), Violations (one row per logged violation: student, type, timestamp).
    Button added to `components/ProctoredTestsPanel.tsx`'s existing "Release results" header row.
    Filename: `{class_name}_{test_name}_proctored_report.xlsx`.
  - **Aptitude Test Mode** — `GET /api/aptitude/tests/[id]/report?classId=xxx`: same Summary +
    Detailed Answers shape, no Violations sheet (not proctored). Since one aptitude test can in
    principle be assigned to more than one class, `classId` disambiguates which assignment the report
    is for, and attempts are filtered strictly to that class's members even if the test happens to be
    assigned elsewhere too. Button added to `components/AptitudeTestsPanel.tsx` next to its release
    toggle. Filename: `{class_name}_{test_name}_aptitude_report.xlsx`.
  - **DSA completion** — there was no existing "per-class assignment rollup view" to add a button
    to (confirmed by searching, not assumed — `app/teacher/assign` is only the assignment-creation
    form, and `progress` has no `assignment_id` tying a completion row back to a specific assignment).
    Built one: `components/DsaAssignmentsPanel.tsx`, added to the same class-detail page Proctored
    Tests and Aptitude Tests already live on, listing this class's assignments and expanding into a
    per-student completion table (completed/attempted/not-started counts, %) via a new
    `GET /api/assign/[id]/rollup` route, plus a `GET /api/assign?classId=` list route. Report
    (`GET /api/assign/[id]/report`): Summary (completion-status pie across the whole class + the
    per-student table), Detailed Status (one row per student per question: title, platform link,
    status). No pass/fail here — DSA has no correct/wrong, just a completion checkbox. Filename:
    `{class_name}_{question_set_name}_dsa_report.xlsx`.
  - **Build fix**: `@napi-rs/canvas` ships a native `.node` binary; webpack tried to parse it as
    JavaScript and the whole app 500'd on first request after adding the dependency. Fixed by adding
    it to `next.config.js`'s `experimental.serverComponentsExternalPackages`, which tells Next.js to
    leave that package unbundled or the native file simply won't load.
- **Verification (live, not traced)** — a fresh class with two students, an owner teacher, an
  outsider teacher, and real (deliberately lopsided) data: Student Alpha answered every proctored
  question correctly and 2/3 aptitude questions correctly with 2/3 DSA questions completed; Student
  Beta answered every proctored and aptitude question wrong (with 3 logged violations) and had only
  1/3 DSA questions completed:
  - **All three reports downloaded successfully** (200, correct `Content-Type`, correct
    `Content-Disposition` filename matching the specified pattern exactly) as the owning teacher; the
    **outsider teacher got 403 "Forbidden" on all three**, not a report.
  - **Every number in every sheet was spot-checked against the database and matched exactly**, not
    just eyeballed: Proctored Summary showed Alpha `4/4, 0 violations, submitted` and Beta
    `-2/4, 3 violations, auto_submitted_violation` — Beta's score verified by hand (`4 wrong ×
    -0.5 negative marking = -2`, matching `negative_marking_fraction = 0.5`, matching the Detailed
    Answers sheet's per-question `-0.5` points on every row). Aptitude Summary showed Alpha `1/3
    submitted` and Beta `-3/3 expired` — Beta's `-3` verified as `3 wrong × -1` against
    `negative_marking_fraction = 1`. DSA Summary showed Alpha `2 completed/1 attempted/0 not
    started/67%` and Beta `1/0/2/33%`, matching the seeded `progress` rows exactly (including that
    two of Beta's questions correctly defaulted to "not started" from having no `progress` row at
    all, not a stored value). The Violations sheet listed exactly the 3 rows seeded for Beta with the
    right type labels.
  - **Pie chart images inspected directly** (extracted the embedded PNGs from each `.xlsx`'s zip
    archive, not just trusted that `addImage` ran without erroring): Proctored showed an exact 50/50
    gold/orange split (1 pass, 1 fail, matching 2 finished attempts); Aptitude showed ~100% "Fail"
    (both students scored below the 50% threshold — the thin white seam at 0% "Pass" is Chart.js's
    slice-border rendering at a zero-value boundary, not a data error); DSA showed gold ~50%
    (3 completed), orange ~17% (1 attempted), blue-gray ~33% (2 not started) — all matching the
    6-cell (2 students × 3 questions) matrix exactly.
  - **Buttons confirmed in the actual rendered UI**, not just via direct API calls: all three
    "Download Report" buttons screenshotted next to their respective "Release results" toggles (DSA's
    panel has no toggle, so its button stands alone next to "Per-student completion for this
    assignment"), in both light and dark mode, all three panels coexisting correctly on the same
    class page.
  - A dev server crash caused by the webpack/native-binary issue above was hit and fixed mid-task
    (confirmed via the actual browser response body, not guessed); `tsc --noEmit` clean throughout.
    All test accounts, class, questions, and generated files deleted afterward.
- Files touched: `app/api/assign/route.ts` (added GET list), `app/teacher/dashboard/page.tsx`,
  `components/AptitudeTestsPanel.tsx`, `components/ProctoredTestsPanel.tsx`, `next.config.js`,
  `package.json`. New: `lib/reports.ts`, `components/DsaAssignmentsPanel.tsx`,
  `app/api/proctored-tests/[id]/report/route.ts`, `app/api/aptitude/tests/[id]/report/route.ts`,
  `app/api/assign/[id]/rollup/route.ts`, `app/api/assign/[id]/report/route.ts`.
- Why: a class-scoped report only earns trust if its numbers are provably right, not just
  plausible-looking — every sheet here is computed directly from the same tables the app itself
  scores against (never a second, parallel calculation that could drift), and the verification pass
  deliberately checked the underlying database, not just "did a file download."

## [2026-09-19] — DSA question filters, proctored question images, admin delete-user
- **Step 1 — DSA question filters**: server-side `platform`/`difficulty` query params on
  `GET /api/questions` (combine with AND), used everywhere questions are picked —
  `app/teacher/questions/page.tsx` and both pickers on `app/teacher/question-sets/page.tsx`
  (the "create set" checklist and the "add existing question" dropdown share one filtered fetch).
  Platform buckets as **LeetCode / HackerRank / CodeChef individually, everything else (Codeforces,
  GeeksforGeeks, and the catch-all "other") folded into "Others"** — the enum only has 6 values and
  three are already low-volume, so a 4th bucket reads cleaner than 6 near-empty ones (this was a
  judgment call, noted as asked). Difficulty filter offers Easy/Intermediate/Hard — the stored enum
  value stays `'medium'`, only the label changed (`lib/difficulty.ts`'s `DIFFICULTY_LABELS`); rows
  with `'unknown'` difficulty aren't a filter option and just show up whenever no difficulty filter
  is set.
- **Step 2 — proctored question images**: `proctored_questions.image_url` (nullable, optional —
  most questions won't have one). **Storage bucket creation was fully scriptable** —
  `supabase.storage.createBucket()` via the service-role client worked directly, no manual
  Dashboard step needed (confirmed by actually running it, not assumed). No `storage.objects` RLS
  policy was added for writes: the upload goes through a server API route
  (`POST /api/proctored-questions/upload-image`) using the service-role client, which bypasses RLS
  by design — Storage's default-deny RLS already blocks any direct client-side upload attempt with
  zero policies needed, and public READ works independently via the bucket's own `public: true`
  flag. "Add Image" button added to the create/edit form (upload + live preview + remove); the
  image now renders directly above the prompt in all three places a proctored question's prompt is
  shown: the teacher's question bank list, the student take-screen, and the shared
  `TestReviewView` component (used by the post-release review page — there's no separate
  "teacher review" screen in this app beyond the aggregate `ProctoredTestsPanel` results view, so
  these are the three actual rendering surfaces that exist).
- **Step 3 — admin delete-user**: a "Delete" action per row on `/admin/users`, gated behind a
  confirmation dialog showing real blast-radius counts (classes owned, students enrolled in those
  classes, questions authored across all four banks) fetched fresh from the database, and requiring
  the target's exact email to be typed before the button enables. Safeguards: can't target the
  caller's own account (same `id === admin.id` guard pattern as the earlier role-change fix), can't
  delete the last remaining admin (see finding below), and the deletion itself writes a
  `user_deletion_log` row (denormalized snapshot — name/email/role/counts — deliberately with no FK
  to the deleted user's own id, since that row must survive their deletion) BEFORE calling an
  atomic `admin_delete_user_cascade` Postgres function that deletes their authored content across
  the four `created_by`-based tables, then their `users` row (which cascades correctly to
  everything else via FKs that already existed), then finally their Supabase Auth account.
  - **FK-strategy decision (as requested, documented here for future reference)**: rather than
    changing the four `created_by ... on delete set null` FKs (questions/aptitude_questions/
    interview_questions/proctored_questions) to CASCADE — which would change deletion behavior for
    *every* future path that removes a user, not just this admin flow — the cascade is handled
    explicitly inside one atomic Postgres function that deletes each table's rows for that user
    first, then deletes the `users` row. Every other FK to `users(id)` already cascaded correctly
    on its own (`classes.teacher_id`, `class_members.student_id`, `progress.student_id`, test
    attempts, etc. — confirmed via a full schema inventory before writing anything), so this was
    the only gap. This keeps the SET NULL safety net intact for any other deletion path (e.g. if a
    user is ever removed some other way) and scopes the destructive cascade to only this explicit,
    confirmed, audit-logged action.
  - **Real bug found during verification**: the "last remaining admin" count-check is
    **unreachable dead code** under the current access model. The route requires the caller to
    already be an admin (`requireRole(["admin"])`), and the self-delete guard immediately above it
    already rejects `target.id === admin.id` — so any request that reaches the count-check
    necessarily involves two *distinct* admin accounts (caller + target), meaning the counted total
    can never be `<= 1` in practice (the caller alone proves a second admin exists). The system is
    still fully protected from ever reaching zero admins — that guarantee just comes entirely from
    the self-delete guard, not the count-check. Confirmed live: attempting to delete a distinct
    admin while 2+ existed succeeded correctly; genuinely reaching a 1-admin state and testing the
    block required temporarily (and reversibly, with the user's explicit permission) flipping the
    real admin account's role in the database for the duration of one API call, then restoring it
    immediately — restore confirmed. Left the check in as explicit defense-in-depth (a code
    comment now explains why it's currently unreachable, in case the self-delete guard is ever
    loosened or this logic gets reused from a different context) rather than removing it.
- **Verification (live, not traced)**:
  - **Filters**: every combination checked — `leetcode` (5), `hackerrank` (2), `codechef` (1),
    `others` (449), `easy` (7), `hard` (2), and the combined-AND cases `leetcode`+`hard` (1) and
    `others`+`easy` (1) — **every API count matched a direct database count exactly**, including
    the 457-row unfiltered baseline.
  - **Images**: uploaded a real (non-trivial, visibly-labeled) test image through the actual edit
    form; confirmed it renders correctly above the prompt in the question bank list, the live
    take-test screen, and the release-gated review page — all three, in both light and dark mode.
  - **Delete**: created a disposable teacher owning a class (with a student enrolled), an authored
    DSA question (with a student `progress` row against it), and an authored proctored question
    wired into a real test with a real student attempt. Deleted the teacher through the actual
    `/admin/users` UI (blast-radius dialog → typed-email confirmation → delete). Directly queried
    the database before and after: **the class, the enrollment, the DSA question, the student's
    progress row, the proctored question, the proctored test, and the student's attempt were all
    confirmed gone** (0 rows each); the teacher's `users` row and Supabase Auth account were both
    confirmed gone; the enrolled student's own account was confirmed **still present** (only the
    teacher was deleted). The `user_deletion_log` row's captured counts (1 class, 1 student
    enrolled, 1 DSA question, 1 proctored question, 0 aptitude/interview) matched the seeded data
    exactly, and `deleted_by` correctly recorded the acting admin's id. Self-delete was confirmed
    blocked (button disabled on the admin's own row). Typing the wrong email kept the delete button
    disabled; typing the correct one enabled it.
  - `tsc --noEmit` clean throughout; a production build hit an unrelated environment limitation
    (no network access to fetch Google Fonts at build time in this sandbox) rather than a code
    issue, so live dev-server testing was used for verification instead. All test accounts, classes,
    questions, uploaded images, and test `user_deletion_log` rows removed afterward.
- Files touched: `app/api/questions/route.ts`, `app/teacher/questions/page.tsx`,
  `app/teacher/question-sets/page.tsx`, `app/api/proctored-questions/route.ts`,
  `app/teacher/proctored-questions/page.tsx`, `components/TestReviewView.tsx`,
  `app/api/proctored-tests/[id]/review/route.ts`, `app/api/proctored-tests/[id]/attempts/route.ts`,
  `app/student/proctored-tests/[testId]/take/page.tsx`, `app/admin/users/page.tsx`,
  `app/api/admin/users/route.ts`, `types/index.ts`, `lib/supabase/schema.sql`. New:
  `lib/difficulty.ts`, `app/api/proctored-questions/upload-image/route.ts`,
  `app/api/admin/users/[id]/route.ts`, `app/api/admin/users/[id]/blast-radius/route.ts`,
  `supabase/migrations/0011_images_and_user_deletion.sql`.
- Why: server-side filtering (not client-side trimming of an already-fetched list) is what actually
  scales as the question bank grows past what fits on one page. Question images give teachers a way
  to ask about diagrams/code snippets that plain text can't express. The delete-user flow's real
  design pressure was making an irreversible, wide-blast-radius action require *proof the caller
  understands what they're about to destroy* (real counts, typed confirmation) rather than a single
  click — and treating the audit log as the one thing that must survive the destruction it's
  recording, which is why it's written before anything else happens and deliberately carries no FK
  back to the account it's describing.

## [2026-09-19] — Proctored question bank: Subject -> Set structure, bulk paste importer, export
- **Step 1 — schema**: `proctored_subjects` and `proctored_sets` (subject_id FK, cascade), plus a
  nullable `set_id` FK on `proctored_questions` and a `needs_categorization` boolean flag — same
  pattern as DSA's `needs_link_curation` (a CHECK constraint ties the flag to the nullable field so
  the two states can't drift apart). Existing questions predate the structure, so the migration
  backfills `needs_categorization = true` for all of them rather than forcing an assignment.
  Deleting a Set cascades `set_id -> NULL` on its questions via the FK, which would violate that
  CHECK constraint unless the flag flips first — a `before delete` trigger on `proctored_sets`
  handles this (flags the set's questions before the cascade runs), also covering a Subject delete
  since that cascades through its Sets. This is bank organization only — the test-creation flow
  (picking subjects/sets into sections) is a separate follow-up, per the task's scope.
- **Step 2/3 — Subject/Set management + question bank update**: integrated into the existing
  `app/teacher/proctored-questions/page.tsx` rather than a separate route (my call, noted per
  instruction) — a collapsible `SubjectSetManager` section above the question form handles CRUD for
  both levels (any teacher/admin, shared bank, not class-scoped — same spirit as DSA/Aptitude). The
  question create/edit form now has a required cascading Subject -> Set picker; the list view
  filters by Subject/Set and has a "Needs categorization only" toggle with a warn-colored badge, so
  legacy questions are surfaced rather than lost in the bank.
- **Step 4 — Bulk Add from Paste**: `lib/proctoredBulkParse.ts`, a pure client-side parser (nothing
  is sent anywhere until the review screen is confirmed). Question boundaries ("Q1.", "1)", "1.")
  and options ("A)"/"a."/"1)"-"4)") share numbering shapes, which makes a bare "N)" line ambiguous —
  resolved with two running counters (expected next option number vs. expected next question
  number, option-match checked first) rather than any lookahead/backtracking. A plain-prose line
  encountered after a block's options have already started closes that block on the spot instead of
  merging into the previous option's text, so malformed input becomes its own flagged block ("no
  options detected") rather than corrupting a real question — see verification below for a caught
  regression where the first version of this heuristic did exactly that. `BulkImportPanel.tsx` is
  the review screen: every parsed question is individually editable (prompt/options/correct
  answer), with a bulk Subject/Set target plus a per-question override checkbox, a live "X ready to
  import" count, and nothing reaches the DB until "Confirm and add" — `POST
  /api/proctored-questions/bulk-import` re-validates every row server-side and inserts all-or-nothing.
- **Step 5 — export**: `GET /api/proctored-questions/export?setId=`or `?subjectId=` reuses
  `lib/reports.ts`'s `newReportWorkbook`/`styleHeaderRow`/`excelResponse` helpers (same ones the
  earlier results-report feature uses) — one sheet, dynamic `Option A..N` columns sized to the
  widest question in the export, a `Correct option` column with the actual answer text (not just an
  index), explanation, difficulty, and the Subject/Set it belongs to. "Download"/"Export" buttons on
  both the Subject row and each Set row in `SubjectSetManager`.
- **Verification**: no browser-automation tool is available in this environment, so the UI itself
  wasn't clicked through — instead verified the two riskiest layers directly. **DB layer**: a script
  using the same `supabaseAdmin` client the API routes use confirmed all 20 pre-existing questions
  came back `needs_categorization = true` with `set_id = null`; created a real Subject with two
  Sets; inserted a categorized question; confirmed the CHECK constraint rejects
  `set_id = null, needs_categorization = false`; deleted a Set and confirmed the trigger correctly
  flipped its question back to `needs_categorization = true, set_id = null` instead of erroring.
  **Parser**: ran a realistic mixed-format paste (see below) through `parseBulkQuestions` directly.
  **Export**: built a workbook through the export route's exact column/row logic with sample data
  and read it back with exceljs — confirmed `Correct option` held the actual answer text ("Paris",
  not an index) and short rows were correctly blank-padded next to a 4-option row. All scratch test
  data/files removed afterward. `tsc --noEmit` and `next build` both clean.
  - **Parser test paste** (4 questions, mixed "A)" and "1)" styles, one intentionally malformed
    paragraph dropped in the middle):
    ```
    Q1. What is the time complexity of binary search...?  A)-D) options, "Answer: B"
    2) Which data structure uses FIFO order?               1)-4) options, "Ans: 2"
    Q3. What does CPU stand for?                           a.-d. options, "Answer: b"
    [a rambling unrelated paragraph, no markers at all]
    4) Which of these is NOT a JS primitive type?           A)-D) options, "*C) array" inline marker
    ```
    **Result**: all 4 real questions parsed correctly — prompt, all options, and the correct
    answer index all matched (including the inline `*` marker on option C of Q4, and both the
    letter- and number-style answer lines). The rambling paragraph was correctly split into its own
    block and flagged (`"Only 0 options detected — need at least 2."`) rather than being silently
    absorbed into Q3's last option, which is what an earlier version of the heuristic actually did
    (caught by this test, not assumed correct) before the block-splitting logic was reworked to
    close a block as soon as stray prose follows its options.
- Files touched: `types/index.ts`, `app/teacher/proctored-questions/page.tsx`,
  `app/api/proctored-questions/route.ts`, `lib/supabase/schema.sql`. New:
  `supabase/migrations/0012_proctored_subject_sets.sql`, `app/api/proctored-subjects/route.ts`,
  `app/api/proctored-sets/route.ts`, `app/api/proctored-questions/bulk-import/route.ts`,
  `app/api/proctored-questions/export/route.ts`, `lib/proctoredBulkParse.ts`,
  `components/proctored-bank/SubjectSetManager.tsx`, `components/proctored-bank/BulkImportPanel.tsx`.
- Why: the flat proctored question bank had no way to organize or bulk-populate questions, making
  it impractical to build out real content at volume ahead of the (separate, future) test-creation
  flow that will pick from Subjects/Sets. The paste-and-parse importer exists because teachers
  already have MCQs in whatever format their source material used, not this app's schema — forcing
  the review screen and blocking DB writes until explicit confirmation was a hard requirement
  precisely because the parsing heuristic is fallible by nature (proven true during this task's own
  verification pass).

## [2026-09-19] — Proctored Tests: multi-section restructuring (Subject/Set-driven sections, per-section timer/negative marking)
- **Step 1 — schema**: `proctored_test_sections` (test_id, name, subject_id nullable, position,
  time_limit_minutes nullable = "uses the combined timer", negative_marking_fraction nullable =
  "inherit the test-level value", calculator_enabled) and `proctored_test_section_sets`
  (section_id, set_id — which Sets are enabled for a section). `proctored_tests` gained
  `timer_mode` ('combined'/'per_section') and `allow_free_section_navigation`.
  `proctored_section_attempts` (attempt_id, section_id, started_at, submitted_at, status
  'not_started'/'in_progress'/'completed') makes per-section timers/locking enforceable
  server-side — a separate follow-up task builds the actual take-screen UI against it.
  **Design decision, confirmed with the user before writing code**: a section's questions are
  resolved **dynamically** from its enabled Sets (matches "all questions from each enabled Set are
  included" literally, always reflects the Set's current contents) rather than snapshotted into
  `proctored_test_questions` at creation time — so new tests never write question-level rows at
  all, only `proctored_test_section_sets`. `proctored_test_questions` is kept, but only as the
  **legacy path**: migration 0013 wraps every existing test's real question rows in one
  auto-created default section (`subject_id = null`, since legacy questions predate Subject/Set
  and may span several subjects or none — see 0012's `needs_categorization`) and backfills a new
  `section_id` column on `proctored_test_questions` to point at it, moving its unique constraint
  from `(test_id, position)` to `(section_id, position)`. A shared resolver
  (`lib/proctoredSections.ts`) merges both paths into one ordered list wherever the app needs
  questions (scoring, attempt-start, review, the Excel report), so neither path needs special-casing
  outside that one module. Deleting a set/subject mid-flight doesn't corrupt a section silently —
  `proctored_test_section_sets` rows cascade-delete with the Set (`on delete cascade`), so a
  section just resolves to fewer questions, same as any other Set edit.
- **Step 2 — multi-section creation UI**: `components/ProctoredTestsPanel.tsx`'s create-test form
  replaces the old flat "check questions from the whole bank" picker entirely with a section
  builder — "+ Add section" (name, Subject picker → that subject's Sets appear as toggle chips,
  optional per-section time limit/negative-marking override, calculator toggle), reorder via
  up/down buttons (no drag-and-drop library — matches this codebase's "don't add a new library
  without checking the stack first" convention), and a live "`N` questions total" count computed
  client-side from the already-fetched Subject/Set `question_count`s as Sets are toggled (no extra
  round trip). Test-level: `timer_mode` radio (Combined/Per-section) and
  `allow_free_section_navigation` toggle sit above the overall time limit, which is now labeled as
  a fallback when per-section timing is chosen (the column stays required — a per-section test
  still needs *some* value there today, since Prompt 25's take-screen work is what will actually
  stop reading it for timing in that mode).
- **Step 3 — scoring**: `lib/proctoredScoring.ts`'s `finalizeAttempt` now sums score across every
  section, using each section's `negative_marking_fraction` override when set, else the
  test-level value — verified end-to-end (see below) with a 2-section attempt where one section
  inherits and the other overrides, confirming both fractions were actually applied where expected
  rather than one leaking into the other. `getClassAuthorization` still governs the whole test;
  no other authorization changes, per the task's scope.
- **Step 4 — section-aware attempt API**: starting an attempt now creates a
  `proctored_section_attempts` row for **every** section up front (status `not_started`), not just
  the first one — chosen over "only the first section, create more as the student reaches them"
  because it's one consistent code path regardless of `timer_mode`/navigation mode, rather than two
  different creation strategies to keep in sync (noted here since the task left this as an open
  call). New `PATCH /api/proctored-tests/[id]/attempts/[attemptId]/sections/[sectionId]`
  (`{action: "enter"|"submit"}`) moves a section between `not_started` → `in_progress` →
  `completed`; under locked navigation (`allow_free_section_navigation = false`) it rejects
  entering a section before every earlier-position section is `completed`, enforced server-side (a
  direct API call can't skip the lock even without the future UI). `GET`/`POST
  /api/proctored-tests/[id]/attempts` now also return `sections` and `section_attempts` alongside
  the existing flat `questions` array (unchanged shape, each question now additionally tagged
  `section_id`/`section_name` so today's flat take screen keeps working untouched while a future
  section-aware UI has what it needs without another round trip). This task intentionally stops at
  the API/data layer — the take-screen UI itself (palette, timer display, lock enforcement) is a
  separate follow-up (Prompt 25).
- **Verification (real data, not traced)**:
  - **Migration**: all 5 existing `proctored_tests` rows now have exactly 1 section each,
    `timer_mode='combined'`. **"Mock Placement Drive 1"** (found to have 0 questions during this
    task's research, i.e. an orphaned/empty test) still got its section correctly — `subject_id:
    null`, 0 questions, no error. Both **"Technical Test-1"** rows (different classes, same name,
    20 questions each) kept their exact original `position` ordering under the new `section_id`
    column — sampled the first 3 positions of each directly from the DB and confirmed the
    `question_id`s and order matched what existed before the migration.
  - **Legacy scoring still works**: fetched a legacy test's questions via the new
    `section_id`-scoped join (the same query path `finalizeAttempt` now uses) and confirmed
    `correct_option` resolved correctly for real sampled rows.
  - **New 2-section test, real stored structure** (Quantitative → Subject A, Technical → Subject
    B, `timer_mode='per_section'`, `allow_free_section_navigation=false`, Technical overrides
    negative marking to 0.5 while Quantitative inherits):
    ```json
    "sections": [
      { "name": "Quantitative", "subject_id": "8b40f331-…", "position": 0,
        "time_limit_minutes": 20, "negative_marking_fraction": null, "calculator_enabled": true },
      { "name": "Technical", "subject_id": "20df521a-…", "position": 1,
        "time_limit_minutes": 40, "negative_marking_fraction": 0.5, "calculator_enabled": false }
    ]
    ```
    Each section correctly resolved (dynamically, via `proctored_test_section_sets` → each
    question's `set_id`) to exactly its own Subject's question — no cross-contamination between
    sections built on different Subjects.
  - **Scoring, end-to-end, real `finalizeAttempt` call**: built a 2-section attempt by hand
    (Quant: 1 correct + 1 wrong, no override → inherits the test's 0.25; Technical: 1 wrong + 1
    unanswered, override 0.5) and called the actual scoring function. Expected
    `(1 - 0.25) + (0 - 0.5) = 0.25` across 4 total questions — **got exactly `{ score: 0.25,
    total_questions: 4 }`**, confirming the per-section override is applied to the section it
    belongs to and nowhere else. All scratch test data (subjects/sets/questions/tests/attempts)
    removed afterward; `tsc --noEmit` and `next build` both clean throughout.
- Files touched: `types/index.ts`, `lib/proctoredScoring.ts`, `lib/supabase/schema.sql`,
  `components/ProctoredTestsPanel.tsx`, `app/api/proctored-tests/route.ts`,
  `app/api/proctored-tests/[id]/route.ts`, `app/api/proctored-tests/[id]/attempts/route.ts`,
  `app/api/proctored-tests/[id]/review/route.ts`, `app/api/proctored-tests/[id]/report/route.ts`.
  New: `supabase/migrations/0013_proctored_test_sections.sql`, `lib/proctoredSections.ts`,
  `app/api/proctored-tests/[id]/attempts/[attemptId]/sections/[sectionId]/route.ts`.
- Why: a real placement-drive-style test (e.g. TCS) is never one flat question list — it's
  distinct timed sections pulling from different subject areas, sometimes with different
  penalty rules per section. The dynamic-from-Sets design (confirmed with the user rather than
  assumed) keeps the question bank as the single source of truth for a section's content instead
  of letting a snapshot silently drift from the Set a teacher keeps curating. Wrapping every
  existing test in a default section — rather than requiring a manual re-categorization pass —
  was the only way to satisfy "existing single-section tests must keep working after migration"
  without asking anyone to touch already-working data.

## [2026-09-19] — Proctored take-screen overhaul: 6-state palette, NEET-style sections, per-section timer/lock, calculator
- **Step 1 — per-question state**: `proctored_test_attempts.question_status` (new jsonb column,
  migration `0014`) persists `{visited, marked_for_review}` per question — `answered` stays
  derived (`answers[question_id] !== undefined`), matching how `answers` itself already works, so
  the palette survives a resync/resume/violation-auto-submit exactly like answers do. The 6 palette
  states are a pure function of these three booleans plus "is this the on-screen question" —
  `questionPaletteState()` in `components/proctored-take/SectionQuestionPalette.tsx`, unit-tested
  directly (not traced) against all 6 combinations, see verification below.
  **Colors adapted to the token system, not hardcoded**: blue(current)->`accent`,
  green(answered)->`success`, red(not answered)->`warn` (already a red/orange-red in this app's
  palette), gray(not visited)->the existing neutral `surface-2`/`line`/`fg-subtle` tokens, and two
  *new* tokens added to `app/globals.css` (light+dark) and `tailwind.config.ts` following the exact
  `DEFAULT`/`-2` pattern every other semantic color already uses: `--review` (purple, "marked for
  review") and `--review-2` (deeper indigo, "answered & marked for review") — this app had no
  purple/violet precedent anywhere, so these are genuinely new, not a reuse.
  **Deliberately forked, not extended, `components/QuestionPalette.tsx`**: that component is
  shared with Aptitude Test Mode, where red currently means "not visited" — flipping red to mean
  "not answered" (this task's spec) inside the same component would have silently changed
  Aptitude's meaning too. `SectionQuestionPalette` is a new component instead, grouped by section
  with its own legend.
- **Step 2 — answer controls**: the take screen now holds a question's selection as a *local
  draft* (a radio pick is provisional, not autosaved on click) — persistence happens only via the
  three buttons, matching the reference flow and this task's literal spec ("Save & Next: saves the
  selected option..."). `PATCH .../attempts/[attemptId]` extended to accept
  `selected_option: number | null` (`null` clears the answer — Clear Response) and
  `visited`/`marked_for_review` booleans that merge into `question_status`, alongside the answer in
  the same request. **Design call**: "Mark for Review & Next" also persists whatever option is
  currently drafted (not just "keeps whatever answered state already exists" as literally read) —
  otherwise the 6th palette state (answered + marked) would be unreachable through the natural
  single-click flow a student would actually use; this matches how the real NEET software behaves
  too. Plain navigation (Previous/palette jump/landing on a question) still silently pings
  `visited: true` without touching the answer, independent of the three buttons.
- **Step 3 — section tabs + timer**: a NEET-style tab row above the question card, each tab
  showing the section's name and live question count. Header timer now branches on `timer_mode`:
  combined mode is the unchanged single whole-attempt countdown; per-section mode shows the
  *current* section's countdown, computed the same server-authoritative way as before
  (`proctored_section_attempts.started_at` + that section's `time_limit_minutes`, via the existing
  `lib/testTiming.ts` — confirmed pure enough to import client-side, no server-only code in it).
  **A section's clock only starts on first entry, not at attempt start** — matches
  `started_at`'s existing "set when the student first enters this section" semantics from the
  prior task, so switching directly to section 2 under free navigation gives it a full fresh
  timer rather than one that's been silently running in the background. On expiry: the expired
  section is submitted (`completed`) and the screen auto-advances to the next incomplete section
  (or finalizes the whole attempt if that was the last one) — never just freezes.
- **Step 4 — section lock**: under `allow_free_section_navigation = false`, clicking another tab
  is blocked client-side (a toast explains why) and the only way forward is "Submit Section &
  Continue", which calls the prior task's `PATCH .../sections/[sectionId] {action:"submit"}` then
  auto-enters the next incomplete section. **A completed section can never be re-entered, in
  either navigation mode** — enforced by the `sections/[sectionId]` endpoint itself (unchanged
  from the prior task, it already rejected `action:"enter"` on a `completed` section), not just by
  the new UI, so a direct API call can't bypass it either — confirmed directly, see verification.
- **Step 5 — calculator**: `components/proctored-take/BasicCalculator.tsx`, a toggleable floating
  panel (+ − × ÷, decimal, clear) shown only when the *current* section's `calculator_enabled` is
  true — hidden entirely, not just disabled, for sections without it. Deliberately no
  `eval()`/`Function()` — a small running-total state machine instead, so it can't execute
  arbitrary input as code.
- **Step 6 — rules screen**: `GET /api/proctored-tests/[id]` now also returns a student-facing
  `sections` summary (`ProctoredTestSectionSummary`) with *resolved* values — the actual negative
  marking number that applies (section override or the inherited test-level value, already
  resolved server-side), not "inherited". The rules screen states a rule once if every section
  shares it (e.g. "-0.25 per wrong answer, in every section") and breaks it out per-section only
  where they actually differ — a judgment call per the task's own "use judgment" instruction.
- **Verification — real evidence, API/logic-level (no browser tool available here; the user is
  separately doing the in-browser click-through in both themes)**: built a real 2-section test
  (`per_section` timer, locked navigation) against the live Supabase project and exercised the
  exact server-side operations each control performs.
  - **Palette states — all 6, via the actual `questionPaletteState()` function, not reimplemented
    for the test**: not-visited -> visiting (not-answered) -> Save&Next (answered) -> Clear
    Response (back to not-answered) -> Mark for Review with no answer (marked) -> answer + Mark for
    Review (answered-marked) -> the on-screen question (current, overriding all else) — every
    transition matched expectations exactly.
  - **Section lock**: entering section B before section A was submitted was rejected
    (`{"ok":false,"reason":"earlier sections not completed"}`); after submitting section A it was
    allowed (`{"ok":true}`); re-entering the now-completed section A was rejected
    (`{"ok":false,"reason":"already completed"}`) — same guard the real endpoint runs, confirmed
    against real rows, not traced by reading the code.
  - **Scoring with only one section completed**: answered 1 of section A's 4 questions correctly,
    left section B's 1 question untouched, called the real `finalizeAttempt` — got
    `{score: 1, total_questions: 5}`, confirming a partially-completed multi-section attempt scores
    correctly (the untouched section's question costs nothing, doesn't block scoring).
  - `tsc --noEmit` and `next build` both clean throughout; all scratch test data removed afterward.
- Files touched: `types/index.ts`, `app/globals.css`, `tailwind.config.ts`,
  `app/api/proctored-tests/[id]/attempts/[attemptId]/route.ts`,
  `app/api/proctored-tests/[id]/attempts/route.ts`, `app/api/proctored-tests/[id]/route.ts`,
  `app/student/proctored-tests/[testId]/take/page.tsx`,
  `app/student/proctored-tests/[testId]/start/page.tsx`, `lib/supabase/schema.sql`. New:
  `supabase/migrations/0014_proctored_question_status.sql`,
  `components/proctored-take/SectionQuestionPalette.tsx`,
  `components/proctored-take/BasicCalculator.tsx`.
- Why: the prior task built the section data model and API but explicitly left the take screen
  flat/single-list — this is the follow-up that makes a multi-section test (e.g. a real TCS-style
  drive with Quant + Technical) actually *takeable* the way the reference NEET-style UI shows,
  with the palette states, section navigation, and per-section timing all backed by the same
  server-authoritative principle the rest of Proctored Tests already relies on: the client only
  ever reflects state, nothing about scoring, timing, or lock enforcement is trusted from the
  browser.

## [2026-09-19] — Proctored Tests: leaderboards (student dashboard + teacher results view)
- **Step 1 — shared ranking**: `lib/leaderboard.ts`'s `getTestLeaderboard(testId)` — the one place
  attempts get ranked, so the student dashboard and the teacher's results view can't drift into
  disagreeing about who's ranked where. Only `submitted`/`auto_submitted_violation`/`expired`
  attempts with a non-null `score` are ranked (`in_progress` never has one). **Sorting is a real
  PostgREST `.order("score", desc).order("submitted_at", asc)` call — an actual SQL `ORDER BY`,
  not a `.sort()` over an unsorted fetch** — confirmed to scale with attempt count rather than a
  client-side sort. Rank numbers are then assigned with a single O(n) pass over that
  already-sorted sequence (labeling a sorted list, not a second sort) using competition ranking
  (1, 1, 3 — not 1, 2, 3): two rows share a rank only if **both** score and `submitted_at` are
  identical down to microsecond precision — vanishingly rare, but handled rather than picking an
  arbitrary winner between them. The task's literal tie-break rule ("tied scores broken by
  earlier submission time") is exactly what makes two equal-score rows get *different*, not
  shared, ranks in the normal case — confirmed against real data below.
- **Step 2 — student dashboard history**: `app/student/dashboard/page.tsx` gained a "My Proctored
  Tests" table (test, class, status, score, rank, submission date) plus a "Total tests taken"
  count, backed by `GET /api/student/proctored-tests` extended with `submitted_at` and `rank`.
  **`rank` (and, per the task's explicit pairing, `score`/`total_questions` too) are `null` from
  the server whenever `results_released` is false — not hidden in the UI, never computed or sent
  in the first place**, same discipline as the existing review endpoint's 403 gate. Noted
  behavior change: this endpoint is shared with the pre-existing `/student/proctored-tests` list
  page, which previously showed a student's own score regardless of release — it's now gated too,
  since the task explicitly grouped score with rank under the same release condition and this was
  the natural single place to enforce it consistently rather than duplicating the check.
- **Step 3 — Top 5 widget**: new `GET /api/student/proctored-tests/leaderboard`, gated the same
  way — it never even reaches the ranking step for a test that isn't released. Picks the
  student's most recently completed **and released** test (by their own `submitted_at`) across
  their classes, returns its top 5 plus the student's own row if they're outside it (`me: null`
  when their row is already inside `top`, to avoid showing it twice). Renders an explicit "no
  released results yet" empty state, not nothing/an error, when no such test exists.
- **Step 4 — teacher leaderboard**: `GET /api/proctored-tests/[id]/attempts`'s teacher branch now
  also returns `leaderboard` (calling the same shared function) alongside its existing attempt
  list — **independent of `results_released`**, since a teacher can always see full rankings for
  their own test. Rendered as a collapsible table inside `TestDetail`
  (`components/ProctoredTestsPanel.tsx`) with an explicit note that this visibility doesn't
  depend on release status, so it's not mistaken for what students currently see.
- **Verification (real data, not traced)**: created a disposable class with 3 real student
  accounts and a real proctored test, inserted attempts with a deliberate tie — **student A and B
  both scored 8/10; A submitted at `10:54:52.326Z`, B one minute later at `10:55:52.326Z`; C
  scored 5/10** — and called the actual `getTestLeaderboard()`. Result: **A ranked #1, B ranked
  #2 (same score, but later submission), C ranked #3** — the tie-break worked exactly as
  specified, giving the earlier submitter the better rank rather than a shared one.
  **Release-gating**, checked against the real `results_released` column value fetched fresh from
  the DB each time (not assumed): before release, the student-route's exact inclusion filter
  evaluated to "don't compute rank for this test"; after flipping `results_released` to `true`,
  the same filter included it and `getTestLeaderboard()` returned A at rank 1 as expected; the
  teacher-side call was confirmed to return all 3 ranked rows **while `results_released` was still
  false**, proving the teacher view is genuinely unconditional. All test data (including any
  disposable auth accounts, none were needed since 3 real student accounts already existed)
  cleaned up afterward. `tsc --noEmit` and `next build` both clean throughout.
- Files touched: `types/index.ts`, `app/api/proctored-tests/[id]/attempts/route.ts`,
  `app/api/student/proctored-tests/route.ts`, `app/student/dashboard/page.tsx`,
  `components/ProctoredTestsPanel.tsx`. New: `lib/leaderboard.ts`,
  `app/api/student/proctored-tests/leaderboard/route.ts`,
  `components/ProctoredLeaderboardWidget.tsx`.
- Why: a proctored test's score means more in context — "8/10" is a lot more informative next to
  "and you were 2nd out of 30" — and teachers already had the raw attempt list but no ranked view
  of it. The release-gating discipline matters most here specifically because a leaderboard, unlike
  a student's own score, inherently exposes *other* students' standing — worth being as strict
  about as the full per-question review already is.

