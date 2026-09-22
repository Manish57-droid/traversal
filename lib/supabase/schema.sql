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

-- ============================================================
-- 0016_class_materials — 2026-09-20
-- Lets a teacher upload reference documents (PDF/Word) to a class,
-- visible to every student who's joined it, to view or download for
-- practice. Flat list per class, no folders/versioning — same
-- posture as the rest of this app's file features.
-- ============================================================

create table if not exists class_materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  file_path text not null,   -- storage object path, needed to delete the object
  file_url text not null,    -- public URL, used to view/download
  file_name text not null,   -- original filename, shown next to the download
  file_type text not null,   -- mime type
  file_size int not null,    -- bytes
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_class_materials_class on class_materials(class_id);

-- Storage bucket ("class-materials", public read, 20MB limit, PDF/
-- Word mime types only) is created lazily by the upload route itself
-- the first time it's needed (see app/api/classes/[id]/materials/
-- route.ts's ensureBucket) rather than via a one-off script someone
-- has to remember to run (0011's "proctored-question-images" bucket
-- needed that extra step) — no manual Dashboard step for this one.
-- No storage.objects RLS policy is added for writes: the upload goes
-- through a server API route using the service-role client (same
-- pattern as every other write in this app), which bypasses RLS by
-- design. Public READ works via the bucket's own `public: true` flag.

alter table class_materials enable row level security;
-- No policies — service-role only, same posture as every other table.

-- ============================================================
-- 0017_notifications — 2026-09-20
-- A simple per-student notification feed for the student dashboard —
-- currently fired for two events (a class material upload, a new
-- proctored test) but deliberately generic (`type` + `href`) so more
-- event types can reuse the same table and UI later without another
-- migration. Fan-out on write: when a teacher creates one of these,
-- the API route inserts one row per class_members row for that class
-- (see lib/notifications.ts) — simpler and cheaper to read than
-- computing "what's new for this student" on every dashboard load.
-- ============================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  type text not null,      -- 'class_material' | 'proctored_test' (extendable — no enum, so a
                            -- future type never needs a migration to add)
  title text not null,     -- e.g. "New material: Week 4 sheet"
  href text not null,      -- where clicking it navigates
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Covers the student dashboard's two queries: the unread badge/list
-- (student_id, read) and "most recent N regardless of read state"
-- (student_id, created_at desc).
create index if not exists idx_notifications_student on notifications(student_id, read, created_at desc);

alter table notifications enable row level security;
-- No policies — service-role only, same posture as every other table.

-- ============================================================
-- 0018_student_auto_approve — 2026-09-22
-- Students no longer need admin approval to sign in: they can't see
-- or do anything until they join a class with a code, so the pending-
-- approval gate was only ever protecting teacher/admin-only actions,
-- which students don't have. Teachers still require approval
-- (unchanged) — only the student branch of handle_new_user's status
-- decision changes, from 'pending' to 'approved'. Also backfills
-- every already-pending student row to 'approved', so this applies
-- retroactively to anyone stuck waiting under the old rule, not just
-- future signups.
-- ============================================================

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
    (case
      when lower(new.email) = admin_email then 'approved'
      when requested_role = 'teacher' then 'pending'
      else 'approved'
    end)::user_status
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

update users set status = 'approved' where role = 'student' and status = 'pending';

-- ============================================================
-- 0019_admin_user_management — 2026-09-22
-- Lets an admin create a login (any role) directly, and reset any
-- user's password, without the normal self-serve sign-up/forgot-
-- password flows. Both actions set a real password via Supabase
-- Auth's admin API (app/api/admin/users/route.ts POST,
-- app/api/admin/users/[id]/reset-password/route.ts) — this column is
-- the only new state needed: it marks that the password currently on
-- the account was admin-set and must be replaced before the account
-- is used further. middleware.ts redirects to /change-password
-- whenever it's true; that page clears it back to false once the
-- user sets their own password (app/api/account/password-changed).
-- ============================================================

