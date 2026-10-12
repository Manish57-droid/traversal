-- ============================================================
-- 0029_dsa_solution_videos — 2026-10-12
-- A YouTube Java solution walkthrough per DSA question, shown as a
-- "Watch" link beside the title on the student DSA list. Nullable —
-- only populated where a matching Java video exists (backfilled for
-- questions with any company frequency > 60, picking the most-viewed
-- video whose title names the exact problem and says "Java").
-- ============================================================

alter table questions add column if not exists solution_video_url text;
