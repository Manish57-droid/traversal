import PublicNavbar from "./PublicNavbar";
import Hero from "./Hero";
import Features from "./Features";
import Platforms from "./Platforms";
import HowItWorks from "./HowItWorks";
import CtaBand from "./CtaBand";
import Footer from "./Footer";

// Theming is unified site-wide now: next-themes writes its class
// straight to <html> (see components/ThemeProvider.tsx) and every
// page — this one included — reads the same design tokens from
// app/globals.css, so there's nothing theme-specific to do here
// beyond just using token classes (bg-bg, text-fg, ...) like the rest
// of the app does.
export default function LandingPage({ userId }: { userId?: string }) {
  return (
    <main className="min-h-screen bg-bg text-fg">
      <PublicNavbar userId={userId} />
      <Hero userId={userId} />
      <Features />
      <Platforms />
      <HowItWorks />
      <CtaBand />
      <Footer />
    </main>
  );
}
