export type UserRole = "student" | "teacher" | "admin";

export type UserStatus = "pending" | "approved" | "rejected";

export type QuestionStatus = "not_started" | "attempted" | "completed";

export type QuestionDifficulty = "easy" | "medium" | "hard" | "unknown";

export type QuestionPlatform =
  | "leetcode"
  | "codechef"
  | "codeforces"
  | "geeksforgeeks"
  | "hackerrank"
  | "other";

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Question {
  id: string;
  title: string;
  /** Null only when `needs_link_curation` is true — a bulk-seeded
   * title awaiting a teacher to add the real judge link. */
  url: string | null;
  platform: QuestionPlatform;
  difficulty: QuestionDifficulty;
  topic: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  needs_link_curation: boolean;
}

export interface ProgressRow {
  id: string;
  student_id: string;
  question_id: string;
  status: QuestionStatus;
  completed_at: string | null;
  updated_at: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  question_set_id: string;
  class_id: string;
  assigned_by: string;
  due_date: string | null;
  created_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  teacher_id: string;
  join_code: string;
  created_at: string;
}

// Convenience shape returned by /api/progress dashboard queries.
export interface QuestionWithProgress extends Question {
  status: QuestionStatus;
}

export interface StudentProgressSummary {
  student_id: string;
  full_name: string | null;
  email: string;
  total_assigned: number;
  completed: number;
  attempted: number;
  not_started: number;
}

// ---------- Aptitude module ----------

export type AptitudeCategory = "quant" | "logical" | "verbal";

export type AptitudeAttemptStatus = "in_progress" | "submitted" | "expired";

export interface AptitudeQuestion {
  id: string;
  category: AptitudeCategory;
  topic: string;
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  difficulty: QuestionDifficulty;
  created_by: string | null;
  created_at: string;
}

export interface AptitudePracticeHistory {
  id: string;
  student_id: string;
  question_id: string;
  attempts_count: number;
  last_selected_option: number | null;
  last_correct: boolean | null;
  last_attempted_at: string | null;
  first_correct_at: string | null;
  updated_at: string;
}

export interface AptitudeTest {
  id: string;
  name: string;
  description: string | null;
  category: AptitudeCategory | null;
  time_limit_minutes: number;
  negative_marking_fraction: number;
  created_by: string;
  created_at: string;
  results_released: boolean;
}

export interface AptitudeTestWithQuestions extends AptitudeTest {
  question_count: number;
  /** Only present when listed in the context of one class assignment
   * (aptitude_tests itself has no class_id — see aptitude_assignments). */
  due_date?: string | null;
  assignment_id?: string;
}

export interface AptitudeTestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  status: AptitudeAttemptStatus;
  answers: Record<string, number>;
  score: number | null;
  total_questions: number | null;
  time_taken_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
}

/** Sanitized for the student while an attempt is in progress — never
 * includes `correct_option`/`explanation` (only the review endpoint,
 * gated on results_released, ever sends those). */
export interface AptitudeAttemptQuestion {
  id: string;
  prompt: string;
  options: string[];
  difficulty: QuestionDifficulty;
}

/** One row of the teacher's per-test results rollup. */
export interface AptitudeAttemptRollup {
  attempt_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: AptitudeAttemptStatus;
  score: number | null;
  total_questions: number | null;
  time_taken_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
}

// ---------- Proctored Tests ----------
// A separate, class-scoped exam type with its own MCQ question bank
// (not shared with Aptitude or DSA). Schema/creation only for now —
// the secure test-taking screen is a follow-up task.

export type ProctoredAttemptStatus = "in_progress" | "submitted" | "auto_submitted_violation" | "expired";

export type ProctoredViolationType = "tab_switch" | "fullscreen_exit" | "copy_attempt" | "camera_off";

export type ProctoredTimerMode = "combined" | "per_section";

export type ProctoredSectionAttemptStatus = "not_started" | "in_progress" | "completed";

export interface ProctoredQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  difficulty: QuestionDifficulty;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  /** Optional — most questions won't have one. */
  image_url: string | null;
  /** Null only for legacy questions predating the Subject -> Set
   * structure, or a set that was later deleted — see needs_categorization. */
  set_id: string | null;
  set_name: string | null;
  subject_id: string | null;
  subject_name: string | null;
  /** True when set_id is null and this question is awaiting a teacher
   * to assign it a set — same pattern as DSA's needs_link_curation. */
  needs_categorization: boolean;
}

