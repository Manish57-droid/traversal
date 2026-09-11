-- ============================================================
-- 0009_proctored_violation_increment — 2026-09-11
-- Found during live verification of the test-taking screen: two
-- violations logged within the same second (e.g. a fullscreen exit
-- immediately followed by a tab switch) raced on a read-then-write
-- increment in application code — both requests read the same
-- starting violation_count, both computed +1, and the second write
-- clobbered the first. Two violation rows ended up in
-- proctored_violations, but violation_count only advanced by one, so
-- the auto-submit-at-threshold check never fired. A single atomic
-- UPDATE ... SET x = x + 1 done inside Postgres closes this race
-- (the JS client library has no atomic increment of its own for a
-- plain column).
-- ============================================================

create or replace function increment_proctored_violation_count(p_attempt_id uuid)
returns int
language sql
as $$
  update proctored_test_attempts
  set violation_count = violation_count + 1
  where id = p_attempt_id
  returning violation_count;
$$;