alter table users add column if not exists force_password_change boolean not null default false;

-- ============================================================
-- 0020_camera_proctoring — 2026-09-22
-- Adds three new violation types for the take screen's camera-based
-- checks (components/proctored-take/useCameraProctoring.ts): a phone
-- visible in frame, a second person/face visible, and sustained mouth
-- movement heuristically read as talking. All three run entirely
-- client-side via MediaPipe Tasks Vision (WASM runtime loaded from
-- jsDelivr, ML model weights from Google's MediaPipe model bucket —
-- see the hook for both URLs) — the camera frame is analyzed in the
-- browser and never uploaded or stored, same privacy posture as
-- every other check on this screen (see project.md's proctoring
-- "honest limits" section). A fourth check (head turned away from
-- the screen) is deliberately a toast warning only, not logged here —
-- per the task, it nudges the student rather than counting against
-- them, since head-pose-from-landmarks is the least precise of the
-- four signals.
--
-- Postgres requires ALTER TYPE ... ADD VALUE to run outside a
-- transaction that also uses the new value — this migration only adds
-- values, nothing here reads them, so it's safe to run as-is in the
-- Supabase SQL editor.
-- ============================================================

alter type proctored_violation_type add value if not exists 'phone_detected';
alter type proctored_violation_type add value if not exists 'multiple_people';
alter type proctored_violation_type add value if not exists 'talking_detected';

-- ============================================================
-- 0021_interview_prep_seed — 2026-09-22
-- Interview Prep launched as an empty, teacher-authored CRUD with no
-- starter content. This seeds five categories and four genuine,
-- 200+ word topic explanations each (20 total) — real "important
-- topics" reading material, not short Q&A trivia. `created_by` is
-- left null (system-authored, not tied to any one teacher account),
-- which the schema already allows.
--
-- Idempotent without a new unique constraint: categories key off the
-- existing unique `slug`; each topic insert is guarded by a
-- `where not exists` check on (category, topic name) instead of an
-- `on conflict`, so this is safe to run more than once without
-- risking a constraint-violation failure against whatever data may
-- already exist in a live project.
-- ============================================================

insert into interview_categories (name, slug, description, icon, display_order)
values
  ('OOP Concepts', 'oop', 'The four pillars of object-oriented programming, explained with real examples.', 'Boxes', 0),
  ('DBMS', 'dbms', 'Core relational database concepts every interview touches on.', 'Database', 1),
  ('Operating Systems', 'operating-systems', 'Processes, memory, deadlock, and scheduling — OS fundamentals.', 'Cpu', 2),
  ('Computer Networks', 'networking', 'How data actually moves between machines.', 'Network', 3),
  ('System Design', 'system-design', 'Building blocks for designing systems at scale.', 'Server', 4)
on conflict (slug) do nothing;

