-- ============================================================
-- 0030_teacher_only_folders — 2026-10-12
-- 1. Teacher-only DSA folders. A dsa_topics row with teacher_only =
--    true is visible in the teacher bank but every question filed in
--    it (questions.topic_id) is hidden from students — the student
--    bank (/api/progress) and the questions list filter them out.
--    Seeded with one such folder, "LeetCode Premium", which holds the
--    questions LeetCode only shows to paying subscribers (students
--    without Premium can't open them anyway).
-- 2. solution_video_language on questions: which language the
--    solution_video_url walkthrough (0029) is in — 'java' first
--    choice, 'python' where no Java video exists.
-- ============================================================

alter table dsa_topics add column if not exists teacher_only boolean not null default false;

insert into dsa_topics (name, teacher_only) values ('LeetCode Premium', true)
on conflict (name) do update set teacher_only = true;

alter table questions add column if not exists solution_video_language text;
update questions set solution_video_language = 'java'
where solution_video_url is not null and solution_video_language is null;
