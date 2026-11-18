"use client";
import { GoogleAuthProvider, linkWithPopup, reauthenticateWithPopup, type UserCredential } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// Google access tokens last ~1 hour. Kept in sessionStorage (this tab only), never sent to our DB.
const KEY = "cf_drive_token";

export function saveDriveToken(result: UserCredential) {
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ token, exp: Date.now() + 55 * 60_000 }));
  } catch {}
}

export function getDriveToken(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { token, exp } = JSON.parse(raw);
    return exp > Date.now() ? token : null;
  } catch {
    return null;
  }
}

export function clearDriveToken() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

/** Opens Google consent for Drive. Links Google to email/password accounts when needed. */
export async function connectDrive() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const hasGoogle = user.providerData.some((p) => p.providerId === "google.com");
  const result = hasGoogle
    ? await reauthenticateWithPopup(user, googleProvider())
    : await linkWithPopup(user, googleProvider());
  saveDriveToken(result);
  return getDriveToken();
}
