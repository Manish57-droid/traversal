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
