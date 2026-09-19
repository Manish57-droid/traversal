-- ============================================================
-- 0013_proctored_test_sections — 2026-09-19
-- Restructures Proctored Tests to support multiple sections per test
-- (e.g. "TCS Preparation" with a Quantitative section and a Technical
-- section, each on its own Subject), so a test isn't just one flat
-- question list anymore. A section's questions come from whichever
-- Sets are toggled on for it (proctored_test_section_sets) — resolved
-- DYNAMICALLY at read time from each question's set_id, not snapshotted
-- into proctored_test_questions, so a Set's current contents are what
-- a student sees on their next attempt (app-level: lib/proctoredSections.ts
-- is the one place that resolves this, shared by attempt-start, scoring,
-- and review).
--
-- proctored_test_questions is kept for BACKWARD COMPATIBILITY ONLY —
-- every existing test's real question rows stay right where they are;
-- this migration just wraps them in one auto-created default section
-- per test (position 0, subject_id left NULL since legacy questions
-- predate Subject/Set and may span several subjects or none at all —
-- see 0012's needs_categorization). New tests created through the
-- section-aware flow never write proctored_test_questions rows; the
-- resolver merges both paths into one ordered list so existing code
-- (scoring, the take/review screens) doesn't need to know which kind
-- of test it's looking at.
--
-- Section-locking/per-section timers need a place to record "has this
-- student started/finished this section yet" independent of the whole
-- attempt — that's proctored_section_attempts. The actual test-taking
-- UI changes that consume it (timer display, lock enforcement) are a
-- separate follow-up task; this migration and its API layer just make
-- the data model correct to build that against.
-- ============================================================

do $$ begin
  create type proctored_timer_mode as enum ('combined', 'per_section');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proctored_section_attempt_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

alter table proctored_tests add column if not exists timer_mode proctored_timer_mode not null default 'combined';
alter table proctored_tests add column if not exists allow_free_section_navigation boolean not null default true;

create table if not exists proctored_test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references proctored_tests(id) on delete cascade,
  name text not null,
  -- Nullable: a legacy default section (see backfill below) predates
  -- Subject/Set and may span many subjects or none; a section created
  -- through the new UI always sets this (enforced app-level, same
  -- posture as proctored_questions.set_id before it had a DB-level
  -- NOT NULL option).
  subject_id uuid references proctored_subjects(id) on delete set null,
  position int not null,
  -- null = "uses the test's combined timer, not its own" (only
  -- meaningful when timer_mode = 'per_section').
  time_limit_minutes int,
  -- null = "inherit proctored_tests.negative_marking_fraction".
  negative_marking_fraction numeric,
  calculator_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (test_id, position)
);

create index if not exists idx_proctored_test_sections_test on proctored_test_sections(test_id);

create table if not exists proctored_test_section_sets (
  section_id uuid not null references proctored_test_sections(id) on delete cascade,
  set_id uuid not null references proctored_sets(id) on delete cascade,
  primary key (section_id, set_id)
);

create index if not exists idx_proctored_test_section_sets_section on proctored_test_section_sets(section_id);

-- ---------- Legacy backfill: wrap every existing test in one default section ----------
-- Every current proctored_test (including ones with zero questions,
-- e.g. an orphaned draft) gets exactly one section so the "a test
-- always has >=1 section" invariant holds for every row going forward,
-- and finalizeAttempt/the take screen can always group by section.
alter table proctored_test_questions add column if not exists section_id uuid references proctored_test_sections(id) on delete cascade;

insert into proctored_test_sections (test_id, name, position, time_limit_minutes, negative_marking_fraction, calculator_enabled)
select id, name, 0, null, null, false
from proctored_tests t
where not exists (select 1 from proctored_test_sections s where s.test_id = t.id);

update proctored_test_questions tq
set section_id = s.id
from proctored_test_sections s
where s.test_id = tq.test_id and s.position = 0 and tq.section_id is null;

alter table proctored_test_questions alter column section_id set not null;

-- Position now orders questions within a section, not globally across
-- the whole test — every legacy test still has exactly one section at
-- this point, so this is a no-op for existing data, just a schema
-- correction for tests that will have more than one section from here on.
alter table proctored_test_questions drop constraint if exists proctored_test_questions_test_id_position_key;
alter table proctored_test_questions drop constraint if exists proctored_test_questions_section_id_position_key;
alter table proctored_test_questions add constraint proctored_test_questions_section_id_position_key unique (section_id, position);

create table if not exists proctored_section_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references proctored_test_attempts(id) on delete cascade,
  section_id uuid not null references proctored_test_sections(id) on delete cascade,
  started_at timestamptz,
  submitted_at timestamptz,
  status proctored_section_attempt_status not null default 'not_started',
  unique (attempt_id, section_id)
);

create index if not exists idx_proctored_section_attempts_attempt on proctored_section_attempts(attempt_id);

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table proctored_test_sections enable row level security;
alter table proctored_test_section_sets enable row level security;
alter table proctored_section_attempts enable row level security;
-- No policies — service-role only, same posture as every other table.
