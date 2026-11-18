"use client";
import { useRef, useState, type FormEvent } from "react";
import { PLATFORMS, TONES, type Caption, type Post } from "@/lib/schemas";
import { api } from "@/lib/client/api";
import { defaultSchedule, fromLocalInput } from "@/lib/client/time";
import { Spinner, useToast } from "./ui";

export const PLATFORM_LABEL: Record<(typeof PLATFORMS)[number], string> = {
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export const PLATFORM_LIMIT: Record<(typeof PLATFORMS)[number], number> = {
  instagram: 2200,
  x: 280,
  linkedin: 3000,
  facebook: 2200,
  tiktok: 2200,
};

export function Composer({ driveConnected, onSaved }: { driveConnected: boolean; onSaved: (p: Post) => void }) {
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("instagram");
  const [tone, setTone] = useState<(typeof TONES)[number]>("friendly");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultSchedule);
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<{ path: string; url: string | null } | null>(null);
  const [busy, setBusy] = useState<"gen" | "save" | "upload" | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function generate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (prompt.trim().length < 3) return setError("Describe your post in at least 3 characters.");
    setBusy("gen");
    try {
      const { captions } = await api<{ captions: Caption[] }>("/api/captions", {
        method: "POST",
        json: { prompt, platform, tone },
      });
      setCaptions(captions);
      setSelected(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function pick(i: number) {
    setSelected(i);
    setDraft(captions[i].text);
  }

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast("Image must be 5 MB or smaller.", "error");
    setBusy("upload");
    try {
      const body = new FormData();
      body.append("file", file);
      setImage(await api<{ path: string; url: string }>("/api/upload", { method: "POST", body }));
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (selected === null) return;
    if (!scheduledAt || new Date(scheduledAt).getTime() < Date.now()) return toast("Pick a time in the future.", "error");
    setBusy("save");
    try {
      const { post, driveSynced } = await api<{ post: Post; driveSynced: boolean }>("/api/posts", {
        method: "POST",
        json: {
          prompt,
          platform,
          caption: draft,
          hashtags: captions[selected].hashtags,
          scheduledAt: fromLocalInput(scheduledAt),
          notes,
          imagePath: image?.path ?? null,
        },
      });
      onSaved(post);
      toast(driveSynced ? "Scheduled and synced to Google Drive." : driveConnected ? "Scheduled. Drive sync failed, reconnect Drive." : "Scheduled. Connect Drive to sync.");
      setCaptions([]);
      setSelected(null);
      setNotes("");
      setImage(null);
      setScheduledAt(defaultSchedule());
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={generate} className="rounded-2xl border border-line bg-surface p-5">
        <label htmlFor="prompt" className="text-sm font-medium">
          What is your post about?
        </label>
        <textarea
          id="prompt"
          className="input mt-2 min-h-24 resize-y"
          placeholder="e.g. Launching our new cold brew with oat milk this Friday, 20% off for students"
          value={prompt}
          maxLength={500}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Platform</legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={platform === p}
                  onClick={() => setPlatform(p)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    platform === p ? "border-accent bg-accent-soft text-accent font-medium" : "border-line hover:bg-surface-2"
                  }`}
                >
                  {PLATFORM_LABEL[p]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="text-sm">
            <span className="mb-2 block font-medium">Tone</span>
            <select className="input capitalize sm:w-40" value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}>
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{prompt.length}/500</span>
          <button type="submit" className="btn btn-primary" disabled={busy === "gen"}>
            {busy === "gen" ? <Spinner /> : "✦"} {captions.length ? "Regenerate" : "Generate captions"}
          </button>
        </div>
      </form>

      {busy === "gen" && (
        <div className="grid gap-3 md:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      )}

      {captions.length > 0 && busy !== "gen" && (
        <section aria-label="Caption options">
          <h2 className="mb-3 text-sm font-medium">Pick a caption</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {captions.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                aria-pressed={selected === i}
                className={`flex flex-col rounded-2xl border bg-surface p-4 text-left transition-colors ${
                  selected === i ? "border-accent ring-2 ring-accent/30" : "border-line hover:border-muted"
                }`}
              >
                <span className="mb-2 font-mono text-xs text-muted">Option {i + 1}</span>
                <span className="whitespace-pre-wrap text-sm leading-relaxed">{c.text}</span>
                <span className="mt-3 text-sm text-accent">{c.hashtags.join(" ")}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selected !== null && (
        <section aria-label="Schedule" className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Schedule this post</h2>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Caption (you can edit it)</span>
            <textarea className="input min-h-28" value={draft} maxLength={2200} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <CharCount
            used={draft.length + captions[selected].hashtags.join(" ").length + 1}
            limit={PLATFORM_LIMIT[platform]}
            platform={PLATFORM_LABEL[platform]}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Post at</span>
              <input type="datetime-local" className="input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Notes for the reminder</span>
              <input className="input" placeholder="e.g. Use the blue product photo" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="image" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <label htmlFor="image" className="btn btn-ghost cursor-pointer">
              {busy === "upload" ? <Spinner /> : "↑"} {image ? "Replace image" : "Attach image"}
            </label>
            {image?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt="Attached preview" className="size-12 rounded-lg border border-line object-cover" />
            )}
            {image && (
              <button type="button" className="text-sm text-muted hover:text-danger" onClick={() => setImage(null)}>
                Remove
              </button>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <span className="text-xs text-muted">{driveConnected ? "Will sync to Google Drive" : "Drive not connected"}</span>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy === "save" || !draft.trim()}>
              {busy === "save" && <Spinner />} Save &amp; schedule
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/** Caption + hashtags length against the platform's limit. */
export function CharCount({ used, limit, platform }: { used: number; limit: number; platform: string }) {
  const over = used > limit;
  return (
    <p className={`mt-1 text-right text-xs ${over ? "text-danger" : "text-muted"}`} aria-live="polite">
      {used}/{limit} characters with hashtags{over && ` (too long for ${platform})`}
    </p>
  );
}
