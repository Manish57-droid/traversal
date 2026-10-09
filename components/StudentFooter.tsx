import SiteFooter, {
  CONTACT_EMAIL,
  DEVELOPER_PORTFOLIO_URL,
  INSTAGRAM_URL,
  type FooterColumn,
} from "@/components/SiteFooter";

const COLUMNS: FooterColumn[] = [
  {
    heading: "Practice",
    links: [
      { label: "Dashboard", href: "/student/dashboard" },
      { label: "DSA", href: "/student/dsa" },
      { label: "Aptitude", href: "/student/aptitude" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Proctored Tests", href: "/student/proctored-tests" },
      { label: "My Classes", href: "/student/classes" },
      { label: "Study Material", href: "/student/study-material" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Contact us", href: `mailto:${CONTACT_EMAIL}` },
      { label: "Instagram", href: INSTAGRAM_URL },
      { label: "Meet the developer", href: DEVELOPER_PORTFOLIO_URL },
    ],
  },
];

export default function StudentFooter() {
  return (
    <SiteFooter
      tagline="Everything you need to practice, prepare, and get placed — in one place."
      columns={COLUMNS}
      cta={{
        title: "Stuck somewhere or found a bug?",
        hint: "We read every message — reach out and we'll help you out.",
        label: "Write to us",
        href: `mailto:${CONTACT_EMAIL}`,
      }}
    />
  );
}
