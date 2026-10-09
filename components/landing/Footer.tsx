import { GraduationCap, Layers, LogIn, Mail, Presentation, Sparkles, UserRound, Workflow } from "lucide-react";
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
    heading: "Platform",
    links: [
      { label: "Features", href: "#features", icon: Sparkles },
      { label: "Platforms", href: "#platforms", icon: Layers },
      { label: "How it works", href: "#how-it-works", icon: Workflow },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Join as student", href: "/sign-up", icon: GraduationCap },
      { label: "Start teaching", href: "/sign-up", icon: Presentation },
      { label: "Login", href: "/sign-in", icon: LogIn },
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
  { emoji: "💻", title: "DSA practice", hint: "Problems that mirror real interviews" },
  { emoji: "🧮", title: "Aptitude", hint: "Timed drills for every round" },
  { emoji: "🛡️", title: "Proctored tests", hint: "Exam-day conditions, every time" },
  { emoji: "🎓", title: "For colleges", hint: "Run drives and track every batch" },
];

export default function Footer() {
  return (
    <SiteFooter
      tagline="Placement prep that actually feels real — built for students and the colleges training them."
      columns={COLUMNS}
      highlights={HIGHLIGHTS}
      cta={{
        title: "Ready for your next drive?",
        hint: "Create a free account and start practising in minutes.",
        label: "Get started",
        href: "/sign-up",
      }}
    />
  );
}
