-- ============================================================
-- 0024_proctored_theory_questions — 2026-09-25
-- Adds long-answer "theory" questions to the proctored question bank
-- alongside MCQs (same Subject/Set bank — a Set is just curated by a
-- teacher to hold one kind or the other, so a section built from it
-- naturally ends up type-pure without any DB-level enforcement).
--
-- A theory question can't be auto-graded like an MCQ, so it carries
-- its own `max_marks` (set by the teacher at authoring time) instead
-- of the fixed 1-point MCQ scoring, and its `min_word_count` is a
-- guideline shown to the student (not DB-enforced — the take screen
-- shows a live counter). Grading happens after submission: a teacher
-- awards marks per theory answer (proctored_test_attempts.theory_grades),
-- which lib/proctoredScoring.ts folds into the attempt's score once
-- entered. `grading_status` tracks whether that's happened yet, so the
-- teacher panel and student result screen can both show "pending
-- grading" instead of a misleadingly final score.
-- ============================================================

do $$ begin
  create type proctored_question_type as enum ('mcq', 'theory');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proctored_grading_status as enum ('not_required', 'pending', 'graded');
exception when duplicate_object then null; end $$;

alter table proctored_questions add column if not exists question_type proctored_question_type not null default 'mcq';
alter table proctored_questions add column if not exists min_word_count int;
alter table proctored_questions add column if not exists max_marks numeric;

alter table proctored_questions alter column options drop not null;
alter table proctored_questions alter column correct_option drop not null;

alter table proctored_questions drop constraint if exists proctored_questions_options_len;
alter table proctored_questions drop constraint if exists proctored_questions_correct_option_range;

-- One shape check covers both kinds: an MCQ must have its options/
-- correct_option (and no marks override — always worth 1 point); a
-- theory question must have max_marks and no options/correct_option.
alter table proctored_questions drop constraint if exists proctored_questions_type_shape;
alter table proctored_questions add constraint proctored_questions_type_shape check (
  (
    question_type = 'mcq'
    and options is not null
    and jsonb_array_length(options) >= 2
    and correct_option is not null
    and correct_option >= 0
    and correct_option < jsonb_array_length(options)
    and max_marks is null
  )
  or
  (
    question_type = 'theory'
    and options is null
    and correct_option is null
    and max_marks is not null
    and max_marks > 0
  )
);

-- `answers` already stores per-question values as jsonb (option index
-- for MCQ) — a theory answer is just a string in the same map, no
-- column change needed there.
--
-- `theory_grades` is the analogous map for marks a teacher has awarded
-- so far: { [question_id]: marks_awarded }. `max_score` is the total
-- possible marks for the attempt (mcq count + sum of theory max_marks)
-- — the denominator that belongs next to `score` once theory questions
-- are in the mix, since `total_questions` is just a question count and
-- no longer equals "max possible marks" when a theory question is
-- worth more than 1.
alter table proctored_test_attempts add column if not exists theory_grades jsonb not null default '{}';
alter table proctored_test_attempts add column if not exists grading_status proctored_grading_status not null default 'not_required';
alter table proctored_test_attempts add column if not exists max_score numeric;

-- Backfill: every existing scored attempt predates theory questions,
-- so its max possible marks was always exactly its question count.
update proctored_test_attempts set max_score = total_questions where max_score is null and total_questions is not null;
