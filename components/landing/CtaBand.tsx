import Link from "next/link";

export default function CtaBand() {
  return (
    <section className="border-t border-line/70 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl text-fg sm:text-4xl">
          Ready to practice like it's the real drive?
        </h2>
        <p className="mt-4 text-base text-fg-muted">
          Free for students. Colleges and teachers welcome — join and start assigning today.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/sign-up" className="btn-primary">Get Started Free</Link>
          <a href="#how-it-works" className="btn-secondary">See how it works</a>
        </div>
      </div>
    </section>
  );
}