-- ---------- OOP Concepts ----------

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Encapsulation', $$Encapsulation is the practice of bundling an object's data (its fields) together with the methods that operate on that data, while restricting direct access to some of the object's internal state. In practice, this means marking fields as private and exposing controlled access through public getter and setter methods, so the class itself decides what values are valid rather than trusting every caller to enforce that discipline. For example, a BankAccount class might keep its balance field private and only allow it to change through a withdraw() method that checks for sufficient funds — no external code can set balance directly to an invalid negative number. The core benefit is that the internal implementation can change freely (switching from an array to a linked list, say) without breaking any code that depends on the class's public interface, as long as that interface's behavior stays the same. This is often called "information hiding," and it's what makes large codebases maintainable: a bug in how a class stores its data is contained to that class, not scattered across every place that touches it. Encapsulation also improves security, since sensitive fields can be made entirely inaccessible from outside, and it reduces coupling between classes, since consumers only need to know a class's public contract, not its internals. Most languages support this directly with access modifiers (private, protected, public in Java/C++, or a leading underscore convention in Python), and getters/setters can also add validation, logging, or lazy computation transparently, all invisible to the caller.$$, 'medium'
from interview_categories c where c.slug = 'oop'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Encapsulation');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Inheritance', $$Inheritance lets one class (the subclass or derived class) acquire the fields and methods of another (the superclass or base class), establishing an "is-a" relationship between them. A Car class might inherit from a more general Vehicle class, automatically getting fields like speed and methods like accelerate() without redefining them, while adding or overriding behavior specific to cars. The main value is code reuse: common behavior is written once in the base class and shared by every subclass, instead of being copy-pasted everywhere. It also enables polymorphism — code written against the base type (a function that takes a Vehicle) can transparently work with any subclass (Car, Truck, Motorcycle) without knowing which one it actually received at runtime. Most object-oriented languages support single inheritance (one direct parent) for classes, though some allow multiple inheritance of behavior through interfaces or traits, which avoids the "diamond problem" ambiguity that comes from inheriting the same method from two different parents. A common interview pitfall is overusing inheritance where composition would be more appropriate: inheritance creates a tight, permanent coupling between classes (a subclass breaks if its parent's implementation changes), so the standard guidance — "favor composition over inheritance" — suggests reaching for inheritance only for genuine is-a relationships, and building more flexible behavior by having a class hold a reference to another (a has-a relationship) in most other cases.$$, 'medium'
from interview_categories c where c.slug = 'oop'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Inheritance');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Polymorphism', $$Polymorphism, literally "many forms," is the ability for the same operation or method call to behave differently depending on the actual object it's invoked on. There are two main kinds. Compile-time (or static) polymorphism is achieved through method overloading — defining multiple methods with the same name but different parameter lists, so the compiler picks the right one based on the arguments at compile time. Runtime (or dynamic) polymorphism is achieved through method overriding: a subclass provides its own implementation of a method already defined in its superclass, and which version actually runs is decided at runtime based on the object's real type, not the type of the reference pointing to it. This is what makes a line like `Animal a = new Dog(); a.makeSound();` call Dog's makeSound() even though `a` is declared as an Animal — the runtime looks up the method on the object's actual class via a mechanism usually called "dynamic dispatch" or a virtual method table. Polymorphism is central to writing extensible code: a function that processes a list of Shape objects and calls shape.area() doesn't need to know or care whether each shape is a Circle, Square, or Triangle — each object's own area() implementation runs correctly. This is also the foundation of many design patterns (Strategy, Template Method, Visitor) and is why interfaces and abstract classes are so useful: they let you program against a contract rather than a concrete implementation.$$, 'medium'
from interview_categories c where c.slug = 'oop'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Polymorphism');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Abstraction', $$Abstraction means exposing only the essential features of an object or system while hiding the complex implementation details behind a simpler interface. When you press a car's accelerator pedal, you don't need to know how fuel injection, combustion timing, or the transmission actually work — you just need the car to speed up. In object-oriented programming, abstraction is typically implemented through abstract classes and interfaces: an abstract class can declare method signatures without providing a body, forcing every concrete subclass to supply its own implementation, while an interface goes further and defines a pure contract with no implementation at all. This lets you design systems around "what something does" rather than "how it does it," which is exactly what makes large systems manageable — a caller depends only on a stable, simple interface, while the implementation behind it is free to change. Abstraction is often confused with encapsulation, since both involve "hiding" something, but they solve different problems: encapsulation hides an object's internal state to protect its integrity, while abstraction hides implementation complexity to reduce what a caller needs to think about. A practical example: a List interface hides whether the underlying implementation is an array-backed list or a node-backed linked list — code written against List works with either, and the choice of implementation can be swapped later with zero changes to the calling code.$$, 'medium'
from interview_categories c where c.slug = 'oop'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Abstraction');

-- ---------- DBMS ----------

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Normalization', $$Normalization is the process of organizing a relational database's tables and columns to reduce data redundancy and avoid update anomalies — situations where the same fact is stored in multiple places and can go out of sync. It's done by progressively applying a series of rules called "normal forms." First Normal Form (1NF) requires every column to hold atomic (indivisible) values and every row to be unique — no repeating groups or comma-separated lists crammed into one field. Second Normal Form (2NF) builds on 1NF by requiring every non-key column to depend on the entire primary key, not just part of it — relevant when a table has a composite key. Third Normal Form (3NF) goes further, requiring that non-key columns depend only on the primary key and not on each other (eliminating "transitive dependencies") — for example, storing both a customer's city and their zip code in an orders table is a 3NF violation, since zip code determines city, not the order. Most production schemas aim for 3NF or the slightly stricter Boyce-Codd Normal Form (BCNF) as a practical target. The tradeoff is that normalization, while eliminating redundancy and anomalies, tends to increase the number of tables and requires more joins to reconstruct a full picture of an entity — which is why some read-heavy systems deliberately denormalize (reintroduce some redundancy) for performance, accepting the anomaly risk in exchange for fewer joins on hot query paths. Knowing when to normalize versus denormalize is a common system-design interview discussion.$$, 'medium'
from interview_categories c where c.slug = 'dbms'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Normalization');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'ACID Properties', $$ACID is an acronym describing four guarantees a database transaction should provide to keep data reliable, especially when multiple operations or multiple users touch the database concurrently. Atomicity means a transaction is all-or-nothing — if a transfer debits one account and credits another, either both operations succeed or neither does; a failure partway through rolls back everything, so the database never ends up with money "in transit" and lost. Consistency means a transaction takes the database from one valid state to another, never violating defined rules like constraints, foreign keys, or triggers. Isolation means concurrent transactions don't interfere with each other's intermediate states — from each transaction's point of view, it appears to run as if it were the only one happening, even though the database may actually be interleaving many transactions for performance; different isolation levels (read uncommitted, read committed, repeatable read, serializable) trade off strictness against performance. Durability means once a transaction commits, its changes survive even a crash immediately afterward — typically guaranteed by writing to a persistent transaction log before acknowledging the commit. Together, ACID is what lets you reason about a database transactionally instead of worrying about partial failures or race conditions corrupting your data; it's the standard most relational databases (PostgreSQL, MySQL, Oracle) are built around, in contrast to many NoSQL systems that relax some of these guarantees in exchange for scalability.$$, 'medium'
from interview_categories c where c.slug = 'dbms'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'ACID Properties');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Indexing', $$A database index is a separate data structure — usually a B-tree or a hash table — that stores a sorted or otherwise fast-to-search copy of one or more columns' values, each paired with a pointer back to the full row. Without an index, looking up a row by a column's value requires a full table scan: checking every single row, an O(n) operation that gets slower as the table grows. With an index on that column, the database can instead do something closer to a binary search, typically O(log n), jumping straight to the matching rows — the same benefit binary search has over linear search, just applied to database rows instead of an in-memory array. The tradeoff is that an index isn't free: it takes extra disk space, and every INSERT, UPDATE, or DELETE on the indexed column has to also update the index, which slows down writes. This is why indexes should be added deliberately — typically on columns used often in WHERE clauses, JOIN conditions, or ORDER BY, not blindly on every column. A primary key is automatically indexed by most databases; other indexes (called secondary indexes) are added explicitly. Composite indexes (spanning multiple columns) can speed up queries that filter on several columns together, but the column order in the index matters — a composite index on (a, b) helps queries filtering on a alone or a AND b, but not on b alone.$$, 'medium'
from interview_categories c where c.slug = 'dbms'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Indexing');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Types of SQL Joins', $$A JOIN combines rows from two or more tables based on a related column between them, and the type of join determines which rows survive when a match isn't found on one side. An INNER JOIN returns only the rows that have a matching value in both tables — if an order references a customer_id that doesn't exist in the customers table, that order simply doesn't appear in the result. A LEFT (OUTER) JOIN returns every row from the left table regardless of whether a match exists on the right, filling in NULLs for the right table's columns when there's no match — useful for "show me all customers, including ones with zero orders." A RIGHT (OUTER) JOIN is the mirror image, keeping every row from the right table instead. A FULL (OUTER) JOIN keeps every row from both tables, matching where possible and filling NULLs on whichever side has no match — effectively a LEFT JOIN and a RIGHT JOIN combined. A CROSS JOIN produces the Cartesian product of both tables — every row from the first paired with every row from the second — with no matching condition at all, which is rarely what you want unless you're deliberately generating combinations. Interviewers often ask you to reason about which rows survive a given join type on a small example table, since getting INNER vs. LEFT confused is one of the most common real-world SQL bugs.$$, 'medium'
from interview_categories c where c.slug = 'dbms'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Types of SQL Joins');

