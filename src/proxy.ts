import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyIdToken } from "@/lib/server/token";

// Protected routes: /app requires a valid, signature-checked Firebase session.
// API routes verify the token again on every request.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = token ? await verifyIdToken(token).then(() => true, () => false) : false;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/app") && !valid) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  if (pathname === "/login" && valid) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/login"] };
