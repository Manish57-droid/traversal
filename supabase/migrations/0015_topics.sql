-- ============================================================
-- 0015_topics — 2026-09-19
-- Adds real, teacher-creatable "topic" folders to the DSA and
-- Aptitude question banks (dsa_topics / aptitude_topics), mirroring
-- 0012's Subject/Set structure for Proctored. Both banks' existing
-- `topic` text column stays exactly as-is — every non-teacher-bank
-- reader (student practice routes, which even encode topic in a URL
-- segment, analytics, CSV/bulk exports) keeps reading it unchanged.
-- The new topic_id FK is purely an organizational layer for the
-- teacher-facing bank pages: it's kept in sync with `topic` (the text
-- always mirrors the linked topic's current name) by every write path
-- in app/api/questions and app/api/aptitude/questions, not by a DB
-- trigger — matching this codebase's existing app-level (not
-- RLS/trigger-level) enforcement posture for question writes.
-- ============================================================

create table if not exists dsa_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name)
);

alter table questions add column if not exists topic_id uuid references dsa_topics(id) on delete set null;
create index if not exists idx_questions_topic_id on questions(topic_id);

-- Backfill: one dsa_topics row per distinct existing topic value,
-- then point questions.topic_id at it. Rows with a null/blank topic
-- stay topic_id = null ("Uncategorized" in the folder UI) — same
-- meaning `topic is null` already had.
insert into dsa_topics (name)
select distinct trim(topic) from questions
where topic is not null and trim(topic) <> ''
on conflict (name) do nothing;

update questions q
set topic_id = t.id
from dsa_topics t
where q.topic_id is null and trim(q.topic) = t.name;

create table if not exists aptitude_topics (
  id uuid primary key default gen_random_uuid(),
  category aptitude_category not null,
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (category, name)
);

alter table aptitude_questions add column if not exists topic_id uuid references aptitude_topics(id) on delete set null;
create index if not exists idx_aptitude_questions_topic_id on aptitude_questions(topic_id);

-- aptitude_questions.topic is NOT NULL (always populated already), so
-- every row backfills cleanly.
insert into aptitude_topics (category, name)
select distinct category, trim(topic) from aptitude_questions
where trim(topic) <> ''
on conflict (category, name) do nothing;

update aptitude_questions q
set topic_id = t.id
from aptitude_topics t
where q.topic_id is null and q.category = t.category and trim(q.topic) = t.name;

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table dsa_topics enable row level security;
alter table aptitude_topics enable row level security;
-- No policies — service-role only, same posture as every other table.
