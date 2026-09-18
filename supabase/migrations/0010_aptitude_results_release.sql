-- ============================================================
-- 0010_aptitude_results_release — 2026-09-18
-- Aptitude Test Mode (timed, teacher-assigned, scored) was designed
-- alongside Aptitude practice mode but deferred — schema existed
-- (aptitude_tests, aptitude_test_questions, aptitude_assignments,
-- aptitude_test_attempts) with nothing built on top of it. This adds
-- the one column that didn't exist yet: a teacher-controlled results
-- release gate, matching the same mechanism Proctored Tests already
-- uses (see 0008_proctored_results_release.sql) — students always see
-- their own score immediately on submit, but the full per-question
-- review stays hidden until the teacher explicitly releases it.
-- ============================================================

alter table aptitude_tests add column if not exists results_released boolean not null default false;
