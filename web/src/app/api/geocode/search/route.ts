import { NextResponse, type NextRequest } from "next/server";
import { searchPlaces } from "@/server/geocode";
import { clientKey, rateLimit } from "@/server/rate-limit";

/** Place search / autocomplete proxy, biased to Greater Melbourne. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(`search:${clientKey(request.headers)}`, 40, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchPlaces(q);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=600" } });
}
