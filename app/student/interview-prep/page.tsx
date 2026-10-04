import { INTERVIEW_GUIDES } from "@/lib/interview-guides";
import SubjectGrid from "@/components/interview-prep/SubjectGrid";

// Server component so the static guides (lib/interview-guides) are read
// here and only their names/counts reach the client — SubjectGrid
// merges them with the teacher-authored categories it loads from the API.
export default function StudentInterviewPrepPage() {
  const guides = INTERVIEW_GUIDES.map(({ topics, ...info }) => ({ ...info, topicCount: topics.length }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Interview preparation</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Important topics to know for interviews, each with an in-depth explanation — organized by subject.
        </p>
      </div>

      <SubjectGrid guides={guides} />
    </div>
  );
}
