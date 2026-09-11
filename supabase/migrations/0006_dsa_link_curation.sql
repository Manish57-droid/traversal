-- ============================================================
-- 0006_dsa_link_curation — 2026-09-11
-- A bulk seed of DSA problem titles/topics (the well-known ~450-style
-- sheet) was requested, matched against dsa.apnacollege.in and
-- hynts.in for real judge links. Neither site's actual problem data
-- was fetchable (hynts.in's list is behind sign-up; apnacollege.in's
-- public sheet is a different, smaller list with JS/login-gated
-- per-problem links) — rather than fabricate URLs, seeded questions
-- with no real link are inserted with `needs_link_curation = true`
-- and no `url`, for a teacher to fill in later through the normal
-- question-bank UI. See changelog.md for the full story.
-- ============================================================

alter table questions add column if not exists needs_link_curation boolean not null default false;
alter table questions alter column url drop not null;

-- A question flagged for curation has no url yet by definition; a
-- question NOT flagged must have a real one. Keeps the two states from
-- silently drifting apart (e.g. a flagged row that's never followed up
-- looking identical to a normal one once curated, or vice versa).
alter table questions drop constraint if exists questions_url_required_unless_flagged;
alter table questions add constraint questions_url_required_unless_flagged
  check (needs_link_curation or url is not null);

create index if not exists idx_questions_needs_link_curation on questions(needs_link_curation) where needs_link_curation;
