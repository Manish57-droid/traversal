-- ============================================================
-- 0023_interview_prep_welcome_tip — 2026-09-22
-- A one-time, dismissible banner nudging a NEW student toward
-- Interview Preparation for quick topic revision (see
-- components/WelcomeInterviewPrepTip.tsx, shown site-wide via
-- app/student/layout.tsx). Scoped to genuinely new signups, not
-- retroactively to every existing student, via a two-step default:
--   1. ADD COLUMN ... default true backfills every row that already
--      exists at migration time to "already seen" (so nothing changes
--      for current students on their next login).
--   2. ALTER COLUMN ... set default false changes the column's
--      go-forward default — handle_new_user's insert (schema.sql)
--      never lists this column explicitly, so every new signup after
--      this migration picks up the new default and starts unseen.
-- ============================================================

alter table users add column if not exists interview_prep_tip_seen boolean not null default true;
alter table users alter column interview_prep_tip_seen set default false;
