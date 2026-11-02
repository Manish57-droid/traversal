import { revalidateTag } from "next/cache";

// Server-side data cache (Next's `unstable_cache`) for the shared,
// rarely-changing lists every signed-in user reads: topic/company/
// category/subject lists with their live question counts. Nothing
// user-specific (progress, attempts, notifications, ...) is cached.
//
// Each list is invalidated by tag from every route that can change it
// — including the question routes, since a list's question counts
// move whenever a question is added, re-tagged or deleted. The time
// limit is only a safety net for edits made outside the app (e.g.
// directly in the Supabase dashboard).
export const CACHE_TAGS = {
  dsaTopics: "dsa-topics",
  companies: "companies",
  aptitudeTopics: "aptitude-topics",
  interviewCategories: "interview-categories",
  proctoredSubjects: "proctored-subjects",
} as const;

export const SHARED_LIST_REVALIDATE_SECONDS = 300;

export function invalidate(...tags: string[]) {
  tags.forEach((tag) => revalidateTag(tag));
}

// Wraps a mutating route handler so `tags` are invalidated however it
// exits — including the partial-failure paths (e.g. a question
// inserted but its company tags failing) where data already changed.
export function invalidatesAfter<A extends unknown[]>(
  tags: string[],
  handler: (...args: A) => Promise<Response>
) {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } finally {
      invalidate(...tags);
    }
  };
}
