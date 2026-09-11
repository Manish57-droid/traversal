-- ============================================================
-- 0005_interview_prep — 2026-09-11
-- Interview Preparation module: categories organized by
-- language/technology (C++, Java, Python, SQL, DBMS, OS, Networking,
-- System Design, OOP, JavaScript — see project.md §3/§5), each holding
-- a flat list of question+answer pairs. Content is authored by
-- teacher/admin through the app's own CRUD UI, not imported from
-- anywhere — this migration creates empty tables only.
-- ============================================================

create table if not exists interview_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text not null,              -- a lucide-react icon component name, e.g. "Code2"
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Reuses the existing question_difficulty enum (easy/medium/hard/unknown)
-- from the DSA module — no need for a second difficulty type.
create table if not exists interview_questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references interview_categories(id) on delete cascade,
  question text not null,
  answer text not null,            -- plain text / simple markdown; no rich editor in v1
  difficulty question_difficulty not null default 'unknown',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_questions_category on interview_questions(category_id);

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table interview_categories enable row level security;
alter table interview_questions enable row level security;
-- No policies — service-role only, same posture as every other table.
