import { BookOpen, Calculator, Code2, LayoutDashboard, Mail, ShieldCheck, UserRound, Users } from "lucide-react";
import SiteFooter, {
  CONTACT_EMAIL,
  DEVELOPER_PORTFOLIO_URL,
  INSTAGRAM_URL,
  InstagramIcon,
  type FooterColumn,
  type FooterHighlight,
} from "@/components/SiteFooter";

const COLUMNS: FooterColumn[] = [
  {
    heading: "Practice",
    links: [
      { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
      { label: "DSA", href: "/student/dsa", icon: Code2 },
      { label: "Aptitude", href: "/student/aptitude", icon: Calculator },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Proctored Tests", href: "/student/proctored-tests", icon: ShieldCheck },
      { label: "My Classes", href: "/student/classes", icon: Users },
      { label: "Study Material", href: "/student/study-material", icon: BookOpen },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Contact us", href: `mailto:${CONTACT_EMAIL}`, icon: Mail },
      { label: "Instagram", href: INSTAGRAM_URL, icon: InstagramIcon },
      { label: "Meet the developer", href: DEVELOPER_PORTFOLIO_URL, icon: UserRound },
    ],
  },
];

const HIGHLIGHTS: FooterHighlight[] = [
  { emoji: "🧠", title: "Solve daily", hint: "Small streaks beat big cram sessions" },
  { emoji: "🧮", title: "Sharpen aptitude", hint: "Speed + accuracy, round by round" },
  { emoji: "🛡️", title: "Test for real", hint: "Proctored, timed, no shortcuts" },
  { emoji: "🚀", title: "Get placed", hint: "Walk into drives fully prepared" },
];

export default function StudentFooter() {
  return (
    <SiteFooter
      tagline="Everything you need to practice, prepare, and get placed — in one place."
      columns={COLUMNS}
      highlights={HIGHLIGHTS}
      cta={{
        title: "Stuck somewhere or found a bug?",
        hint: "We read every message — reach out and we'll help you out.",
        label: "Write to us",
        href: `mailto:${CONTACT_EMAIL}`,
      }}
    />
  );
}
