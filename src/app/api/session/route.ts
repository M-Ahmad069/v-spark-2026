import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE, verifyIdToken } from "@/lib/server/auth";
import { errorResponse, HttpError, json, rateLimit } from "@/lib/server/http";

const bodySchema = z.object({ idToken: z.string().min(100).max(4096) });

// Exchanges a fresh Firebase ID token for an httpOnly cookie. The browser re-posts
// whenever Firebase refreshes the token (about hourly), so the cookie never goes stale.
export async function POST(req: Request) {
  try {
    rateLimit(`session:${req.headers.get("x-forwarded-for") ?? "local"}`, 30, 60_000);
    const { idToken } = bodySchema.parse(await req.json());
    let user;
    try {
      user = await verifyIdToken(idToken);
    } catch {
      throw new HttpError(401, "Invalid sign-in token.");
    }
    (await cookies()).set(SESSION_COOKIE, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    return json({ uid: user.uid });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return json({ ok: true });
}
