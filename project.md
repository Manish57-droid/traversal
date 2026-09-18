# Traversal — Project Overview

_Last updated: 2026-09-09_

This is the single source of truth for what Traversal is, what exists today, and where it's
going. Update this file whenever scope, roles, or the data model change — don't let it drift
from reality.

## 1. Vision

Traversal is a placement-preparation platform where students prepare for campus/off-campus
recruitment — aptitude, technical rounds, and DSA practice — and discover off-campus
opportunities, all in one place. On top of practice, students can run through a **simulated
"company drive"**: a timed, multi-round flow that mirrors how a real recruiter actually runs a
drive, so the first time a student sees that format isn't during the real thing.

Teachers and colleges use the same platform to assign practice, build/run drives, and monitor
each student's prep and performance.

## 2. User roles

- **Student** — practices DSA (today) and, per the roadmap, aptitude/technical content; joins a
  class via a join code; gets assignments from a teacher; takes simulated drives; tracks their
  own progress.
- **Teacher / Admin** — today these are two separate roles in the schema (`teacher`, `admin`),
  not one combined role:
  - **Teacher**: builds the question bank, groups questions into sets, assigns sets to a class,
    views per-student progress. Will own drive creation/assignment once that module exists. A
    class now supports co-teaching: one owner (the creator) plus zero or more approved
    **collaborator** teachers with equal management rights (same access to assign, view analytics,
    approve/reject further requests) — a teacher can browse every class in the system and request
    access to one they don't already manage; the owner or an admin approves or rejects. See
    `class_collaborators` / `class_access_requests` in the schema and `lib/classAccess.ts`.
  - **Admin**: one hard-coded account (by email) that approves/rejects new sign-ups and can
    change anyone's role. Currently a single super-admin, not a per-college admin. Has its own
    dedicated interface as of 2026-09-11: a sidebar shell (`AdminSidebar`, collapsible to an icon
    rail on medium screens, a slide-out drawer on mobile) fronting `/admin/dashboard` (platform
    stat cards + a merged recent-activity feed), `/admin/users`, `/admin/classes` (placeholder —
    admin already has full access via `/teacher/classes` in the meantime), `/admin/access-requests`,
    and `/admin/role-log` (the `role_change_log` audit trail from the previous task, made
    actually visible/filterable).

> **Decided (2026-09-09):** no separate Recruiter/Placement Cell role for now — the existing
> Admin role covers cross-class oversight needs. Revisit only if a concrete workflow demands it
> later.

## 3. Core modules

