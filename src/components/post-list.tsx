"use client";
import { useState } from "react";
import type { Post } from "@/lib/schemas";
import { api } from "@/lib/client/api";
import { formatWhen, fromLocalInput, toLocalInput } from "@/lib/client/time";
import { PLATFORM_LABEL } from "./composer";
import { Spinner, useToast } from "./ui";

type Props = {
  posts: Post[] | null;
  onChange: (p: Post) => void;
  onDelete: (id: string) => void;
};

export function PostList({ posts, onChange, onDelete }: Props) {
  const [filter, setFilter] = useState<"all" | "scheduled" | "notified">("all");

  if (posts === null) {
    return (
      <div className="space-y-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }

  const shown = posts.filter((p) => filter === "all" || p.status === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          Your posts <span className="text-muted">({posts.length})</span>
        </h2>
        <div role="tablist" className="flex rounded-xl border border-line bg-surface p-1 text-sm">
          {(["all", "scheduled", "notified"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1 capitalize ${filter === f ? "bg-surface-2 font-medium" : "text-muted"}`}
            >
              {f === "notified" ? "Sent" : f}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="font-medium">No posts here yet</p>
          <p className="mt-1 text-sm text-muted">Generate a caption and schedule it, it will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((p) => (
            <PostItem key={p.id} post={p} onChange={onChange} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PostItem({ post, onChange, onDelete }: { post: Post; onChange: Props["onChange"]; onDelete: Props["onDelete"] }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [hashtags, setHashtags] = useState(post.hashtags.join(" "));
  const [when, setWhen] = useState(toLocalInput(post.scheduledAt));
  const [notes, setNotes] = useState(post.notes);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    setBusy("save");
    try {
      const { post: updated } = await api<{ post: Post }>(`/api/posts/${post.id}`, {
        method: "PATCH",
        json: {
          caption,
          hashtags: hashtags.split(/[\s,]+/).filter(Boolean),
          notes,
          ...(when !== toLocalInput(post.scheduledAt) && { scheduledAt: fromLocalInput(when) }),
        },
      });
      onChange(updated);
      setEditing(false);
      toast("Post updated.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      onDelete(post.id);
      toast("Post deleted.");
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(null);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">{PLATFORM_LABEL[post.platform]}</span>
        <span className="text-muted">{formatWhen(post.scheduledAt)}</span>
        <span className={`rounded-full px-2.5 py-1 font-medium ${post.status === "notified" ? "bg-ok/15 text-ok" : "bg-accent-soft text-accent"}`}>
          {post.status === "notified" ? "Reminder sent" : "Scheduled"}
        </span>
        {post.driveFileId && <span className="text-muted">· In Drive</span>}
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <textarea className="input min-h-24" aria-label="Caption" value={caption} maxLength={2200} onChange={(e) => setCaption(e.target.value)} />
          <input className="input" aria-label="Hashtags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#one #two" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="datetime-local" className="input" aria-label="Scheduled time" value={when} onChange={(e) => setWhen(e.target.value)} />
            <input className="input" aria-label="Notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={busy === "save" || !caption.trim()}>
              {busy === "save" && <Spinner />} Save
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-4">
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.caption}</p>
            {post.hashtags.length > 0 && <p className="mt-2 text-sm text-accent">{post.hashtags.join(" ")}</p>}
            {post.notes && <p className="mt-2 text-xs text-muted">Notes: {post.notes}</p>}
          </div>
          {post.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.imageUrl} alt="Post attachment" className="size-20 shrink-0 rounded-xl border border-line object-cover" />
          )}
        </div>
      )}

      {!editing && (
        <div className="mt-4 flex justify-end gap-2">
          {confirming ? (
            <>
              <span className="self-center text-sm text-muted">Delete this post?</span>
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
                No
              </button>
              <button className="btn bg-danger text-white" onClick={remove} disabled={busy === "delete"}>
                {busy === "delete" && <Spinner />} Delete
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn btn-ghost text-danger" onClick={() => setConfirming(true)}>
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
