-- ============================================================
-- 0027_dsa_companies — 2026-09-28
-- Company tagging for DSA questions ("asked by Adobe, TCS,
-- Accenture..."), with a per-(question, company) frequency. Mirrors
-- two existing patterns in this codebase rather than inventing a new
-- one: dsa_topics (0015_topics.sql) for the standalone reference
-- table shape, and question_set_items (0001_initial_schema.sql) for
-- the many-to-many junction-with-a-payload-column shape.
-- ============================================================

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists question_companies (
  question_id uuid not null references questions(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  frequency int,
  primary key (question_id, company_id)
);

create index if not exists idx_question_companies_company on question_companies(company_id);
create index if not exists idx_question_companies_question on question_companies(question_id);

-- A small starter set so the picker isn't empty on first use — teachers
-- add more from the new "Manage companies" list.
insert into companies (name) values
  ('Adobe'), ('TCS'), ('Accenture'), ('Google'), ('Amazon'),
  ('Microsoft'), ('Infosys'), ('Wipro'), ('Flipkart')
on conflict (name) do nothing;

-- ---------- ROW LEVEL SECURITY (this migration's tables only) ----------
alter table companies enable row level security;
alter table question_companies enable row level security;
-- No policies — service-role only, same posture as every other table.
