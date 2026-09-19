-- ============================================================
-- Traversal DSA — Supabase schema (consolidated reference)
--
-- This file is a single-source-of-truth SNAPSHOT of the full schema as
-- currently applied, kept for convenience (e.g. bootstrapping a fresh
-- Supabase project in one paste). It is NOT where new schema changes
-- should be authored.
--
-- Going forward: author every schema change as its own file under
-- supabase/migrations/, named `NNNN_short_description.sql`
-- (sequential, zero-padded), with a header comment stating what it
-- does and the date — see supabase/migrations/0001_initial_schema.sql
-- onward. Run the new migration file in the Supabase SQL editor same
-- as always (still no CLI/migration-runner wired up in this repo), and
-- only AFTER it's been applied, append the same SQL to the end of
-- this file so schema.sql keeps reflecting current state as one
-- consolidated read. Don't edit this file first and migrations/ second
-- — migrations/ is the source, this file is the derived snapshot.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type user_role as enum ('student', 'teacher', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_status as enum ('not_started', 'attempted', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_difficulty as enum ('easy', 'medium', 'hard', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_platform as enum ('leetcode', 'codechef', 'codeforces', 'geeksforgeeks', 'hackerrank', 'other');
exception when duplicate_object then null; end $$;

-- ---------- USERS ----------
-- One row per Supabase Auth user (id matches auth.users.id exactly).
-- Populated automatically by the trigger below at sign-up — never
-- inserted into directly from application code.
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'student',
  status user_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SIGN-UP TRIGGER ----------
-- Runs after every new row in auth.users (i.e. every sign-up).
-- Reads the role the person picked on the sign-up form out of
-- raw_user_meta_data (passed as `options.data.requested_role` to
-- supabase.auth.signUp on the client) and decides role + status:
--
--   * the one hard-coded admin email  -> role 'admin', auto-approved
--   * anyone requesting 'teacher'     -> role 'teacher', pending approval
--   * everyone else                   -> role 'student', pending approval
--
-- To change the admin email later, edit the literal string below and
-- re-run just this CREATE OR REPLACE FUNCTION statement.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'requested_role', 'student');
  admin_email text := 'manishkushwaha572000@gmail.com';
begin
  insert into public.users (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    (case
      when lower(new.email) = admin_email then 'admin'
      when requested_role = 'teacher' then 'teacher'
      else 'student'
    end)::user_role,
    (case when lower(new.email) = admin_email then 'approved' else 'pending' end)::user_status
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- CLASSES ----------
-- A teacher-owned group of students (a "batch"/"section").
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references users(id) on delete cascade,
  join_code text unique not null default substr(md5(random()::text), 1, 6),
  created_at timestamptz not null default now()
);

create table if not exists class_members (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

-- ---------- QUESTIONS ----------
-- A pasted problem link, normalized with detected platform. `url` is
-- nullable specifically for bulk-seeded titles awaiting a real link —
-- see `needs_link_curation` below and 0006_dsa_link_curation.sql.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text,
  platform question_platform not null default 'other',
  difficulty question_difficulty not null default 'unknown',
  topic text,                          -- e.g. "Arrays", "Graphs", "DP"
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- A flagged row has no url yet by definition; an unflagged row must
  -- have a real one — keeps the two states from silently drifting.
  needs_link_curation boolean not null default false,
  constraint questions_url_required_unless_flagged
    check (needs_link_curation or url is not null)
);

create index if not exists idx_questions_platform on questions(platform);
create index if not exists idx_questions_topic on questions(topic);
create index if not exists idx_questions_needs_link_curation on questions(needs_link_curation) where needs_link_curation;

-- ---------- QUESTION SETS ----------
-- A named bundle of questions (e.g. "Week 3 - Arrays") a teacher builds
-- once from the question bank and assigns as a single unit.
create table if not exists question_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists question_set_items (
  question_set_id uuid not null references question_sets(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (question_set_id, question_id)
);

-- ---------- ASSIGNMENTS ----------
-- A teacher assigning an entire question set to a class.
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references question_sets(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  assigned_by uuid not null references users(id) on delete cascade,
  due_date date,
  created_at timestamptz not null default now()
);

-- ---------- PROGRESS ----------
-- One row per (student, question): the checkmark + status.
create table if not exists progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  status question_status not null default 'not_started',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, question_id)
);

create index if not exists idx_progress_student on progress(student_id);
create index if not exists idx_progress_question on progress(question_id);

-- ---------- APTITUDE MODULE ----------
-- Practice mode (untimed, topic-wise) and test mode (timed, teacher-
-- assigned, scored) for aptitude MCQs. See project.md §5 for the
-- module overview; test-taking (attempts/scoring) is designed here
-- but not wired up to the app until the Test Mode task.
do $$ begin
  create type aptitude_category as enum ('quant', 'logical', 'verbal');
exception when duplicate_object then null; end $$;

-- Reuses the existing question_difficulty enum (easy/medium/hard/unknown)
-- from the DSA module above — no need for a second difficulty type.

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
  created_at timestamptz not null default now(),
  -- Gates the full per-question review page, same mechanism as
  -- proctored_tests.results_released (0008_proctored_results_release.sql).
  results_released boolean not null default false
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

-- ---------- CLASS COLLABORATION ----------
-- A class has exactly one owner (classes.teacher_id, unchanged) plus
-- zero or more approved collaborator teachers with equal rights to the
-- owner. The owner is never duplicated into class_collaborators — that
-- table is only for non-owner teachers who were granted access.
do $$ begin
  create type class_access_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type class_collaborator_added_via as enum ('request_approval');
exception when duplicate_object then null; end $$;

create table if not exists class_access_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  requesting_teacher_id uuid not null references users(id) on delete cascade,
  status class_access_request_status not null default 'pending',
  resolved_by uuid references users(id) on delete set null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- A teacher can't have two simultaneously-pending requests for the
-- same class (partial unique index — approved/rejected rows don't
-- count, so a teacher can re-request after a rejection).
create unique index if not exists uniq_pending_class_access_request
  on class_access_requests(class_id, requesting_teacher_id)
  where status = 'pending';

create index if not exists idx_class_access_requests_class on class_access_requests(class_id);
create index if not exists idx_class_access_requests_teacher on class_access_requests(requesting_teacher_id);

create table if not exists class_collaborators (
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references users(id) on delete cascade,
  added_via class_collaborator_added_via not null default 'request_approval',
  added_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create index if not exists idx_class_collaborators_teacher on class_collaborators(teacher_id);

-- ---------- ROLE CHANGE AUDIT LOG ----------
-- An admin account's role was once found silently changed to
-- 'teacher' with no record of how it happened. Audit found no ID-
-- mixup bug in any role-mutating path — PATCH /api/admin/users
-- always targets the row's own id correctly — but nothing logged
-- role changes, and nothing stopped an admin from changing their own
-- role via that same generic endpoint (a stray click on their own row
-- in /admin/users, no confirmation). A `id === admin.id` guard was
-- added at the application layer; this table makes any future role
-- change traceable after the fact.
create table if not exists role_change_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references users(id) on delete cascade,
  previous_role user_role not null,
  new_role user_role not null,
  changed_by uuid references users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_role_change_log_target on role_change_log(target_user_id);

-- ---------- ADMIN USER DELETION ----------
-- Deliberately has NO foreign key to users(id) for the deleted
-- person's own identity — those columns are a denormalized snapshot
-- (name/email/role captured at delete time) precisely because the
-- real users(id) row is about to be destroyed; an FK there would
-- cascade this log row away too, defeating the point of an audit
-- trail. `deleted_by` DOES reference users(id) (on delete set null,
-- same pattern as role_change_log.changed_by) since the admin
-- performing the deletion isn't being deleted in this same operation.
create table if not exists user_deletion_log (
  id uuid primary key default gen_random_uuid(),
  deleted_user_id uuid not null,
  deleted_user_email text not null,
  deleted_user_name text,
  deleted_user_role user_role not null,
  deleted_by uuid references users(id) on delete set null,
  classes_owned_count int not null default 0,
  students_enrolled_count int not null default 0,
  dsa_questions_authored_count int not null default 0,
  aptitude_questions_authored_count int not null default 0,
  interview_questions_authored_count int not null default 0,
  proctored_questions_authored_count int not null default 0,
  deleted_at timestamptz not null default now()
);

create index if not exists idx_user_deletion_log_deleted_user on user_deletion_log(deleted_user_id);

-- Four content tables use `created_by ... on delete set null` (by
-- original design: removing whoever authored a DSA/Aptitude/Interview
-- Prep/Proctored question shouldn't silently orphan-but-keep it in
-- every deletion path in the app). This admin-delete-user feature
-- specifically wants those questions actually gone when an admin
-- deletes the account through this flow — rather than loosening the
-- FK constraints themselves (which would change behavior for every
-- future deletion path, not just this one), this function explicitly
-- deletes each author's content first, then deletes the users row.
-- Every other FK to users(id) already cascades correctly on its own
-- (classes.teacher_id, class_members.student_id, progress.student_id,
-- test attempts, etc.), so deleting the users row here is what
-- actually removes everything scoped to their owned classes and their
-- own enrollment/attempt history — no other constraint changes needed.
-- Runs as one Postgres transaction (a plpgsql function body is
-- atomic): if any step fails, everything rolls back and the
-- already-committed user_deletion_log row (inserted separately, by
-- the caller, BEFORE invoking this function) is the only trace left.
create or replace function admin_delete_user_cascade(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from questions where created_by = p_user_id;
  delete from aptitude_questions where created_by = p_user_id;
  delete from interview_questions where created_by = p_user_id;
  delete from proctored_questions where created_by = p_user_id;
  delete from users where id = p_user_id;
end;
$$;

-- ---------- INTERVIEW PREPARATION ----------
-- Categories organized by language/technology (C++, Java, Python,
-- SQL, DBMS, OS, Networking, System Design, OOP, JavaScript — see
-- project.md §3/§5), each holding a flat list of question+answer
-- pairs. Content is authored by teacher/admin through the app's own
-- CRUD UI, not imported from anywhere.
create table if not exists interview_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text not null,              -- a lucide-react icon component name, e.g. "Code2"
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Reuses the existing question_difficulty enum from the DSA module.
create table if not exists interview_questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references interview_categories(id) on delete cascade,
  question text not null,
  answer text not null,            -- plain text / simple markdown; no rich editor in v1
  difficulty question_difficulty not null default 'unknown',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_questions_category on interview_questions(category_id);

-- ---------- PROCTORED TESTS ----------
-- A separate, class-scoped exam type with its own dedicated MCQ
-- question bank (not shared with Aptitude or DSA). Schema/creation
-- only for now — the secure test-taking screen (camera/mic capture,
-- fullscreen enforcement, live violation detection) is a follow-up
-- task. See project.md §3 "Proctored tests / simulated placement drive".
do $$ begin
  create type proctored_attempt_status as enum ('in_progress', 'submitted', 'auto_submitted_violation', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proctored_violation_type as enum ('tab_switch', 'fullscreen_exit', 'copy_attempt', 'camera_off');
exception when duplicate_object then null; end $$;

-- One MCQ. Same shape as aptitude_questions — MCQ only for v1, no
-- coding questions, since there's no in-house judge. Reuses
-- question_difficulty from above.
create table if not exists proctored_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  options jsonb not null,
  correct_option int not null,
  explanation text,
  difficulty question_difficulty not null default 'unknown',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Optional — most questions won't have one. Uploaded to the public
  -- "proctored-question-images" Storage bucket via a server API route
  -- (service-role client, so no storage.objects RLS policy is needed).
  image_url text,
  constraint proctored_questions_options_len check (jsonb_array_length(options) >= 2),
  constraint proctored_questions_correct_option_range
    check (correct_option >= 0 and correct_option < jsonb_array_length(options))
);

-- A proctored test belongs to exactly one class — no cross-class
-- reuse for v1, so class_id is NOT NULL; the class-scoped
-- authorization (owner/collaborator/admin via getClassAuthorization)
-- is the only gate on creating/editing one.
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
  created_at timestamptz not null default now(),
  -- Gates the full per-question review page (see
  -- 0008_proctored_results_release.sql) — students always see their
  -- own score immediately on submit, but right/wrong detail stays
  -- hidden until the teacher explicitly releases it.
  results_released boolean not null default false
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

-- One row per (student, test). `violation_count` is the live tally
-- the test-taking screen will increment; once it reaches
-- max_violations_before_autosubmit the attempt is force-submitted
-- with status 'auto_submitted_violation'.
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

-- Atomic increment for violation_count — a plain read-then-write from
-- application code raced when two violations landed within the same
-- second (found during live verification), under-reporting the count
-- and letting the auto-submit-at-threshold check miss its trigger.
create or replace function increment_proctored_violation_count(p_attempt_id uuid)
returns int
language sql
as $$
  update proctored_test_attempts
  set violation_count = violation_count + 1
  where id = p_attempt_id
  returning violation_count;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Supabase Auth identifies the caller; the app's own API routes use
-- the service-role key for every read/write (see lib/supabase/server.ts),
-- which bypasses RLS by design. RLS is enabled here as defense-in-depth
-- so the anon key alone can't touch any of this data — with one
-- exception below, so a signed-in user can check their own
-- role/approval status directly if ever needed client-side.
-- ============================================================
alter table users enable row level security;
alter table classes enable row level security;
alter table class_members enable row level security;
alter table questions enable row level security;
alter table question_sets enable row level security;
alter table question_set_items enable row level security;
alter table assignments enable row level security;
alter table progress enable row level security;
alter table aptitude_questions enable row level security;
alter table aptitude_practice_history enable row level security;
alter table aptitude_tests enable row level security;
alter table aptitude_test_questions enable row level security;
alter table aptitude_assignments enable row level security;
alter table aptitude_test_attempts enable row level security;
alter table class_access_requests enable row level security;
alter table class_collaborators enable row level security;
alter table role_change_log enable row level security;
alter table user_deletion_log enable row level security;
alter table interview_categories enable row level security;
alter table interview_questions enable row level security;
alter table proctored_questions enable row level security;
alter table proctored_tests enable row level security;
alter table proctored_test_questions enable row level security;
alter table proctored_test_attempts enable row level security;
alter table proctored_violations enable row level security;

drop policy if exists "users can read own row" on users;
create policy "users can read own row" on users
  for select using (auth.uid() = id);

-- No other policies are created for the anon/authenticated roles, so
-- every other table is unreachable except through the service-role key.

-- ============================================================
-- 0012_proctored_subject_sets — 2026-09-19
-- Restructures the proctored question bank into Subject -> Set ->
-- Question (shared bank, any teacher/admin can create/edit — same
-- spirit as the DSA/Aptitude banks, not class-scoped). Existing
-- proctored_questions rows predate this structure, so set_id is
-- nullable and a needs_categorization flag (same pattern as DSA's
-- needs_link_curation in 0006) marks legacy rows for a teacher to
-- assign a set later, rather than forcing a backfill or losing them.
-- Test-creation flow changes (picking subjects/sets into sections) are
-- a separate follow-up — this migration is bank organization only.
-- ============================================================

create table if not exists proctored_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists proctored_sets (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references proctored_subjects(id) on delete cascade,
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (subject_id, name)
);

create index if not exists idx_proctored_sets_subject on proctored_sets(subject_id);

alter table proctored_questions add column if not exists set_id uuid references proctored_sets(id) on delete set null;
alter table proctored_questions add column if not exists needs_categorization boolean not null default true;

-- Existing rows have no set_id at migration time, so they're legacy/
-- uncategorized by definition; new rows created through the updated
-- form will always supply a set_id and needs_categorization = false.
update proctored_questions set needs_categorization = true where set_id is null;

-- Same drift-prevention shape as questions_url_required_unless_flagged
-- in 0006: a question not flagged for categorization must have a set;
-- a flagged one has none yet by definition.
alter table proctored_questions drop constraint if exists proctored_questions_set_required_unless_flagged;
alter table proctored_questions add constraint proctored_questions_set_required_unless_flagged
  check (needs_categorization or set_id is not null);

create index if not exists idx_proctored_questions_needs_categorization on proctored_questions(needs_categorization) where needs_categorization;
create index if not exists idx_proctored_questions_set on proctored_questions(set_id);

-- Deleting a set cascades set_id -> NULL on its questions (FK above),
-- which would violate proctored_questions_set_required_unless_flagged
-- unless needs_categorization flips to true first. This runs before
-- the cascade so the row is already consistent by the time set_id
-- goes null (also covers a subject delete, which cascades through its
-- sets and fires this once per set).
create or replace function proctored_flag_uncategorized_before_set_delete()
returns trigger as $$
begin
  update proctored_questions set needs_categorization = true where set_id = old.id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_proctored_sets_before_delete on proctored_sets;
create trigger trg_proctored_sets_before_delete
  before delete on proctored_sets
  for each row execute function proctored_flag_uncategorized_before_set_delete();

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table proctored_subjects enable row level security;
alter table proctored_sets enable row level security;
-- No policies — service-role only, same posture as every other table.

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

-- ============================================================
-- 0014_proctored_question_status — 2026-09-19
-- The take-screen overhaul needs a real 6-state question palette
-- (current/answered/not-answered/not-visited/marked-for-review/
-- answered+marked-for-review), which needs "visited" and "marked for
-- review" to survive a resync, a resumed attempt, or a violation-
-- triggered auto-submit — the same reason `answers` is already
-- persisted rather than kept client-only. `answered` stays derived
-- (a question has an entry in `answers`); this column carries the two
-- booleans that have nowhere else to live.
-- ============================================================

alter table proctored_test_attempts
  add column if not exists question_status jsonb not null default '{}';

-- Shape: { [question_id]: { visited: boolean, marked_for_review: boolean } }
-- No CHECK constraint on the jsonb shape — same posture as `answers`,
-- which is also an unvalidated jsonb map; the API route is the one
-- place that ever writes to it.

-- ============================================================
-- 0015_topics — 2026-09-19
-- Adds real, teacher-creatable "topic" folders to the DSA and
-- Aptitude question banks (dsa_topics / aptitude_topics), mirroring
-- 0012's Subject/Set structure for Proctored. Both banks' existing
-- `topic` text column stays exactly as-is — every non-teacher-bank
-- reader (student practice routes, which even encode topic in a URL
-- segment, analytics, CSV/bulk exports) keeps reading it unchanged.
-- The new topic_id FK is purely an organizational layer for the
-- teacher-facing bank pages: it's kept in sync with `topic` (the text
-- always mirrors the linked topic's current name) by every write path
-- in app/api/questions and app/api/aptitude/questions, not by a DB
-- trigger — matching this codebase's existing app-level (not
-- RLS/trigger-level) enforcement posture for question writes.
-- ============================================================

create table if not exists dsa_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name)
);