-- ---------- Operating Systems ----------

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Process vs Thread', $$A process is an independent, running instance of a program, with its own private memory space (code, data, heap, stack) that the operating system isolates from every other process — one process crashing or corrupting its memory doesn't directly affect another. A thread is a unit of execution within a process; a single process can have multiple threads, and all threads in the same process share that process's memory space (heap and global data), though each thread still gets its own stack and program counter. This shared-memory model is exactly why threads are lighter-weight than processes — creating a thread doesn't require setting up a whole new address space, just a new stack and scheduling entry, so context-switching between threads is faster than switching between processes. It's also exactly why threading is riskier: since threads share memory, one thread writing to shared data while another reads it, without proper synchronization via locks, mutexes, or semaphores, causes race conditions and can corrupt state in ways that are notoriously hard to reproduce and debug. Inter-process communication (IPC), by contrast, has to go through explicit OS-provided channels — pipes, sockets, shared memory segments, message queues — precisely because processes don't share memory by default. A practical way to think about it: use multiple processes when you want strong isolation and fault tolerance, and use multiple threads within one process when you want to parallelize work that needs to share data efficiently.$$, 'medium'
from interview_categories c where c.slug = 'operating-systems'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Process vs Thread');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Deadlock', $$A deadlock is a state where two or more processes (or threads) are each waiting on a resource held by another, forming a cycle where none of them can ever proceed — every participant is permanently blocked. The classic illustration is two processes each holding one of two required locks: process A holds lock 1 and waits for lock 2, while process B holds lock 2 and waits for lock 1; neither will ever release what it's holding, so both wait forever. Four conditions must all hold simultaneously for a deadlock to be possible, known as the Coffman conditions: mutual exclusion (a resource can only be held by one process at a time), hold and wait (a process holding one resource can request another), no preemption (a resource can't be forcibly taken away — it must be released voluntarily), and circular wait (a cycle of processes each waiting on the next). Breaking any one of these conditions prevents deadlock, which is exactly how most practical solutions work: enforcing a strict, global order in which locks must always be acquired (eliminates circular wait), using timeouts so a waiting process gives up and releases what it holds, or having the OS detect a cycle in a resource-allocation graph after the fact and forcibly kill or roll back one of the participants. Operating systems and database systems both deal with deadlock, though databases typically favor detection-and-rollback (aborting one transaction) over prevention, since transactions are expected to be retryable.$$, 'hard'
from interview_categories c where c.slug = 'operating-systems'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Deadlock');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Virtual Memory', $$Virtual memory is an abstraction that gives each process the illusion of having its own large, contiguous, private address space, even though the actual physical RAM is smaller and shared across every running process. The operating system, with hardware support from the Memory Management Unit (MMU), maps each process's virtual addresses to real physical addresses (or to disk) through page tables — memory is divided into fixed-size chunks called pages (commonly 4KB), and each page can be mapped independently. This indirection enables several powerful capabilities. First, isolation: two processes can both believe they own address 0x1000, but the MMU maps each to a completely different physical location, so neither can accidentally read or corrupt the other's memory. Second, it lets the total memory used by all processes exceed physical RAM: pages that haven't been used recently can be "swapped out" to disk, and brought back in ("paged in") on demand when accessed again — a page fault. Third, it enables memory-mapped files and lazy loading, since a page doesn't have to be backed by real content until it's actually touched. The tradeoff is performance: if a system doesn't have enough RAM and is constantly swapping pages in and out (called "thrashing"), performance collapses since disk access is orders of magnitude slower than RAM. Virtual memory is one of the most load-bearing abstractions in modern operating systems, underlying everything from process isolation to how executables are loaded.$$, 'hard'
from interview_categories c where c.slug = 'operating-systems'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Virtual Memory');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'CPU Scheduling', $$CPU scheduling is how an operating system decides which of several ready-to-run processes or threads gets the CPU next, since on a system with more runnable tasks than CPU cores, most of them have to wait their turn. The scheduler's goal is usually to balance several competing priorities: maximizing throughput, minimizing turnaround time, minimizing waiting time, and — for interactive systems — keeping response time low so the system feels snappy. Several classic algorithms illustrate the tradeoffs. First-Come-First-Served (FCFS) is the simplest — process the queue in arrival order — but a single long task can make everything behind it wait a long time (the "convoy effect"). Shortest Job First (SJF) minimizes average waiting time by always running the shortest task next, but requires knowing task lengths in advance and can starve long tasks indefinitely. Round Robin gives each process a small fixed time slice (a "quantum") before moving to the next, cycling through repeatedly — this is fair and keeps the system responsive, but too short a quantum wastes time on context-switching overhead, while too long a quantum degrades toward FCFS. Priority scheduling runs the highest-priority task first, but risks starving low-priority ones unless combined with "aging" (gradually raising a waiting task's priority over time). Real operating systems (like Linux's CFS) use more sophisticated hybrid approaches, but understanding these classic algorithms is the foundation interviewers expect.$$, 'medium'
from interview_categories c where c.slug = 'operating-systems'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'CPU Scheduling');

