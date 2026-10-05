import "server-only";
import { randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-cookies";

/**
 * Signed, httpOnly cookie sessions (HS256 JWTs via `jose`).
 *
 * The 2021 app used express-session + two passport-local strategies and a
 * single session that was either a customer or a van. The revival keeps the
 * two portals separate but lets one browser be signed in to both at once
 * (customer, vendor and admin each get their own cookie), which is what makes
 * the side-by-side demo possible.
 */
export type Role = "customer" | "vendor" | "admin";

const COOKIE: Record<Role, string> = SESSION_COOKIE;

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ISSUER = "snacks-in-a-van";

let cachedKey: Uint8Array | undefined;

function secretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured && configured.length >= 16) {
    cachedKey = new TextEncoder().encode(configured);
  } else if (process.env.NODE_ENV !== "production") {
    cachedKey = new TextEncoder().encode("dev-only-session-secret-do-not-use-in-production");
  } else {
    // No secret configured in production: fall back to a random per-instance key.
    // Sessions stay unforgeable; they simply reset when the instance restarts.
    console.warn("SESSION_SECRET is not set; using a random per-instance session key.");
    cachedKey = new Uint8Array(randomBytes(32));
  }
  return cachedKey;
}

export async function signSession(role: Role, subject: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(role: Role, token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    if (payload.role !== role || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/** Start a session (Server Actions / Route Handlers only). */
export async function startSession(role: Role, subject: string): Promise<void> {
  const token = await signSession(role, subject);
  const jar = await cookies();
  jar.set(COOKIE[role], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(role: Role): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE[role]);
}

/** The signed-in subject for a role (customer_id, van_id or admin username). */
export async function readSession(role: Role): Promise<string | null> {
  const jar = await cookies();
  return verifySession(role, jar.get(COOKIE[role])?.value);
}
