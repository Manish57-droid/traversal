-- ============================================================
-- 0008_proctored_results_release — 2026-09-11
-- Teacher-controlled result release for Proctored Tests. Students can
-- always see their own score immediately after submitting (see
-- app/api/proctored-tests/[id]/attempts/[attemptId]/submit), but the
-- full per-question right/wrong + explanation review
-- (app/student/proctored-tests/[testId]/review) stays gated behind
-- this flag until the teacher explicitly releases it — same
-- leak-prevention posture as the rest of the exam-taking flow.
-- ============================================================

alter table proctored_tests add column if not exists results_released boolean not null default false;
