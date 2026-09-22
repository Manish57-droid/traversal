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
