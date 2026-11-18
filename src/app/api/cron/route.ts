import { timingSafeEqual } from "node:crypto";
import { db, type PostRow, type SettingsRow } from "@/lib/server/db";
import { errorResponse, HttpError, json } from "@/lib/server/http";
import { sendPostEmail } from "@/lib/server/mail";

function authorized(req: Request) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  return Boolean(process.env.CRON_SECRET) && got.length === expected.length && timingSafeEqual(got, expected);
}

// Called every minute by Supabase pg_cron. Sends one email per due post, exactly once.
async function run(req: Request) {
  try {
    if (!authorized(req)) throw new HttpError(401, "Unauthorized");

    // Largest lead time is 1 day, so only posts due within the next day can need an email now.
    const horizon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: posts, error } = await db
      .from("posts")
      .select("*")
      .is("notified_at", null)
      .lte("scheduled_at", horizon)
      .limit(100);
    if (error) throw error;
    if (!posts.length) return json({ sent: 0 });

    const owners = [...new Set(posts.map((p) => p.owner_id))];
    const { data: settingsRows, error: sErr } = await db
      .from("notification_settings")
      .select("*")
      .in("owner_id", owners);
    if (sErr) throw sErr;
    const settingsBy = new Map((settingsRows as SettingsRow[]).map((s) => [s.owner_id, s]));

    let sent = 0;
    for (const post of posts as PostRow[]) {
      const settings = settingsBy.get(post.owner_id);
      if (!settings?.enabled || !settings.email) continue;
      const sendAt = new Date(post.scheduled_at).getTime() - settings.lead_minutes * 60_000;
      if (sendAt > Date.now()) continue;

      // Claim the post first so overlapping cron runs can never send twice.
      const { data: claimed } = await db
        .from("posts")
        .update({ notified_at: new Date().toISOString(), status: "notified" })
        .eq("id", post.id)
        .is("notified_at", null)
        .select("id");
      if (!claimed?.length) continue;

      try {
        await sendPostEmail(post, settings);
        sent++;
      } catch (err) {
        console.error("Email failed, will retry next run", post.id, err);
        await db.from("posts").update({ notified_at: null, status: "scheduled" }).eq("id", post.id);
      }
    }
    return json({ sent });
  } catch (err) {
    return errorResponse(err);
  }
}

export const GET = run;
export const POST = run;
