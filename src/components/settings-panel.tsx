"use client";
import { useEffect, useState } from "react";
import { LEAD_OPTIONS, type Settings } from "@/lib/schemas";
import { api } from "@/lib/client/api";
import { Spinner, useToast } from "./ui";

export function SettingsPanel() {
  const toast = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  useEffect(() => {
    api<{ settings: Settings }>("/api/settings")
      .then(({ settings }) => setS(settings))
      .catch((err) => toast(err.message, "error"));
  }, [toast]);

  if (!s) return <div className="h-80 animate-pulse rounded-2xl bg-surface-2" aria-busy />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  async function save() {
    setBusy("save");
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { settings } = await api<{ settings: Settings }>("/api/settings", { method: "PUT", json: { ...s, timezone: tz } });
      setS(settings);
      toast("Notification settings saved.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    try {
      await api("/api/settings", { method: "POST" });
      toast(`Test email sent to ${s!.email}.`);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Email notifications</h2>
      <p className="mt-1 text-sm text-muted">We email you for every scheduled post, exactly once.</p>

      <label className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-line p-4">
        <span>
          <span className="block text-sm font-medium">Send reminders</span>
          <span className="text-xs text-muted">Turn off to pause all emails.</span>
        </span>
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Send to</span>
          <input type="email" className="input" value={s.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">When</span>
          <select className="input" value={s.leadMinutes} onChange={(e) => set("leadMinutes", Number(e.target.value) as Settings["leadMinutes"])}>
            {LEAD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Subject prefix</span>
          <input className="input" value={s.subjectPrefix} maxLength={60} onChange={(e) => set("subjectPrefix", e.target.value)} />
        </label>
        <label className="flex items-center gap-3 self-end rounded-xl border border-line p-3 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={s.includeHashtags} onChange={(e) => set("includeHashtags", e.target.checked)} />
          Include hashtags in the email
        </label>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button className="btn btn-ghost" onClick={test} disabled={!!busy}>
          {busy === "test" && <Spinner />} Send test email
        </button>
        <button className="btn btn-primary" onClick={save} disabled={!!busy}>
          {busy === "save" && <Spinner />} Save settings
        </button>
      </div>
    </div>
  );
}
