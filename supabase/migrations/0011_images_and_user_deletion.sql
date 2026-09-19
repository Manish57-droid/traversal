-- ============================================================
-- 0011_images_and_user_deletion — 2026-09-19
-- Two independent additions:
--   1. Optional image_url on proctored_questions (Step 2).
--   2. Admin user-deletion audit log + an atomic cascade-delete
--      function (Step 3).
-- ============================================================

-- ---------- Proctored question images ----------
alter table proctored_questions add column if not exists image_url text;

-- Storage bucket ("proctored-question-images", public read, 5MB
-- limit, image mime types only) was created via a one-off script
-- using the service-role client's `supabase.storage.createBucket()` —
-- confirmed this is scriptable, no manual Dashboard step needed.
-- No storage.objects RLS policy is added for writes: the upload goes
-- through a server API route using the service-role client (same
-- pattern as every other write in this app), which bypasses RLS by
-- design — see lib/supabase/server.ts. Storage's default-deny RLS
-- (enabled automatically on storage.objects) already blocks any
-- direct client-side upload attempt with the anon key, with zero
-- policies needed; public READ still works via the bucket's own
-- `public: true` flag, independent of RLS.

-- ---------- Admin user deletion: audit log ----------
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
alter table user_deletion_log enable row level security;

-- ---------- Admin user deletion: atomic cascade ----------
-- Four content tables use `created_by ... on delete set null` (by
-- original design: removing whoever authored a DSA/Aptitude/Interview
-- Prep/Proctored question shouldn't silently orphan-but-keep it in
-- every deletion path in the app). This feature specifically wants
-- those questions actually gone when an admin deletes the account
-- through this flow — rather than loosening the FK constraints
-- themselves (which would change behavior for every future deletion
-- path, not just this one), this function explicitly deletes each
-- author's content first, then deletes the users row. Every other FK
-- to users(id) already cascades correctly on its own (classes.teacher_id,
-- class_members.student_id, progress.student_id, test attempts, etc.)
-- so deleting the users row here is what actually removes everything
-- scoped to their owned classes and their own enrollment/attempt
-- history — no other constraint changes needed.
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
  -- Deleting the users row cascades to every other FK referencing it
  -- (owned classes and everything scoped to them, class membership,
  -- progress/attempt/practice history, collaborator grants, etc.)
  -- via the CASCADE constraints already in schema.sql.
  delete from users where id = p_user_id;
end;
$$;
