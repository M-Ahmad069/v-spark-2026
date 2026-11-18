"use client";
import { getDriveToken } from "./drive-token";

/** fetch wrapper: JSON in/out, attaches the Drive token, throws readable errors. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");
  const drive = getDriveToken();
  if (drive) headers.set("x-drive-token", drive);
  headers.set("x-timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);

  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
  } catch {
    throw new Error("Network error. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  // Plain helper outside React, so a full navigation to the login page is intended here.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (res.status === 401 && typeof window !== "undefined") window.location.assign("/login");
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data as T;
}