alter table questions add column if not exists topic_id uuid references dsa_topics(id) on delete set null;
create index if not exists idx_questions_topic_id on questions(topic_id);

-- Backfill: one dsa_topics row per distinct existing topic value,
-- then point questions.topic_id at it. Rows with a null/blank topic
-- stay topic_id = null ("Uncategorized" in the folder UI) — same
-- meaning `topic is null` already had.
insert into dsa_topics (name)
select distinct trim(topic) from questions
where topic is not null and trim(topic) <> ''
on conflict (name) do nothing;

update questions q
set topic_id = t.id
from dsa_topics t
where q.topic_id is null and trim(q.topic) = t.name;

create table if not exists aptitude_topics (
  id uuid primary key default gen_random_uuid(),
  category aptitude_category not null,
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (category, name)
);

alter table aptitude_questions add column if not exists topic_id uuid references aptitude_topics(id) on delete set null;
create index if not exists idx_aptitude_questions_topic_id on aptitude_questions(topic_id);

-- aptitude_questions.topic is NOT NULL (always populated already), so
-- every row backfills cleanly.
insert into aptitude_topics (category, name)
select distinct category, trim(topic) from aptitude_questions
where trim(topic) <> ''
on conflict (category, name) do nothing;

update aptitude_questions q
set topic_id = t.id
from aptitude_topics t
where q.topic_id is null and q.category = t.category and trim(q.topic) = t.name;

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table dsa_topics enable row level security;
alter table aptitude_topics enable row level security;
-- No policies — service-role only, same posture as every other table.
