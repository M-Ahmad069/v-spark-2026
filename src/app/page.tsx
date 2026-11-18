import Link from "next/link";
import { Logo } from "@/components/ui";

const steps = [
  { n: "01", title: "Describe", body: "Type what your post is about, pick a platform and a tone." },
  { n: "02", title: "Generate", body: "Gemini writes three caption options with hashtags in seconds." },
  { n: "03", title: "Schedule", body: "Pick one, set a time. It saves to your feed and your Google Drive." },
  { n: "04", title: "Get reminded", body: "An email lands when it's time to post, on your terms." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <Link href="/login" className="btn btn-ghost">
          Sign in
        </Link>
      </header>

      <section className="py-16 sm:py-24">
        <p className="mb-4 text-sm font-medium text-accent">Gemini · Google Drive · Email reminders</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Captions written, scheduled and synced before your coffee cools.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          CaptionFlow drafts social posts with AI, keeps every draft in your own Google Drive, and emails you
          when it&apos;s time to publish.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="btn btn-primary px-5 py-3">
            Start for free
          </Link>
          <a href="#how" className="btn btn-ghost px-5 py-3">
            How it works
          </a>
        </div>
      </section>

      <section id="how" className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="bg-surface p-6">
            <p className="font-mono text-xs text-muted">{s.n}</p>
            <h2 className="mt-3 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <footer className="py-10 text-sm text-muted">Built for V-Spark 2026 · Web Development</footer>
    </main>
  );
}
