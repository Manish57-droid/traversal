import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server-client";
import Hero3D from "@/components/Hero3D";

export default async function LandingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-grid-fade" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between py-6">
          <span className="font-display text-lg tracking-tight text-white">traversal</span>
          {userId ? (
            <Link href="/dashboard" className="btn-secondary">Go to dashboard</Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/sign-in" className="text-sm text-slate-300 hover:text-white">Sign in</Link>
              <Link href="/sign-up" className="btn-primary">Get started</Link>
            </div>
          )}
        </header>

        <div className="grid flex-1 grid-cols-1 items-center gap-10 py-10 lg:grid-cols-2 lg:gap-6 lg:py-0">
          <div>
            <h1 className="font-display text-4xl leading-[1.1] text-white sm:text-5xl lg:text-6xl">
              Every problem you solve is a node on the path.
            </h1>
            <p className="mt-6 max-w-md text-base text-slate-300 sm:text-lg">
              Teachers assign question sets from LeetCode, CodeChef, and anywhere else. Students
              solve them where they live, check them off, and watch their progress build up —
              alongside 3D explanations of the concepts behind every problem.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {userId ? (
                <Link href="/dashboard" className="btn-primary">Continue where you left off</Link>
              ) : (
                <Link href="/sign-up" className="btn-primary">Start tracking progress</Link>
              )}
              <a href="#how-it-works" className="btn-secondary">How it works</a>
            </div>
          </div>

          <div className="h-[320px] w-full sm:h-[420px] lg:h-[480px]">
            <Hero3D />
          </div>
        </div>

        <section id="how-it-works" className="grid grid-cols-1 gap-6 border-t border-white/10 py-14 sm:grid-cols-3">
          <div>
            <p className="font-display text-2xl text-warn">Assign</p>
            <p className="mt-2 text-sm text-slate-400">
              A teacher builds a question set from any platform and sends it to a class.
            </p>
          </div>
          <div>
            <p className="font-display text-2xl text-success">Solve</p>
            <p className="mt-2 text-sm text-slate-400">
              Students click through and solve it there — no editor rebuilt here, just the real judge.
            </p>
          </div>
          <div>
            <p className="font-display text-2xl text-accent-2">Track</p>
            <p className="mt-2 text-sm text-slate-400">
              Check it off. Your dashboard — and your teacher's — updates instantly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
