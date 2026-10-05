import { NextResponse, type NextRequest } from "next/server";
import { reverseGeocode } from "@/server/geocode";
import { clientKey, rateLimit } from "@/server/rate-limit";

/** Reverse geocoding proxy (Photon -> Nominatim -> local suburbs). */
export async function GET(request: NextRequest) {
  const limited = rateLimit(`reverse:${clientKey(request.headers)}`, 30, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  const result = await reverseGeocode({ lat, lng });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=3600" } });
}
