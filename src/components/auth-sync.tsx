"use client";
import { onIdTokenChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/client/firebase";

/** Keeps the httpOnly session cookie in step with Firebase's (auto-refreshing) ID token. */
export function useAuthSync() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(
    () =>
      onIdTokenChanged(auth, async (u) => {
        if (u) {
          await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: await u.getIdToken() }),
          });
        }
        setUser(u);
      }),
    [],
  );
  return user;
}
