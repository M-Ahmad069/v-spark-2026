import "server-only";
import type { Post } from "@/lib/schemas";
import { db, signedImageUrl, type PostRow, type SettingsRow } from "./db";
import { HttpError } from "./http";

export async function toPost(row: PostRow): Promise<Post> {
  return {
    id: row.id,
    prompt: row.prompt,
    platform: row.platform as Post["platform"],
    caption: row.caption,
    hashtags: row.hashtags,
    scheduledAt: row.scheduled_at,
    notes: row.notes ?? "",
    imageUrl: await signedImageUrl(row.image_path),
    driveFileId: row.drive_file_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getOwnPost(uid: string, id: string) {
  const { data, error } = await db.from("posts").select("*").eq("id", id).eq("owner_id", uid).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Post not found.");
  return data as PostRow;
}

export function toSettings(row: SettingsRow) {
  return {
    enabled: row.enabled,
    email: row.email,
    leadMinutes: row.lead_minutes,
    subjectPrefix: row.subject_prefix,
    includeHashtags: row.include_hashtags,
    timezone: row.timezone,
  };
}

export async function getSettings(uid: string, fallbackEmail: string | null, timezone?: string | null) {
  const { data, error } = await db.from("notification_settings").select("*").eq("owner_id", uid).maybeSingle();
  if (error) throw error;
  if (data) return data as SettingsRow;
  // First visit: create defaults so the user gets emails without any setup.
  const { data: created, error: insertError } = await db
    .from("notification_settings")
    .upsert(
      { owner_id: uid, email: fallbackEmail ?? "", timezone: validTimezone(timezone) },
      { onConflict: "owner_id" },
    )
    .select()
    .single();
  if (insertError) throw insertError;
  return created as SettingsRow;
}

function validTimezone(tz?: string | null) {
  if (!tz || tz.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** Reads the optional Google Drive access token sent by the browser for this request only. */
export function driveToken(req: Request) {
  const token = req.headers.get("x-drive-token");
  return token && token.length < 4096 ? token : null;
}
