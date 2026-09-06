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
  url: string;
  platform: QuestionPlatform;
  difficulty: QuestionDifficulty;
  topic: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
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
