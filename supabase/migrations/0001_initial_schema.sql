-- ============================================================
-- 0001_initial_schema — 2026-09-06 (approx., retroactively split out)
-- Users/auth/roles, classes, the DSA question bank, question sets,
-- assignments, and per-student progress. This was the original,
-- single schema.sql before per-migration files were adopted.
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
-- A pasted problem link, normalized with detected platform.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  platform question_platform not null default 'other',
  difficulty question_difficulty not null default 'unknown',
  topic text,                          -- e.g. "Arrays", "Graphs", "DP"
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_platform on questions(platform);
create index if not exists idx_questions_topic on questions(topic);

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

drop policy if exists "users can read own row" on users;
create policy "users can read own row" on users
  for select using (auth.uid() = id);

-- No other policies are created for the anon/authenticated roles, so
-- every other table is unreachable except through the service-role key.
