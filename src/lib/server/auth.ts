import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyIdToken, type SessionUser } from "./token";

export { SESSION_COOKIE, verifyIdToken, type SessionUser } from "./token";

/** Returns the signed-in user from the httpOnly session cookie, or null. */
export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifyIdToken(token);
  } catch {
    return null;
  }
}
