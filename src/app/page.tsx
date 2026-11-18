import Link from "next/link";
import { Logo } from "@/components/ui";

const steps = [
  { title: "Describe", body: "Type what your post is about, pick a platform and a tone." },
  { title: "Generate", body: "Gemini writes three caption options with hashtags in seconds." },
  { title: "Schedule", body: "Pick one, set a time. It saves to your feed and your Google Drive." },
  { title: "Get reminded", body: "An email lands when it's time to post, on your terms." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <Link href="/login" className="btn btn-ghost">
          Sign in
        </Link>
      </header>

      <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rise">
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">
            Captions written, scheduled and synced before your coffee cools.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            CaptionFlow drafts social posts with Gemini, keeps every draft in your own Google Drive, and emails
            you when it&apos;s time to publish.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-primary px-5 py-3">
              Start for free
            </Link>
            <a href="#how" className="btn btn-ghost px-5 py-3">
              See how it works
            </a>
          </div>
        </div>
        <PreviewCard />
      </section>

      <section id="how" aria-labelledby="how-title" className="pb-16">
        <h2 id="how-title" className="sr-only">
          How it works
        </h2>
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-surface p-6">
              <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto border-t border-line py-8 text-sm text-muted">
        Built for V-Spark 2026 Web Development with Next.js, Firebase, Supabase, Gemini and Google Drive.
      </footer>
    </main>
  );
}

/** A static, realistic preview of the product so visitors see the result before signing up. */
function PreviewCard() {
  return (
    <div className="rise relative mx-auto w-full max-w-md [animation-delay:120ms]" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent-soft blur-2xl" />
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_60px_-30px_rgb(40_30_120/0.35)]">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">Instagram</span>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">Fri 9:00 AM</span>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed">
          Your new favourite study fuel drops this Friday. Cold brew, oat milk, and 20% off with your student ID.
          See you at the counter.
        </p>
        <p className="mt-3 text-sm text-accent">#coldbrew #oatmilk #studentlife #cafeculture</p>
        <div className="mt-5 grid gap-2 border-t border-line pt-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-surface-2">
              <DriveIcon />
            </span>
            <span className="flex-1">
              <span className="block font-medium">Saved to Google Drive</span>
              <span className="text-xs text-muted">CaptionFlow Posts / post-friday-0900.json</span>
            </span>
            <span className="text-ok">✓</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-surface-2">✉</span>
            <span className="flex-1">
              <span className="block font-medium">Email reminder</span>
              <span className="text-xs text-muted">15 minutes before posting</span>
            </span>
            <span className="text-ok">✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DriveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#0F9D58" d="M8 3h8l7 12h-8z" />
      <path fill="#4285F4" d="M23 15l-4 6H5l4-6z" />
      <path fill="#F4B400" d="M8 3L1 15l4 6 7-12z" />
    </svg>
  );
}
