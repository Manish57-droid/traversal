import { redirect } from "next/navigation";

// Guides are listed on the main Interview Prep page; without this,
// /guides would fall through to the [category] route as a "guides" slug.
export default function GuidesIndexPage() {
  redirect("/student/interview-prep");
}
