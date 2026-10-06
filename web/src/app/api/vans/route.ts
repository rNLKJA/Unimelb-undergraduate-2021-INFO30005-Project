import { NextResponse, type NextRequest } from "next/server";
import { MELBOURNE_UNI, nearestVans } from "@/lib/nearest-vans";
import { listVans } from "@/server/vans";

/**
 * All vans plus the five nearest open ones to `?lat=&lng=` — the revival of
 * `GET/POST /customer/map` (`van_location` + `locate_van`).
 */
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const origin =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    (lat || lng)
      ? { lat, lng }
      : MELBOURNE_UNI;
  const vans = await listVans();
  const byId = new Map(vans.map((v) => [v.vanId, v]));
  const nearest = nearestVans(
    vans.map((v) => ({ ...v, xCoord: v.lat, yCoord: v.lng })),
    origin,
  ).map((ranked) => ({ ...byId.get(ranked.vanId)!, dist: ranked.dist, meters: ranked.meters }));
  return NextResponse.json(
    { origin, vans, nearest, serverNow: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
