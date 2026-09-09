-- ============================================================
-- 0003_class_collaboration — 2026-09-09
-- A class has exactly one owner (classes.teacher_id, unchanged) plus
-- zero or more approved collaborator teachers with equal rights to the
-- owner. The owner is never duplicated into class_collaborators — that
-- table is only for non-owner teachers who were granted access.
-- ============================================================

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

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table class_access_requests enable row level security;
alter table class_collaborators enable row level security;
-- No policies — service-role only, same posture as 0001.

-- NOTE (added after the fact, see 0004 in a future migration if this
-- needs a real fix at the DB level): adding class_collaborators here
-- gave PostgREST a second many-to-many path between `classes` and
-- `users` (on top of the one `class_members` already created), so any
-- query embedding `users` directly off `classes` without naming the
-- FK explicitly (`users!classes_teacher_id_fkey(...)`) became
-- ambiguous and fails with PGRST201. Fixed at the query level in
-- app/api/classes/browse/route.ts — see changelog.md's entry for the
-- "teacher can't see other teachers' classes" bug.
