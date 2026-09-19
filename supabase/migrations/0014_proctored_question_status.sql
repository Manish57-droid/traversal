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
