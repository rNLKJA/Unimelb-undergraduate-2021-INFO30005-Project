import "server-only";

/**
 * Tiny fixed-window rate limiter (per server instance) used to keep the public
 * geocoding proxy polite towards the free upstream services.
 */
const windows = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()) {
  const current = windows.get(key);
  if (!current || current.reset <= now) {
    if (windows.size > 5000) windows.clear();
    windows.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  current.count += 1;
  return { ok: current.count <= limit, remaining: Math.max(0, limit - current.count) };
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "local";
}
