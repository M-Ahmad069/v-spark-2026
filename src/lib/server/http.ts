import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUser, type SessionUser } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Wraps a route handler: requires a signed-in user and turns errors into safe JSON responses. */
export function withUser<A extends unknown[]>(
  handler: (user: SessionUser, req: Request, ...args: A) => Promise<Response>,
) {
  return async (req: Request, ...args: A) => {
    try {
      const user = await getUser();
      if (!user) throw new HttpError(401, "Please sign in again.");
      return await handler(user, req, ...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  if (err instanceof ZodError) {
    return json({ error: err.issues[0]?.message ?? "Invalid input." }, 400);
  }
  console.error(err);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

// Simple per-user fixed-window limiter (per server instance) to protect paid/free API quotas.
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (++entry.count > max) throw new HttpError(429, "Too many requests. Please wait a minute.");
}
