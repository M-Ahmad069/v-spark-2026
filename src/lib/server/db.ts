import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client. The secret key bypasses RLS, so every query must filter by owner_id.
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const IMAGE_BUCKET = "post-images";

export type PostRow = {
  id: string;
  owner_id: string;
  prompt: string;
  platform: string;
  caption: string;
  hashtags: string[];
  scheduled_at: string;
  notes: string | null;
  image_path: string | null;
  drive_file_id: string | null;
  status: "scheduled" | "notified";
  notified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SettingsRow = {
  owner_id: string;
  enabled: boolean;
  email: string;
  lead_minutes: number;
  subject_prefix: string;
  include_hashtags: boolean;
  timezone: string;
};

export async function signedImageUrl(path: string | null) {
  if (!path) return null;
  const { data } = await db.storage.from(IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
