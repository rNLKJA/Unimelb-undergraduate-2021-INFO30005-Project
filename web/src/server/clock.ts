import "server-only";

/** Request-time clock for Server Components (kept out of render bodies for the React lint rules). */
export function serverNow(): number {
  return Date.now();
}
