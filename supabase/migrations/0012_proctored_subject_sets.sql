-- ============================================================
-- 0012_proctored_subject_sets — 2026-09-19
-- Restructures the proctored question bank into Subject -> Set ->
-- Question (shared bank, any teacher/admin can create/edit — same
-- spirit as the DSA/Aptitude banks, not class-scoped). Existing
-- proctored_questions rows predate this structure, so set_id is
-- nullable and a needs_categorization flag (same pattern as DSA's
-- needs_link_curation in 0006) marks legacy rows for a teacher to
-- assign a set later, rather than forcing a backfill or losing them.
-- Test-creation flow changes (picking subjects/sets into sections) are
-- a separate follow-up — this migration is bank organization only.
-- ============================================================

create table if not exists proctored_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists proctored_sets (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references proctored_subjects(id) on delete cascade,
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (subject_id, name)
);

create index if not exists idx_proctored_sets_subject on proctored_sets(subject_id);

alter table proctored_questions add column if not exists set_id uuid references proctored_sets(id) on delete set null;
alter table proctored_questions add column if not exists needs_categorization boolean not null default true;

-- Existing rows have no set_id at migration time, so they're legacy/
-- uncategorized by definition; new rows created through the updated
-- form will always supply a set_id and needs_categorization = false.
update proctored_questions set needs_categorization = true where set_id is null;

-- Same drift-prevention shape as questions_url_required_unless_flagged
-- in 0006: a question not flagged for categorization must have a set;
-- a flagged one has none yet by definition.
alter table proctored_questions drop constraint if exists proctored_questions_set_required_unless_flagged;
alter table proctored_questions add constraint proctored_questions_set_required_unless_flagged
  check (needs_categorization or set_id is not null);

create index if not exists idx_proctored_questions_needs_categorization on proctored_questions(needs_categorization) where needs_categorization;
create index if not exists idx_proctored_questions_set on proctored_questions(set_id);

-- Deleting a set cascades set_id -> NULL on its questions (FK above),
-- which would violate proctored_questions_set_required_unless_flagged
-- unless needs_categorization flips to true first. This runs before
-- the cascade so the row is already consistent by the time set_id
-- goes null (also covers a subject delete, which cascades through its
-- sets and fires this once per set).
create or replace function proctored_flag_uncategorized_before_set_delete()
returns trigger as $$
begin
  update proctored_questions set needs_categorization = true where set_id = old.id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_proctored_sets_before_delete on proctored_sets;
create trigger trg_proctored_sets_before_delete
  before delete on proctored_sets
  for each row execute function proctored_flag_uncategorized_before_set_delete();

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table proctored_subjects enable row level security;
alter table proctored_sets enable row level security;
-- No policies — service-role only, same posture as every other table.