// ---------- Proctored question bank: Subjects & Sets ----------
// Shared bank, not class-scoped — any teacher/admin can create and
// manage these, same spirit as the DSA/Aptitude banks.

export interface ProctoredSubject {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface ProctoredSet {
  id: string;
  subject_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface ProctoredSetWithCount extends ProctoredSet {
  question_count: number;
}

export interface ProctoredSubjectWithSets extends ProctoredSubject {
  sets: ProctoredSetWithCount[];
}

export interface ProctoredTest {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
  /** Used as the overall exam timer when timer_mode = 'combined';
   * ignored (but still a required, meaningful fallback) otherwise. */
  time_limit_minutes: number;
  negative_marking_fraction: number;
  max_violations_before_autosubmit: number;
  require_camera: boolean;
  require_mic: boolean;
  created_by: string;
  created_at: string;
  results_released: boolean;
  timer_mode: ProctoredTimerMode;
  allow_free_section_navigation: boolean;
}

export interface ProctoredTestWithQuestions extends ProctoredTest {
  question_count: number;
}

// ---------- Proctored test sections ----------
// A test is always one or more sections (every test, including
// pre-restructure ones, has at least one — see migration 0013's
// legacy-wrap backfill). A section's questions come from whichever
// Sets are enabled for it (ProctoredTestSectionSets), resolved live —
// see lib/proctoredSections.ts.

export interface ProctoredTestSection {
  id: string;
  test_id: string;
  name: string;
  /** Null for a legacy default section (predates Subject/Set); a
   * section created through the section-aware flow always sets this. */
  subject_id: string | null;
  position: number;
  /** Null = uses the test's combined timer, not its own. */
  time_limit_minutes: number | null;
  /** Null = inherit proctored_tests.negative_marking_fraction. */
  negative_marking_fraction: number | null;
  calculator_enabled: boolean;
}

export interface ProctoredTestSectionWithMeta extends ProctoredTestSection {
  subject_name: string | null;
  set_ids: string[];
  question_count: number;
}

export interface ProctoredSectionAttempt {
  id: string;
  attempt_id: string;
  section_id: string;
  started_at: string | null;
  submitted_at: string | null;
  status: ProctoredSectionAttemptStatus;
}

/** Per-question `visited`/`marked_for_review` — the only two booleans
 * that don't already live somewhere else (`answered` is derived from
 * `answers[question_id] !== undefined`). Persisted so the take
 * screen's 6-state palette survives a resync, a resumed attempt, or a
 * violation-triggered auto-submit, same reasoning as `answers` itself. */
export interface ProctoredQuestionStatus {
  visited: boolean;
  marked_for_review: boolean;
}

export interface ProctoredTestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  status: ProctoredAttemptStatus;
  answers: Record<string, number>;
  question_status: Record<string, ProctoredQuestionStatus>;
  score: number | null;
  total_questions: number | null;
  violation_count: number;
  time_taken_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
}

/** A section's rules as the student needs them — resolved values (the
 * actual negative-marking number that applies, not "inherited"), for
 * the pre-test rules screen and the take screen's section tabs. */
export interface ProctoredTestSectionSummary {
  id: string;
  name: string;
  position: number;
  time_limit_minutes: number | null;
  resolved_negative_marking_fraction: number;
  calculator_enabled: boolean;
  question_count: number;
}

/** Sanitized for the student while an attempt is in progress — never
 * includes `correct_option`/`explanation` (see the review endpoint,
 * which is the only place those are ever sent, and only post-release).
 * Flat across all sections (see lib/proctoredSections.ts) — each
 * question tags its own section so a section-aware take screen can
 * group them without another round trip. */
export interface ProctoredAttemptQuestion {
  id: string;
  prompt: string;
  options: string[];
  difficulty: QuestionDifficulty;
  image_url: string | null;
  section_id: string;
  section_name: string;
}

export interface ProctoredViolationBreakdown {
  attempt_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: ProctoredAttemptStatus;
  score: number | null;
  total_questions: number | null;
  violation_count: number;
  started_at: string;
  submitted_at: string | null;
  violations_by_type: Partial<Record<ProctoredViolationType, number>>;
}

// ---------- Proctored Tests: leaderboards ----------

/** One ranked row — score DESC, submitted_at ASC tiebreak (see
 * lib/leaderboard.ts). Two rows share a `rank` only if both score AND
 * submitted_at are identical (competition ranking: 1, 1, 3 — not 1, 2, 3). */
export interface ProctoredLeaderboardRow {
  rank: number;
  attempt_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  score: number;
  total_questions: number | null;
  time_taken_seconds: number | null;
  submitted_at: string;
}

/** One row of a student's own proctored-test history — rank/score are
 * only ever non-null when the test's results_released is true; the
 * server never sends them otherwise (not just a UI hide). */
export interface StudentProctoredTestRow {
  id: string;
  name: string;
  description: string | null;
  class_name: string;
  time_limit_minutes: number;
  results_released: boolean;
  attempt_status: ProctoredAttemptStatus | "not_started";
  score: number | null;
  total_questions: number | null;
  submitted_at: string | null;
  rank: number | null;
}

/** The student dashboard's "Top 5" widget for their most recently
 * completed AND released test. `test` is null when no such test exists
 * yet. `me` is null when the student's own row is already inside `top`
 * (no need to show it twice — see `me_in_top`); otherwise it's their
 * row, always present once `test` is non-null. */
export interface ProctoredLeaderboardWidget {
  test: { id: string; name: string; class_name: string } | null;
  top: ProctoredLeaderboardRow[];
  me: ProctoredLeaderboardRow | null;
  me_in_top: boolean;
}

// ---------- Teacher analytics dashboard ----------

/** Class-wide totals behind the two summary charts. */
export interface ClassAnalyticsSummary {
  dsa: { completed: number; attempted: number; not_started: number };
  aptitude: { attempted: number; correct: number; incorrect: number };
}

/** One row of the sortable per-student table. */
export interface StudentAnalyticsRow {
  student_id: string;
  full_name: string | null;
  email: string;
  dsa_completion_pct: number;
  aptitude_accuracy_pct: number;
  total_attempted: number;
}

export interface StudentDsaDetailRow {
  question_id: string;
  title: string;
  platform: QuestionPlatform;
  status: QuestionStatus;
  updated_at: string;
  completed_at: string | null;
}

export interface StudentAptitudeDetailRow {
  question_id: string;
  topic: string;
  category: AptitudeCategory;
  last_correct: boolean | null;
  attempts_count: number;
  first_correct_at: string | null;
}

export interface StudentAnalyticsDetail {
  student_id: string;
  full_name: string | null;
  email: string;
  dsa: StudentDsaDetailRow[];
  aptitude: StudentAptitudeDetailRow[];
}

// ---------- Class collaboration ----------

export type ClassRelationship = "owner" | "collaborator" | "admin" | "pending" | "none";

/** One row of the "browse all classes" list. */
export interface ClassBrowseRow {
  id: string;
  name: string;
  owner_name: string;
  student_count: number;
  relationship: ClassRelationship;
}

export interface ClassAccessRequest {
  id: string;
  requesting_teacher_id: string;
  requested_at: string;
  full_name: string | null;
  email: string;
}

/** Same shape, with the class identified — used by the admin-wide view. */
export interface AdminClassAccessRequest extends ClassAccessRequest {
  class_id: string;
  class_name: string;
}

export interface ClassCollaborator {
  teacher_id: string;
  added_at: string;
  full_name: string | null;
  email: string;
}

// ---------- Admin dashboard ----------

export interface AdminOverviewStats {
  teacherCount: number;
  studentCount: number;
  classCount: number;
  pendingSignups: number;
  pendingAccessRequests: number;
}

export interface AdminActivityItem {
  id: string;
  description: string;
  timestamp: string;
}

export interface RoleChangeLogRow {
  id: string;
  target_user_id: string;
  target_name: string;
  previous_role: UserRole;
  new_role: UserRole;
  changed_by: string | null;
  changed_by_name: string;
  changed_at: string;
}

// ---------- Interview preparation ----------

export interface InterviewCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  display_order: number;
  created_at: string;
}

/** Category row plus how many questions it currently holds — powers
 * the student-facing category grid. */
export interface InterviewCategoryWithCount extends InterviewCategory {
  question_count: number;
}

export interface InterviewQuestion {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  difficulty: QuestionDifficulty;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}
