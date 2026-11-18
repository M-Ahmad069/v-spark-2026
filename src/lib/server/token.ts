import { createRemoteJWKSet, jwtVerify } from "jose";

export const SESSION_COOKIE = "cf_session";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

// Google's public keys for Firebase ID tokens (cached by jose).
const jwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export type SessionUser = { uid: string; email: string | null; name: string | null };

export async function verifyIdToken(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });
  if (!payload.sub) throw new Error("Token has no subject");
  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}
