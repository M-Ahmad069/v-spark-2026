"use client";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });

export const auth = getAuth(app);

/** Google provider that also asks for access to files this app creates in the user's Drive. */
export function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/drive.file");
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export function authErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return messages[code] ?? "Sign-in failed. Please try again.";
}
