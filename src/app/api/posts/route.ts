import { createPostSchema } from "@/lib/schemas";
import { db, type PostRow } from "@/lib/server/db";
import { syncPostToDrive } from "@/lib/server/drive";
import { HttpError, json, rateLimit, withUser } from "@/lib/server/http";
import { driveToken, getSettings, toPost } from "@/lib/server/posts";

export const GET = withUser(async (user) => {
  const { data, error } = await db
    .from("posts")
    .select("*")
    .eq("owner_id", user.uid)
    .order("scheduled_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return json({ posts: await Promise.all((data as PostRow[]).map(toPost)) });
});

export const POST = withUser(async (user, req) => {
  rateLimit(`posts:${user.uid}`, 30, 60_000);
  const input = createPostSchema.parse(await req.json());
  // Make sure notification defaults exist so this post gets its reminder email.
  await getSettings(user.uid, user.email, req.headers.get("x-timezone"));
  if (input.imagePath && !input.imagePath.startsWith(`${user.uid}/`)) {
    throw new HttpError(403, "That image does not belong to you.");
  }

  const { data, error } = await db
    .from("posts")
    .insert({
      owner_id: user.uid,
      prompt: input.prompt,
      platform: input.platform,
      caption: input.caption,
      hashtags: input.hashtags,
      scheduled_at: input.scheduledAt,
      notes: input.notes || null,
      image_path: input.imagePath ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  let row = data as PostRow;

  // Drive sync is best-effort: the post is already safely saved in the database.
  let driveSynced = false;
  const token = driveToken(req);
  if (token) {
    try {
      const fileId = await syncPostToDrive(token, row);
      const updated = await db.from("posts").update({ drive_file_id: fileId }).eq("id", row.id).select().single();
      if (updated.data) row = updated.data as PostRow;
      driveSynced = true;
    } catch (err) {
      console.error("Drive sync failed", err);
    }
  }

  return json({ post: await toPost(row), driveSynced }, 201);
});
