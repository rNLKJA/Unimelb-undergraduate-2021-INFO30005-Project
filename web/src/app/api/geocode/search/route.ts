import { NextResponse, type NextRequest } from "next/server";
import { searchPlaces } from "@/server/geocode";
import { clientKey, rateLimit } from "@/server/rate-limit";

/**
 * Place search / autocomplete proxy, biased to Greater Melbourne.
 * `?submit=1` marks an explicit search (Enter), which may use Nominatim when
 * Photon is unavailable; `degraded: true` tells the client only suburbs were checked.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(`search:${clientKey(request.headers)}`, 40, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const submit = request.nextUrl.searchParams.get("submit") === "1";
  const { results, degraded } = await searchPlaces(q, { submit });
  return NextResponse.json(
    { results, degraded },
    { headers: { "Cache-Control": degraded ? "no-store" : "private, max-age=600" } },
  );
}
