import { settingsSchema } from "@/lib/schemas";
import { db, type PostRow, type SettingsRow } from "@/lib/server/db";
import { HttpError, json, rateLimit, withUser } from "@/lib/server/http";
import { sendPostEmail } from "@/lib/server/mail";
import { getSettings, toSettings } from "@/lib/server/posts";

export const GET = withUser(async (user, req) => {
  return json({ settings: toSettings(await getSettings(user.uid, user.email, req.headers.get("x-timezone"))) });
});

export const PUT = withUser(async (user, req) => {
  const s = settingsSchema.parse(await req.json());
  const { data, error } = await db
    .from("notification_settings")
    .upsert(
      {
        owner_id: user.uid,
        enabled: s.enabled,
        email: s.email,
        lead_minutes: s.leadMinutes,
        subject_prefix: s.subjectPrefix,
        include_hashtags: s.includeHashtags,
        timezone: s.timezone,
      },
      { onConflict: "owner_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return json({ settings: toSettings(data as SettingsRow) });
});

// Sends a sample email with the saved settings so users can check delivery.
export const POST = withUser(async (user) => {
  rateLimit(`test-email:${user.uid}`, 3, 60_000);
  const settings = await getSettings(user.uid, user.email);
  if (!settings.email) throw new HttpError(400, "Add an email address first.");
  const sample = {
    platform: "instagram",
    caption: "This is how your scheduled post reminders will look. ✨",
    hashtags: ["#CaptionFlow", "#ContentCreator"],
    scheduled_at: new Date().toISOString(),
    notes: "Test email from your notification settings.",
  } as PostRow;
  try {
    await sendPostEmail(sample, settings, "test");
  } catch (err) {
    console.error("Test email failed", err);
    throw new HttpError(502, "The email could not be sent. Check the address and try again.");
  }
  return json({ ok: true });
});
