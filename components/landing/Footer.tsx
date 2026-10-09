import SiteFooter, {
  CONTACT_EMAIL,
  DEVELOPER_PORTFOLIO_URL,
  INSTAGRAM_URL,
  type FooterColumn,
} from "@/components/SiteFooter";

const COLUMNS: FooterColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "Features", href: "#features" },
      { label: "Platforms", href: "#platforms" },
      { label: "How it works", href: "#how-it-works" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Join as student", href: "/sign-up" },
      { label: "Start teaching", href: "/sign-up" },
      { label: "Login", href: "/sign-in" },
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

export default function Footer() {
  return (
    <SiteFooter
      tagline="Placement prep that actually feels real — built for students and the colleges training them."
      columns={COLUMNS}
      cta={{
        title: "Ready for your next drive?",
        hint: "Create a free account and start practising in minutes.",
        label: "Get started",
        href: "/sign-up",
      }}
    />
  );
}
