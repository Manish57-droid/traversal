import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowUpRight, Mail } from "lucide-react";

// lucide-react dropped brand icons a while back, so Instagram's glyph
// is inlined here rather than pulled from the icon set.
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export const DEVELOPER_PORTFOLIO_URL = "https://manish-portfolio-smoky.vercel.app/";
export const CONTACT_EMAIL = "traversalofficial@gmail.com";
export const INSTAGRAM_HANDLE = "traversal_official";
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

export type FooterLink = { label: string; href: string };
export type FooterColumn = { heading: string; links: FooterLink[] };
export type FooterCta = { title: string; hint: string; label: string; href: string };

// http(s) and mailto links bypass next/link; only http ones open in a new tab.
function FooterAnchor({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

const SOCIALS = [
  { label: "Email us", href: `mailto:${CONTACT_EMAIL}`, Icon: Mail },
  { label: "Instagram", href: INSTAGRAM_URL, Icon: InstagramIcon },
];

export default function SiteFooter({
  tagline,
  columns,
  cta,
}: {
  tagline: string;
  columns: FooterColumn[];
  cta: FooterCta;
}) {
  return (
    <footer className="relative overflow-hidden border-t border-line/70 bg-surface/40">
      {/* copper trace along the top edge + soft glow, echoing the hero */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 bg-grid-fade opacity-50" />

      <div className="relative mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <Image src="/logo-mark.png" alt="" width={36} height={36} className="rounded-full" />
              <span className="font-display text-2xl tracking-tight text-fg">traversal</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">{tagline}</p>

            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map(({ label, href, Icon }) => (
                <FooterAnchor
                  key={label}
                  href={href}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-fg-muted transition-colors hover:border-accent/60 hover:text-accent"
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{label}</span>
                </FooterAnchor>
              ))}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="ml-2 hidden text-xs text-fg-subtle transition-colors hover:text-fg sm:inline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            <div className="mt-8 max-w-sm rounded-xl border border-line bg-surface p-4">
              <p className="text-sm font-medium text-fg">{cta.title}</p>
              <p className="mt-1 text-xs text-fg-muted">{cta.hint}</p>
              <FooterAnchor
                href={cta.href}
                className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-2"
              >
                {cta.label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </FooterAnchor>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:col-span-7 lg:pl-8">
            {columns.map((col) => (
              <div key={col.heading}>
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  {col.heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <FooterAnchor
                        href={link.href}
                        className="group inline-flex items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg"
                      >
                        {link.label}
                        {link.href.startsWith("http") && (
                          <ArrowUpRight className="h-3 w-3 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        )}
                      </FooterAnchor>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Oversized wordmark — decorative */}
        <p
          aria-hidden="true"
          className="pointer-events-none mt-12 select-none bg-gradient-to-b from-fg/[0.09] to-transparent bg-clip-text text-center font-display text-[clamp(4.5rem,17vw,13rem)] leading-[0.8] tracking-tighter text-transparent"
        >
          traversal
        </p>

        <div className="relative flex flex-col-reverse items-center justify-between gap-3 border-t border-line/70 py-6 text-xs text-fg-subtle sm:flex-row">
          <span>© {new Date().getFullYear()} Traversal. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <a
              href={DEVELOPER_PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-fg"
            >
              Built by Manish Kushwaha ↗
            </a>
            <a href="#" className="inline-flex items-center gap-1 transition-colors hover:text-fg">
              Back to top <ArrowUp className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