-- ---------- Computer Networks ----------

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'OSI Model', $$The OSI (Open Systems Interconnection) model is a conceptual, seven-layer framework describing how data moves from an application on one machine to an application on another, with each layer handling a distinct responsibility and talking only to the layers directly above and below it. From bottom to top: the Physical layer deals with raw bits over a medium; the Data Link layer packages bits into frames and handles node-to-node delivery on the same local network, including MAC addressing (this is where switches operate); the Network layer handles logical addressing and routing between different networks (IP addresses live here, and this is where routers operate); the Transport layer provides end-to-end communication with features like reliability and ordering (TCP) or a lighter, connectionless option (UDP); the Session layer manages and maintains connections between applications; the Presentation layer handles data translation, encryption, and compression so both ends agree on format; and the Application layer is where actual user-facing protocols live (HTTP, FTP, SMTP). In practice, real-world networking mostly follows the simpler four-layer TCP/IP model (Link, Internet, Transport, Application), which collapses several OSI layers together — but the OSI model remains the standard teaching and reference framework because it cleanly separates concerns and makes it easy to reason about where a given protocol or piece of hardware fits. Interviewers often use it to check whether a candidate understands that "the network" isn't one monolithic thing but a stack of independent, cooperating layers, each solving one problem.$$, 'medium'
from interview_categories c where c.slug = 'networking'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'OSI Model');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'TCP vs UDP', $$TCP (Transmission Control Protocol) and UDP (User Datagram Protocol) are both transport-layer protocols, but they make very different tradeoffs between reliability and speed. TCP is connection-oriented: before any data is sent, both ends perform a three-way handshake (SYN, SYN-ACK, ACK) to establish a connection. Once established, TCP guarantees reliable, ordered delivery — every packet is acknowledged, lost packets are automatically retransmitted, and packets that arrive out of order are reassembled in the correct sequence before being handed to the application. It also does flow control and congestion control, throttling the send rate to match what the receiver and network can handle. All of this reliability comes at the cost of overhead and latency. UDP, by contrast, is connectionless: there's no handshake, no acknowledgment, no guaranteed delivery, and no guaranteed ordering — a packet ("datagram") is just fired off, and it's entirely up to the application to handle loss or reordering if it cares. This makes UDP significantly faster and lower-overhead, which is exactly why it's used for real-time applications like video calls, live streaming, and online gaming, where a dropped or late packet is better handled by simply skipping it than by TCP's approach of pausing everything to retransmit and reorder. The general rule of thumb: use TCP when correctness and completeness matter more than speed, and UDP when speed and low latency matter more than perfect delivery.$$, 'medium'
from interview_categories c where c.slug = 'networking'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'TCP vs UDP');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'DNS (Domain Name System)', $$DNS (Domain Name System) is the internet's distributed system for translating human-readable domain names, like example.com, into the numeric IP addresses that computers actually use to route traffic to each other — it's often described as "the phone book of the internet." When a browser needs to resolve a domain, it typically first checks its local cache, then asks a DNS resolver (often run by your ISP or a public service), which itself may have the answer cached. If not, the resolver queries a hierarchy of servers: first a root server (which knows where to find servers for top-level domains like .com), then a TLD server for .com (which knows where to find the authoritative server for example.com), and finally the authoritative name server for example.com itself, which returns the actual IP address. This chain is usually completed in milliseconds and heavily cached at every level — each DNS record has a TTL (time-to-live) controlling how long it can be cached before it must be looked up again, which is why DNS changes can take time to "propagate" globally. DNS also supports several record types beyond the basic A record (IPv4 address): AAAA (IPv6 address), CNAME (an alias pointing to another domain), MX (mail server), and TXT (arbitrary text, often used for domain verification or email security like SPF/DKIM).$$, 'easy'
from interview_categories c where c.slug = 'networking'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'DNS (Domain Name System)');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'HTTP vs HTTPS', $$HTTP (HyperText Transfer Protocol) is the application-layer protocol that web browsers and servers use to request and send resources — pages, images, API responses — and it's fundamentally a plain-text, request-response protocol: a client sends a request with a method (GET, POST, etc.), headers, and optionally a body, and the server replies with a status code, headers, and a body. The problem with plain HTTP is that everything travels unencrypted, so anyone in a position to intercept the traffic can read or even modify it in transit. HTTPS (HTTP Secure) solves this by running HTTP over TLS (Transport Layer Security, the successor to SSL), which encrypts the connection before any HTTP data is exchanged. This involves a TLS handshake where the server presents a certificate (issued by a trusted Certificate Authority) proving its identity, and both sides negotiate a shared encryption key using asymmetric cryptography, which is then used for fast symmetric encryption of the actual data for the rest of the session. This gives HTTPS three key properties HTTP lacks: confidentiality (data can't be read in transit), integrity (data can't be silently modified), and authentication (you can verify you're actually talking to the real example.com, not an impostor). Modern browsers now flag plain HTTP sites as "not secure," and HTTPS is effectively the default expectation for any production website today.$$, 'easy'
from interview_categories c where c.slug = 'networking'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'HTTP vs HTTPS');