| Module | Status | Notes |
|---|---|---|
| **DSA practice** | **EXISTING** | Question bank (teacher-curated links to LeetCode/CodeChef/Codeforces/GfG/HackerRank), question sets, class assignment, per-student checkbox progress (not started/attempted/completed), teacher progress rollup. Students solve on the *external* judge site — there is no in-house code execution/judge. |
| **Topic explanations (3D concept player)** | **EXISTING** | `/topics` — 4 static, hand-authored concepts (Arrays, Stacks, Linked Lists, Trees) with a theory panel + step-through Three.js scene + quiz. Not stored in Supabase; adding a topic means adding code. |
| **Auth, roles, approval workflow** | **EXISTING** | Supabase Auth + `users` table + approval gate (pending/approved/rejected) enforced in `middleware.ts` and `lib/roles.ts`. |
| **Aptitude practice + Test Mode** (quant, logical, verbal — untimed practice and timed, teacher-assigned, scored tests) | **EXISTING** | Practice mode (untimed, topic-wise, immediate feedback) has existed since earlier: teacher question bank CRUD + student practice flow. `topic` stays free
  text on `aptitude_questions`, but the teacher authoring form now suggests from a starting
  per-category topic taxonomy (`lib/aptitudeTopics.ts`) instead of every teacher inventing names
  ad hoc. **Test Mode** (timed, teacher-assigned, scored) — designed alongside practice mode but
  left schema-only until now — is fully built: teacher creates a test (name, category or mixed,
  time limit, negative marking fraction, manual or "N random from topic X" question picking) and
  assigns it to a class in one step (`aptitude_assignments`) from the same class-detail panel
  Proctored Tests lives in; students get a plain timed test (no fullscreen lock, no camera, no
  activity monitoring — that's what Proctored Tests is for) with a server-authoritative timer,
  autosaved answers, and auto-submit on timeout; scoring applies negative marking server-side
  only. Post-submit shows score only — the full per-question review is gated behind a
  teacher-controlled "Release results" toggle, using the exact same mechanism and shared
  components (`TestResultBanner`, `TestReviewView`, `QuestionPalette`) as Proctored Tests, not a
  separate reimplementation. Teacher gets a per-test results rollup (score distribution chart,
  per-student score, time taken). |
| **Technical round practice** (CS fundamentals, MCQs, mock interviews) | **PLANNED** | Not started. |
| **Interview Preparation** (language/topic Q&A: C++, Java, Python, SQL, DBMS, OS, Networking, System Design, OOP, JavaScript) | **EXISTING** | `/student/interview-prep` (category grid → accordion Q&A) and `/teacher/interview-prep` (CRUD authoring, teacher/admin, same `created_by` attribution pattern as the rest of the app) are built. Content is intentionally empty aside from 1-2 example entries per category — real questions are authored by admin/teacher through the UI, not imported. Complements, doesn't replace, the "Technical round practice" module above (that one's MCQ-style timed practice; this is a static, browsable Q&A reference). |
| **DSA judge / code execution** (in-browser run/submit against test cases) | **PLANNED** | Current DSA module links out to external judges only; no execution engine. |
| **Off-campus opportunities board** (job/internship postings, filters, application tracking) | **PLANNED** | Not started. |
| **"Protocol test" / simulated placement drive** (multi-round, timed, sequential, pass/fail gated) | **IN PROGRESS** | **Proctored Tests** now has a full end-to-end MCQ exam flow, built in two slices. Schema/authoring (first slice): a class-scoped exam type with its own MCQ-only question bank (`proctored_questions`, not shared with Aptitude/DSA), test authoring (`proctored_tests` + ordered `proctored_test_questions`), class-gated via `getClassAuthorization` — teacher/admin UI at `/teacher/proctored-questions` (bank CRUD) and a "Proctored tests" panel on `/teacher/dashboard`. Test-taking (second slice): `/student/proctored-tests` (list + status), `/student/proctored-tests/[testId]/start` (rules screen + camera/mic check), `/student/proctored-tests/[testId]/take` (fullscreen exam UI — timer, question palette, autosaved answers), server-side violation logging + auto-submit at threshold, teacher-controlled result release gating a full review page. **Honest limits, read this before assuming more than it does**: (1) camera/mic, when required, is a **live browser check only** — the feed is never recorded, saved, or uploaded anywhere, so there is no video evidence to review after the fact, only the violation log; (2) nothing here can detect or block another running application, a second monitor, or remote-desktop software — a browser has no access to that; this is **detection-and-response inside the tab** (fullscreen-exit, tab-switch/blur, copy/cut, camera dropping out), not prevention of every way to cheat; (3) every security-relevant decision (violation count, elapsed time, final score) is computed and enforced server-side — the client only ever reflects state, confirmed by directly rewinding an attempt's `started_at` in the database and observing the server independently close it out as expired, ignoring whatever the client's own countdown displayed. Still not built: multi-round drives (this is single-test, not the full sequential-rounds "drive" concept from Section 5's data model). |
| **Teacher/admin dashboard: assign tests, create drives, view analytics** | **PARTIAL** | Assigning DSA question sets to a class exists today, and `/teacher/dashboard` is now a combined DSA + Aptitude analytics view (class-wide charts, a sortable per-student table, a click-through detail drawer) plus the Proctored Tests panel and the new Aptitude Tests panel (create/assign, results rollup with score distribution) described above. Creating/assigning *drives* still doesn't exist — that's the only piece of this row still missing. |

## 4. Tech stack

- **Framework**: Next.js 14.2 (App Router), React 18, TypeScript.
- **Styling**: Tailwind CSS, with a small CSS-variable-driven design token layer
  (`--bg`, `--surface`, `--accent`, `--success`, `--warn`, etc. mapped in `tailwind.config.ts`) —
  no component library (no shadcn/MUI/etc.), hand-rolled utility-class components.
- **3D**: React Three Fiber + drei + three.js, used for the landing-page hero and the topic
  concept player.
- **Backend**: No separate backend service — Next.js Route Handlers under `app/api/**/route.ts`
  running on Vercel. No serverless framework beyond what Next.js/Vercel provide out of the box.
- **Database**: Supabase Postgres. **No ORM** — raw `@supabase/supabase-js` queries via a
  service-role client (`lib/supabase/server.ts`) used from API routes and server components only.
  Schema is hand-written SQL in `lib/supabase/schema.sql`, applied manually through the Supabase
  SQL editor (no migration tool/CLI wired up yet).
- **Auth**: Supabase Auth (email + password). Session cookie refreshed in `middleware.ts`
  (`@supabase/ssr`). App-level role/approval data lives in the `users` table (not in Supabase Auth
  metadata) and is populated automatically by a Postgres trigger (`handle_new_user`) on sign-up —
  the app never inserts into `users` directly.
- **Hosting**: Vercel (per README).

## 5. Data model overview

### Existing (see `lib/supabase/schema.sql` for the authoritative definitions)

- **users** — mirrors `auth.users`; adds `role` (`student`/`teacher`/`admin`), `status`
  (`pending`/`approved`/`rejected`), `full_name`, `avatar_url`.
- **classes** — a teacher-owned batch, with a `join_code` students use to enroll.
- **class_members** — student ↔ class join table.
- **questions** — a single DSA problem link with detected `platform`, `difficulty`, `topic`.
- **question_sets** / **question_set_items** — a named, reusable bundle of questions.
- **assignments** — a question set assigned to a class (creates `progress` rows for every
  student in that class).
- **progress** — one row per (student, question): status + timestamps.
- **aptitude_questions** — an MCQ: `category` (quant/logical/verbal), `topic`, `prompt`,
  `options` (jsonb array), `correct_option` (index), `explanation`, `difficulty` (reuses
  `question_difficulty`).
- **aptitude_practice_history** — one row per (student, question): `attempts_count`,
  `last_selected_option`, `last_correct`, `last_attempted_at`, `first_correct_at`.
- **aptitude_tests** — a teacher-built timed test: `name`, `category` scope (nullable = mixed),
  `time_limit_minutes`, `negative_marking_fraction` (0 = none; e.g. 0.25 = quarter mark off per
  wrong answer), `results_released` (teacher-controlled gate on the full per-question review page,
  same mechanism as `proctored_tests.results_released`).
- **aptitude_test_questions** — ordered questions within a test (`position`).
- **aptitude_assignments** — a test assigned to a class (mirrors DSA `assignments`).
- **aptitude_test_attempts** — one row per (student, test): `status`, `answers` (jsonb),
  `score` (numeric, net of negative marking), `total_questions`, timestamps.
- **proctored_questions** — an MCQ for the Proctored Tests bank (separate from Aptitude/DSA):
  `prompt`, `options` (jsonb array), `correct_option` (index), `explanation`, `difficulty`.
- **proctored_tests** — a class-scoped timed exam: `class_id` (NOT NULL — belongs to exactly one
  class), `name`, `description`, `time_limit_minutes`, `negative_marking_fraction`,
  `max_violations_before_autosubmit`, `require_camera`, `require_mic`, `results_released`
  (teacher-controlled gate on the full per-question review page).
- **proctored_test_questions** — ordered questions within a proctored test (`position`).
- **proctored_test_attempts** — one row per (student, test): `status`
  (in_progress/submitted/auto_submitted_violation/expired), `answers` (jsonb), `score`,
  `total_questions`, `violation_count`, `time_taken_seconds`, timestamps.
- **proctored_violations** — full audit log per attempt (`violation_type`: tab_switch/
  fullscreen_exit/copy_attempt/camera_off, `occurred_at`) — no camera images/video are stored,
  this log is what a teacher reviews instead.

### Planned additions (draft — will firm up as each module is built)

- **Opportunity** — off-campus job/internship posting: title, company, description, type
  (job/internship), location/remote, apply URL or in-app application, tags/filters, posted_by,
  deadline, status (open/closed).
- **Application** — a student's application to an `Opportunity`: student_id, opportunity_id,
  status (applied/shortlisted/rejected/offer), applied_at.
- **TechnicalQuestion** — MCQ-style content for the Technical module, likely to reuse or closely
  mirror the `aptitude_questions` shape once that module is designed.
- **Drive** — a simulated placement drive: name, description, created_by (teacher/college),
  status (draft/published/archived), assigned classes/students.
- **Round** — one stage of a `Drive`: belongs to a `Drive`, has a `round_type` (aptitude /
  technical_mcq / coding / interview / custom), an `order` (sequence position, not hardcoded into
  app logic — see Open Decisions), a time limit, a cutoff/pass criteria, and a reference to the
  content it draws from (a `Test`, a coding question set, etc.).
- **RoundType** — enum/lookup describing what kind of round it is (drives the UI/behavior for
  that round: MCQ test, timed coding, etc.).
- **DriveAttempt** / **RoundAttempt** — tracks a student's progress through a `Drive`: which round
  they're on, pass/fail per round, final result (shortlisted/rejected), timestamps — this is what
  makes the sequential pass/fail gating actually work.

The `Drive`/`Round`/`RoundType` split above is deliberately **not** a fixed hardcoded pipeline in
the schema — round order lives as data (`order` on `Round`, scoped to a `Drive`), not as a
hardcoded sequence in application code. This is so the schema can support fully custom drives
later even though v1 may lock the *product experience* to one fixed template (see Open Decisions).

## 6. Open Decisions

Resolved decisions are kept here (dated) rather than deleted, so the reasoning stays visible.
Currently there are no open items in this section.

1. **Drive customization, v1 scope** — **Decided (2026-09-09):** v1 ships one fixed,
   system-defined drive template (Aptitude → Technical MCQ → Coding → Results). The
   `Drive`/`Round`/`RoundType` schema still stores round order as data (not hardcoded), so a
   custom builder UI remains possible in v2 without a schema rewrite.

## 6a. Resolved build order

Modules will be built in this order: **Aptitude → Technical → Opportunities board → Drive
system.** Reason: a Drive's rounds reference content from the Aptitude/Technical/Coding modules
(a Round points at a Test or question set from those modules) — the Drive system has nothing
real to assemble until that content exists, so building it first would mean building against
placeholder data. Opportunities board has no such dependency but is sequenced before Drive since
it's simpler and independent of the others.

## 7. Non-goals / out of scope (for now)

- **In-house code execution/judge** for DSA problems. Students solve on the real platform
  (LeetCode/Codeforces/etc.); the app only tracks the checkbox. Building a sandboxed code runner
  is a significant scope increase and is not planned until explicitly requested.
- **Payments/monetization** — no billing, subscriptions, or paid tiers.
- **Native mobile app** — web only (responsive), no React Native/Expo work.
- **Drive customization builder UI** — even if the Section 6 decision lands on "custom drives,"
  the actual builder UI (teacher picks rounds/order/cutoffs through a UI) is a **v2** feature.
  v1's job is to get the `Drive`/`Round`/`RoundType` schema right so it *can* support this later,
  not to ship the builder itself.
- **Third-party ATS/recruiter integrations** for the opportunities board — postings are
  entered/curated in-app (by teachers/admins) for now, not pulled from external job APIs.
- **Real-time collaboration features** (e.g. live proctoring, live leaderboards during a drive) —
  the README already flags Supabase Realtime as a deferred upgrade for the existing dashboard;
  the same applies to anything drive-related.
- **Multi-tenancy / white-labeling per college** — today there's a single hard-coded admin email
  and a flat `teacher`/`student`/`admin` role model, not per-college data isolation. Revisit if/
  when the Recruiter/Placement Cell role (Open Decision #2) is decided.
