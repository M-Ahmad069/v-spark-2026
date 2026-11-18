"use client";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuthSync } from "@/components/auth-sync";
import { Composer } from "@/components/composer";
import { PostList } from "@/components/post-list";
import { SettingsPanel } from "@/components/settings-panel";
import { Logo, Spinner, ToastProvider, useToast } from "@/components/ui";
import type { Post } from "@/lib/schemas";
import { api } from "@/lib/client/api";
import { clearDriveToken, connectDrive, getDriveToken } from "@/lib/client/drive-token";
import { auth } from "@/lib/client/firebase";
import { formatWhen } from "@/lib/client/time";

type Tab = "create" | "posts" | "settings";

export default function AppPage() {
  return (
    <ToastProvider>
      <Studio />
    </ToastProvider>
  );
}

function Studio() {
  const user = useAuthSync();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("create");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [drive, setDrive] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(() => {
    api<{ posts: Post[] }>("/api/posts")
      .then(({ posts }) => {
        setPosts(posts);
        setDrive(Boolean(getDriveToken()));
      })
      .catch((err) => toast(err.message, "error"));
  }, [toast]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function onConnectDrive() {
    setConnecting(true);
    try {
      setDrive(Boolean(await connectDrive()));
      toast("Google Drive connected. New and edited posts will sync.");
    } catch {
      toast("Could not connect Google Drive.", "error");
    } finally {
      setConnecting(false);
    }
  }

  async function onSignOut() {
    clearDriveToken();
    await fetch("/api/session", { method: "DELETE" });
    await signOut(auth);
    router.replace("/login");
  }

  if (user === undefined) {
    return (
      <div className="grid flex-1 place-items-center text-muted">
        <Spinner />
      </div>
    );
  }

  const sorted = posts && [...posts].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const upcoming = posts?.filter((p) => p.status === "scheduled").length ?? 0;
  const next = sorted?.find((p) => p.status === "scheduled");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <button
              onClick={onConnectDrive}
              disabled={connecting}
              className={`btn btn-ghost px-3 py-2 text-xs ${drive ? "text-ok" : ""}`}
              title={drive ? "Reconnect Google Drive" : "Connect Google Drive"}
            >
              {connecting ? <Spinner /> : <span aria-hidden className={`size-2 rounded-full ${drive ? "bg-ok" : "bg-muted"}`} />}
              <span className="hidden sm:inline">{drive ? "Drive connected" : "Connect Drive"}</span>
              <span className="sm:hidden">Drive</span>
            </button>
            <span className="hidden max-w-40 truncate text-sm text-muted md:inline">{user?.displayName || user?.email}</span>
            <button onClick={onSignOut} className="btn btn-ghost px-3 py-2 text-xs">
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6" aria-label="Sections">
          {(
            [
              ["create", "Create"],
              ["posts", `Posts${upcoming ? ` · ${upcoming}` : ""}`],
              ["settings", "Notifications"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`border-b-2 px-3 py-2.5 text-sm transition-colors ${
                tab === id ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <dl className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
          <div className="bg-surface p-3 sm:p-4">
            <dt className="text-xs text-muted">Upcoming</dt>
            <dd className="mt-1 text-lg font-semibold">{posts ? upcoming : "–"}</dd>
          </div>
          <div className="bg-surface p-3 sm:p-4">
            <dt className="text-xs text-muted">Next post</dt>
            <dd className="mt-1 truncate font-semibold sm:text-lg">{next ? formatWhen(next.scheduledAt) : "None yet"}</dd>
          </div>
          <div className="bg-surface p-3 sm:p-4">
            <dt className="text-xs text-muted">Google Drive</dt>
            <dd className={`mt-1 font-semibold sm:text-lg ${drive ? "text-ok" : "text-muted"}`}>{drive ? "Syncing" : "Not connected"}</dd>
          </div>
        </dl>
        {tab === "create" && (
          <Composer
            driveConnected={drive}
            onSaved={(p) => {
              setPosts((prev) => [...(prev ?? []), p]);
              setTab("posts");
            }}
          />
        )}
        {tab === "posts" && (
          <PostList
            posts={sorted}
            onChange={(p) => setPosts((prev) => prev?.map((x) => (x.id === p.id ? p : x)) ?? null)}
            onDelete={(id) => setPosts((prev) => prev?.filter((x) => x.id !== id) ?? null)}
          />
        )}
        {tab === "settings" && <SettingsPanel />}
      </main>
    </div>
  );
}
