-- ============================================================
-- 0002_aptitude_module — 2026-09-09 (retroactively split out)
-- Practice mode (untimed, topic-wise) and test mode (timed, teacher-
-- assigned, scored) for aptitude MCQs. See project.md §5 for the
-- module overview; test-taking (attempts/scoring) was designed here
-- but wasn't wired up to the app until a later Test Mode task.
-- ============================================================

do $$ begin
  create type aptitude_category as enum ('quant', 'logical', 'verbal');
exception when duplicate_object then null; end $$;

-- Reuses the existing question_difficulty enum (easy/medium/hard/unknown)
-- from 0001_initial_schema.sql's DSA module — no need for a second
-- difficulty type.

do $$ begin
  create type aptitude_attempt_status as enum ('in_progress', 'submitted', 'expired');
exception when duplicate_object then null; end $$;

-- One MCQ. `options` is a JSON array of plain strings; `correct_option`
-- is the 0-based index into that array — kept simple (no separate
-- options table) since options never need independent history/reuse.
create table if not exists aptitude_questions (
  id uuid primary key default gen_random_uuid(),
  category aptitude_category not null,
  topic text not null,                 -- e.g. "Time & Work", "Reading Comprehension"
  prompt text not null,
  options jsonb not null,              -- e.g. ["12", "18", "24", "36"]
  correct_option int not null,         -- index into `options`
  explanation text,
  difficulty question_difficulty not null default 'unknown',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint aptitude_questions_options_len check (jsonb_array_length(options) >= 2),
  constraint aptitude_questions_correct_option_range
    check (correct_option >= 0 and correct_option < jsonb_array_length(options))
);

create index if not exists idx_aptitude_questions_category on aptitude_questions(category);
create index if not exists idx_aptitude_questions_topic on aptitude_questions(topic);

-- One row per (student, question) — mirrors the DSA `progress` table's
-- shape, but tracks MCQ correctness instead of a manual status pill.
-- Written by the app itself on every practice submission (not
-- user-toggled), so `attempts_count` reflects real attempts.
create table if not exists aptitude_practice_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  question_id uuid not null references aptitude_questions(id) on delete cascade,
  attempts_count int not null default 0,
  last_selected_option int,
  last_correct boolean,
  last_attempted_at timestamptz,
  first_correct_at timestamptz,        -- first time this student got it right, if ever
  updated_at timestamptz not null default now(),
  unique (student_id, question_id)
);

create index if not exists idx_aptitude_practice_student on aptitude_practice_history(student_id);
create index if not exists idx_aptitude_practice_question on aptitude_practice_history(question_id);

-- Teacher-built timed test. `negative_marking_fraction` is the
-- fraction of a mark deducted per wrong answer (e.g. 0.25); 0 means no
-- negative marking. Not used by the app until Test Mode is built.
create table if not exists aptitude_tests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category aptitude_category,          -- null = mixed-category test
  time_limit_minutes int not null,
  negative_marking_fraction numeric not null default 0,
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Ordered questions within a test. `position` is explicit (not row
-- order) so re-ordering doesn't require reinserting rows.
create table if not exists aptitude_test_questions (
  test_id uuid not null references aptitude_tests(id) on delete cascade,
  question_id uuid not null references aptitude_questions(id) on delete cascade,
  position int not null,
  primary key (test_id, question_id),
  unique (test_id, position)
);

-- Mirrors the DSA `assignments` table exactly (test -> class instead
-- of question_set -> class).
create table if not exists aptitude_assignments (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references aptitude_tests(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  assigned_by uuid not null references users(id) on delete cascade,
  due_date date,
  created_at timestamptz not null default now()
);

-- One row per (student, test) — a student submits once, enforced by
-- the unique constraint plus an app-level check on `status`.
create table if not exists aptitude_test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references aptitude_tests(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  status aptitude_attempt_status not null default 'in_progress',
  answers jsonb not null default '{}', -- { "<question_id>": <selected_option int> }
  score numeric,                       -- net score after negative marking, filled on submit
  total_questions int,                 -- snapshot at submit time (test content could change later)
  time_taken_seconds int,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (test_id, student_id)
);

create index if not exists idx_aptitude_attempts_test on aptitude_test_attempts(test_id);
create index if not exists idx_aptitude_attempts_student on aptitude_test_attempts(student_id);

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table aptitude_questions enable row level security;
alter table aptitude_practice_history enable row level security;
alter table aptitude_tests enable row level security;
alter table aptitude_test_questions enable row level security;
alter table aptitude_assignments enable row level security;
alter table aptitude_test_attempts enable row level security;
-- No policies — service-role only, same posture as 0001.
