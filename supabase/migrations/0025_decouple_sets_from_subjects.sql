-- ============================================================
-- 0025_decouple_sets_from_subjects — 2026-09-26
-- Un-nests Sets from Subjects. Previously a Set belonged to exactly
-- one Subject (proctored_sets.subject_id NOT NULL), and a Question's
-- subject was only known indirectly through its Set — which forced
-- every Set to be single-subject even when a teacher wanted to build
-- a mixed-topic exam bundle. Subject is a content-category tag that
-- now lives directly on the Question; a Set is just a named,
-- optional, many-to-many bundle of questions, free to mix subjects
-- or not, entirely at the teacher's discretion. A test Section drops
-- the Subject concept entirely — it only ever picked Sets anyway.
--
-- needs_categorization changes meaning: it used to mean "has no Set";
-- it now means "has no Subject" — Subject is the thing every question
-- must have, Set membership is optional and flexible.
-- ============================================================

-- ---------- Question -> Subject (direct, required) ----------
alter table proctored_questions add column if not exists subject_id uuid references proctored_subjects(id) on delete set null;

update proctored_questions q
set subject_id = ps.subject_id
from proctored_sets ps
where q.set_id = ps.id and q.subject_id is null;

-- ---------- Question <-> Set (many-to-many) ----------
create table if not exists proctored_question_sets (
  question_id uuid not null references proctored_questions(id) on delete cascade,
  set_id uuid not null references proctored_sets(id) on delete cascade,
  primary key (question_id, set_id)
);

create index if not exists idx_proctored_question_sets_set on proctored_question_sets(set_id);
create index if not exists idx_proctored_question_sets_question on proctored_question_sets(question_id);

insert into proctored_question_sets (question_id, set_id)
select id, set_id from proctored_questions where set_id is not null
on conflict do nothing;

-- ---------- Drop old set_id-keyed constraint/trigger ----------
-- Categorization used to be judged by set_id; a Set's contents can no
-- longer be checked with a single-column CHECK, and a question's
-- categorization no longer depends on Set membership at all.
alter table proctored_questions drop constraint if exists proctored_questions_set_required_unless_flagged;
drop trigger if exists trg_proctored_sets_before_delete on proctored_sets;
drop function if exists proctored_flag_uncategorized_before_set_delete();

update proctored_questions set needs_categorization = (subject_id is null);

alter table proctored_questions add constraint proctored_questions_subject_required_unless_flagged
  check (needs_categorization or subject_id is not null);

create index if not exists idx_proctored_questions_subject on proctored_questions(subject_id);

-- Losing a Subject (delete) now flags its questions uncategorized —
-- same posture as the old Set-delete trigger, just re-targeted.
create or replace function proctored_flag_uncategorized_before_subject_delete()
returns trigger as $$
begin
  update proctored_questions set needs_categorization = true where subject_id = old.id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_proctored_subjects_before_delete on proctored_subjects;
create trigger trg_proctored_subjects_before_delete
  before delete on proctored_subjects
  for each row execute function proctored_flag_uncategorized_before_subject_delete();

-- ---------- Drop the now-superseded columns ----------
alter table proctored_questions drop column if exists set_id;
alter table proctored_sets drop constraint if exists proctored_sets_subject_id_name_key;
alter table proctored_sets drop column if exists subject_id;
alter table proctored_test_sections drop column if exists subject_id;
