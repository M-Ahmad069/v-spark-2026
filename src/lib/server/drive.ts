import "server-only";
import type { PostRow } from "./db";

// Google Drive sync using the user's own OAuth access token (drive.file scope:
// the app can only see files it created). The token is used per request and never stored.

const FOLDER_NAME = "CaptionFlow Posts";
const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

async function drive(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok && res.status !== 404) throw new Error(`Drive ${res.status}: ${await res.text()}`);
  return res;
}

async function folderId(token: string) {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const found = await (await drive(token, `${API}?q=${q}&fields=files(id)&spaces=drive`)).json();
  if (found.files?.[0]?.id) return found.files[0].id as string;
  const created = await drive(token, `${API}?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  return (await created.json()).id as string;
}

function fileBody(post: PostRow) {
  return JSON.stringify(
    {
      id: post.id,
      platform: post.platform,
      caption: post.caption,
      hashtags: post.hashtags,
      scheduledAt: post.scheduled_at,
      notes: post.notes,
      status: post.status,
      prompt: post.prompt,
      updatedAt: post.updated_at,
    },
    null,
    2,
  );
}

function multipart(metadata: object, content: string) {
  const boundary = "captionflow" + crypto.randomUUID();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

/** Creates or updates the post's JSON file in Drive. Returns the Drive file id. */
export async function syncPostToDrive(token: string, post: PostRow): Promise<string> {
  const name = `post-${post.scheduled_at.slice(0, 16).replace(/[:T]/g, "-")}-${post.id.slice(0, 8)}.json`;
  if (post.drive_file_id) {
    const { body, contentType } = multipart({ name }, fileBody(post));
    const res = await drive(token, `${UPLOAD}/${post.drive_file_id}?uploadType=multipart&fields=id`, {
      method: "PATCH",
      headers: { "Content-Type": contentType },
      body,
    });
    if (res.status !== 404) return post.drive_file_id;
  }
  const { body, contentType } = multipart(
    { name, mimeType: "application/json", parents: [await folderId(token)] },
    fileBody(post),
  );
  const res = await drive(token, `${UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
  return (await res.json()).id as string;
}

export async function deleteDriveFile(token: string, fileId: string) {
  await drive(token, `${API}/${fileId}`, { method: "DELETE" });
}
