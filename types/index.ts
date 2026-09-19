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
  time_limit_minutes: number;
  negative_marking_fraction: number;
  max_violations_before_autosubmit: number;
  require_camera: boolean;
  require_mic: boolean;
  created_by: string;
  created_at: string;
  results_released: boolean;
}

export interface ProctoredTestWithQuestions extends ProctoredTest {
  question_count: number;
}

export interface ProctoredTestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  status: ProctoredAttemptStatus;
  answers: Record<string, number>;
  score: number | null;
  total_questions: number | null;
  violation_count: number;
  time_taken_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
}

/** Sanitized for the student while an attempt is in progress — never
 * includes `correct_option`/`explanation` (see the review endpoint,
 * which is the only place those are ever sent, and only post-release). */
export interface ProctoredAttemptQuestion {
  id: string;
  prompt: string;
  options: string[];
  difficulty: QuestionDifficulty;
  image_url: string | null;
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
