import { z } from "zod";
import { updatePostSchema } from "@/lib/schemas";
import { db, IMAGE_BUCKET, type PostRow } from "@/lib/server/db";
import { deleteDriveFile, syncPostToDrive } from "@/lib/server/drive";
import { json, withUser } from "@/lib/server/http";
import { driveToken, getOwnPost, toPost } from "@/lib/server/posts";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.uuid("Invalid post id.");

export const PATCH = withUser(async (user, req, { params }: Ctx) => {
  const id = idSchema.parse((await params).id);
  const input = updatePostSchema.parse(await req.json());
  const existing = await getOwnPost(user.uid, id);

  const changes: Partial<PostRow> = {};
  if (input.caption !== undefined) changes.caption = input.caption;
  if (input.hashtags !== undefined) changes.hashtags = input.hashtags;
  if (input.notes !== undefined) changes.notes = input.notes || null;
  if (input.scheduledAt !== undefined && input.scheduledAt !== existing.scheduled_at) {
    changes.scheduled_at = input.scheduledAt;
    // Rescheduling re-arms the email notification.
    changes.status = "scheduled";
    changes.notified_at = null;
  }

  const { data, error } = await db
    .from("posts")
    .update(changes)
    .eq("id", id)
    .eq("owner_id", user.uid)
    .select()
    .single();
  if (error) throw error;
  let row = data as PostRow;

  let driveSynced = false;
  const token = driveToken(req);
  if (token) {
    try {
      const fileId = await syncPostToDrive(token, row);
      if (fileId !== row.drive_file_id) {
        const updated = await db.from("posts").update({ drive_file_id: fileId }).eq("id", id).select().single();
        if (updated.data) row = updated.data as PostRow;
      }
      driveSynced = true;
    } catch (err) {
      console.error("Drive sync failed", err);
    }
  }

  return json({ post: await toPost(row), driveSynced });
});

export const DELETE = withUser(async (user, req, { params }: Ctx) => {
  const id = idSchema.parse((await params).id);
  const existing = await getOwnPost(user.uid, id);

  const { error } = await db.from("posts").delete().eq("id", id).eq("owner_id", user.uid);
  if (error) throw error;

  if (existing.image_path) await db.storage.from(IMAGE_BUCKET).remove([existing.image_path]);

  let driveSynced = false;
  const token = driveToken(req);
  if (token && existing.drive_file_id) {
    try {
      await deleteDriveFile(token, existing.drive_file_id);
      driveSynced = true;
    } catch (err) {
      console.error("Drive delete failed", err);
    }
  }
  return json({ ok: true, driveSynced });
});
