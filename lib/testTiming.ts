// Shared server-authoritative timer math for every timed-test mode
// (Proctored Tests, Aptitude Test Mode) — kept in one place so the
// "remaining time is computed from started_at, never trusted from the
// client" rule can't drift between the two.
export function remainingSeconds(startedAt: string, timeLimitMinutes: number): number {
  const deadline = new Date(startedAt).getTime() + timeLimitMinutes * 60_000;
  return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
}
