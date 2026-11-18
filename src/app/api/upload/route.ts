import { db, IMAGE_BUCKET, signedImageUrl } from "@/lib/server/db";
import { HttpError, json, rateLimit, withUser } from "@/lib/server/http";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Checks the real file signature, not just the browser-supplied type.
function sniff(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP")
    return "image/webp";
  return null;
}

export const POST = withUser(async (user, req) => {
  rateLimit(`upload:${user.uid}`, 20, 60_000);
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file received.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Image must be 5 MB or smaller.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) throw new HttpError(415, "Only JPG, PNG or WebP images are allowed.");

  const path = `${user.uid}/${crypto.randomUUID()}.${TYPES[type]}`;
  const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: type });
  if (error) throw error;

  return json({ path, url: await signedImageUrl(path) }, 201);
});
