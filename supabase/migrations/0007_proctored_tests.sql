-- ============================================================
-- 0007_proctored_tests — 2026-09-11
-- Foundation for "Proctored Tests": a new, separate exam type created
-- by a teacher/admin under a specific class, with its own dedicated
-- MCQ question bank (not shared with Aptitude or DSA). This migration
-- covers schema only — creation/authoring UI is wired up in the app,
-- but the actual secure test-taking screen (camera/mic capture,
-- fullscreen enforcement, live violation detection) is a separate
-- follow-up task. See project.md §3 "Proctored tests / simulated
-- placement drive".
-- ============================================================

do $$ begin
  create type proctored_attempt_status as enum ('in_progress', 'submitted', 'auto_submitted_violation', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proctored_violation_type as enum ('tab_switch', 'fullscreen_exit', 'copy_attempt', 'camera_off');
exception when duplicate_object then null; end $$;

-- One MCQ. Same shape as aptitude_questions (options jsonb array,
-- correct_option as a 0-based index) — MCQ only for v1, no coding
-- questions, since there's no in-house judge (an earlier decision
-- carried over from the DSA module). Reuses question_difficulty from
-- 0001_initial_schema.sql.
create table if not exists proctored_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  options jsonb not null,
  correct_option int not null,
  explanation text,
  difficulty question_difficulty not null default 'unknown',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint proctored_questions_options_len check (jsonb_array_length(options) >= 2),
  constraint proctored_questions_correct_option_range
    check (correct_option >= 0 and correct_option < jsonb_array_length(options))
);

-- A proctored test belongs to exactly one class (unlike aptitude_tests,
-- which is assigned to classes separately via aptitude_assignments) —
-- there's no cross-class reuse for v1, so class_id is NOT NULL here
-- and the class-scoped authorization (owner/collaborator/admin via
-- getClassAuthorization) is the only gate on creating/editing one.
create table if not exists proctored_tests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  description text,
  time_limit_minutes int not null,
  negative_marking_fraction numeric not null default 0,
  max_violations_before_autosubmit int not null default 3,
  require_camera boolean not null default false,
  require_mic boolean not null default false,
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_proctored_tests_class on proctored_tests(class_id);

-- Ordered questions within a test — same explicit-position junction
-- pattern as aptitude_test_questions.
create table if not exists proctored_test_questions (
  test_id uuid not null references proctored_tests(id) on delete cascade,
  question_id uuid not null references proctored_questions(id) on delete cascade,
  position int not null,
  primary key (test_id, question_id),
  unique (test_id, position)
);

-- One row per (student, test) — a student attempts once, enforced by
-- the unique constraint plus an app-level check on `status`.
-- `violation_count` is the live tally the test-taking screen will
-- increment; once it reaches max_violations_before_autosubmit the
-- attempt is force-submitted with status 'auto_submitted_violation'.
create table if not exists proctored_test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references proctored_tests(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  status proctored_attempt_status not null default 'in_progress',
  answers jsonb not null default '{}',
  score numeric,
  total_questions int,
  violation_count int not null default 0,
  time_taken_seconds int,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (test_id, student_id)
);

create index if not exists idx_proctored_attempts_test on proctored_test_attempts(test_id);
create index if not exists idx_proctored_attempts_student on proctored_test_attempts(student_id);

-- Full audit log per attempt — this is the record a teacher reviews,
-- since no camera images/video are stored per the no-storage decision.
create table if not exists proctored_violations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references proctored_test_attempts(id) on delete cascade,
  violation_type proctored_violation_type not null,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_proctored_violations_attempt on proctored_violations(attempt_id);

-- ---------- ROW LEVEL SECURITY ----------
-- Same posture as every other table: service-role bypass only, no
-- policies — see the RLS section at the end of schema.sql.
alter table proctored_questions enable row level security;
alter table proctored_tests enable row level security;
alter table proctored_test_questions enable row level security;
alter table proctored_test_attempts enable row level security;
alter table proctored_violations enable row level security;
