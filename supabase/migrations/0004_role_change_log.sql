-- ============================================================
-- 0004_role_change_log — 2026-09-11
-- An admin account's role was found silently changed to 'teacher'
-- with no record of how. Audit found no ID-mixup bug — PATCH
-- /api/admin/users always targets the row's own id correctly — but
-- nothing stopped (or logged) an admin accidentally changing their
-- own role via that same generic endpoint (see changelog.md). This
-- table makes any future role change traceable after the fact; it
-- doesn't prevent anything by itself (a `id === admin.id` guard was
-- added at the application layer instead — see app/api/admin/users/
-- route.ts).
-- ============================================================

create table if not exists role_change_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references users(id) on delete cascade,
  previous_role user_role not null,
  new_role user_role not null,
  changed_by uuid references users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_role_change_log_target on role_change_log(target_user_id);

-- ---------- ROW LEVEL SECURITY (this migration's table only) ----------
alter table role_change_log enable row level security;
-- No policies — service-role only, same posture as every other table.