-- ---------- System Design ----------

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Load Balancing', $$A load balancer sits in front of a pool of backend servers and distributes incoming requests across them, so no single server gets overwhelmed while others sit idle — it's one of the most fundamental building blocks for scaling a system beyond what one machine can handle. Beyond just spreading load, a load balancer also improves availability: it can continuously health-check backend servers and automatically stop routing traffic to any that are down or unresponsive, so a single server failure doesn't take down the whole system. Common distribution strategies include round robin (cycle through servers in order), least connections (send the next request to whichever server currently has the fewest active connections), and IP hash (route a given client consistently to the same server, useful when session state is tied to a specific machine). Load balancers can operate at different layers: a Layer 4 load balancer works at the transport layer, routing based on IP and port without inspecting the actual content, which is fast but limited; a Layer 7 load balancer works at the application layer, and can make smarter routing decisions based on the actual HTTP request — the URL path, headers, or cookies. In larger systems, load balancers themselves are often deployed in redundant pairs to avoid becoming a single point of failure, and can be layered — a global load balancer directing traffic to regional load balancers, which then distribute within a region.$$, 'medium'
from interview_categories c where c.slug = 'system-design'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Load Balancing');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Caching', $$Caching means storing a copy of expensive-to-compute or expensive-to-fetch data somewhere faster to access, so repeated requests for the same thing can be served quickly instead of redoing the original work every time. The core insight that makes caching effective is locality of reference — in most real systems, a small subset of data is accessed far more often than the rest (the "hot" data), so caching just that subset captures most of the benefit. Caches can live at many layers of a system: in the browser, at a CDN (edge servers close to users caching static content), in-memory within an application, or as a dedicated caching layer in front of a database (like Redis or Memcached, caching query results so the database isn't hit on every read). The two hardest problems in caching are eviction and invalidation. Eviction is about what to remove when the cache is full — common policies include LRU (Least Recently Used) and LFU (Least Frequently Used). Invalidation is about making sure the cache doesn't serve stale data once the underlying source changes — approaches include setting a TTL so entries expire automatically, or explicitly invalidating/updating the cache entry whenever the underlying data is written (write-through or write-behind caching). Getting invalidation wrong is famously one of the trickiest problems in software — as the old joke goes, "there are only two hard things in computer science: cache invalidation and naming things."$$, 'medium'
from interview_categories c where c.slug = 'system-design'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Caching');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Horizontal vs Vertical Scaling', $$Scaling a system means increasing its capacity to handle more load, and there are two fundamentally different ways to do it. Vertical scaling ("scaling up") means making a single machine more powerful — adding more CPU, RAM, or faster disks to the existing server. It's simple, since the application usually needs no architectural changes to take advantage of more resources, but it has a hard ceiling: there's a maximum amount of CPU and RAM any single machine can physically have, and high-end hardware gets disproportionately expensive as you approach that ceiling. It's also a single point of failure — if that one powerful machine goes down, the whole system goes down with it. Horizontal scaling ("scaling out") means adding more machines and distributing load across all of them, typically behind a load balancer. This avoids the hard ceiling of vertical scaling and improves fault tolerance, since the failure of one server out of many doesn't take down the whole system. The tradeoff is complexity: the application has to be designed to run correctly across multiple machines, which raises real challenges around state (where does session data live if requests can hit any server?), data consistency across servers, and coordination. Most large-scale systems ultimately rely on horizontal scaling for their core capacity, while still using vertical scaling for components that are hard to distribute, like a primary database.$$, 'medium'
from interview_categories c where c.slug = 'system-design'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Horizontal vs Vertical Scaling');

insert into interview_questions (category_id, question, answer, difficulty)
select c.id, 'Database Sharding', $$Sharding is a technique for horizontally scaling a database by splitting its data across multiple separate database instances (shards), where each shard holds a distinct subset of the overall dataset, rather than every server holding a full copy. This is different from replication, which keeps identical full copies of the data on multiple servers for redundancy and read scaling — sharding instead partitions the data itself, so the combined shards together hold the complete dataset, and each individual shard holds less. The central design decision in sharding is choosing a shard key — the field used to decide which shard a given row belongs to. A common approach is hashing a key like user_id and using the hash to pick a shard, which tends to distribute data evenly; another is range-based sharding (e.g., users A-M on shard 1, N-Z on shard 2), which is simpler to reason about but can lead to uneven load if the ranges aren't naturally balanced. Sharding solves a real scaling problem — a single database server has a ceiling on storage and query throughput — but it introduces serious complexity: queries that need to join or aggregate data across shards become much harder and slower, a bad shard key choice can create "hot shards," and resharding when you add more shards later is a genuinely difficult operational problem. For this reason, sharding is usually treated as a scaling technique of last resort, reached for only after simpler options like caching, indexing, and read replicas have been exhausted.$$, 'hard'
from interview_categories c where c.slug = 'system-design'
and not exists (select 1 from interview_questions q where q.category_id = c.id and q.question = 'Database Sharding');
