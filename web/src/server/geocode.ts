import "server-only";
import type { LatLng } from "@/lib/distance";
import {
  coordKey,
  formatNominatimAddress,
  photonFeatureToResult,
  type GeocodeResult,
  type NominatimAddress,
  type PhotonFeature,
} from "@/lib/geocode-format";
import { MELBOURNE_BBOX, nearestSuburb, searchSuburbs } from "@/lib/geo/suburbs";

/**
 * Server-side geocoding through free, key-less services:
 *  1. Photon (photon.komoot.io) — primary, for reverse lookups and search;
 *  2. Nominatim — reverse-lookup fallback only, at most one request a second
 *     as its usage policy requires;
 *  3. the bundled suburb list — fully local last resort.
 * Responses are cached in memory and every request identifies the app.
 */
const REPO = "https://github.com/rNLKJA/Unimelb-undergraduate-2021-INFO30005-Project";
const USER_AGENT = `SnacksInAVan/1.0 (+${process.env.GEOCODER_CONTACT?.trim() || REPO})`;
const TIMEOUT_MS = 3000;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

type Entry<T> = { value: T; expires: number };
const reverseCache = new Map<string, Entry<GeocodeResult>>();
const searchCache = new Map<string, Entry<GeocodeResult[]>>();

function cacheGet<T>(cache: Map<string, Entry<T>>, key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet<T>(cache: Map<string, Entry<T>>, key: string, value: T) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + TTL_MS });
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "en" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

let lastNominatimCall = 0;

function localReverse(point: LatLng): GeocodeResult {
  const suburb = nearestSuburb(point);
  return { ...point, label: `Near ${suburb.name} VIC ${suburb.postcode}`, source: "local" };
}

export async function reverseGeocode(point: LatLng): Promise<GeocodeResult> {
  const key = coordKey(point);
  const cached = cacheGet(reverseCache, key);
  if (cached) return cached;

  const photon = await getJson<{ features?: PhotonFeature[] }>(
    `https://photon.komoot.io/reverse?lat=${point.lat}&lon=${point.lng}&lang=en&limit=1`,
  );
  let result = photon?.features?.length ? photonFeatureToResult(photon.features[0]) : null;
  if (result) result = { ...result, lat: point.lat, lng: point.lng };

  if (!result && Date.now() - lastNominatimCall > 1100) {
    lastNominatimCall = Date.now();
    const nominatim = await getJson<{ address?: NominatimAddress; display_name?: string }>(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&zoom=18&addressdetails=1`,
    );
    const label = nominatim?.address
      ? formatNominatimAddress(nominatim.address, nominatim.display_name ?? "")
      : "";
    if (label) result = { ...point, label, source: "nominatim" };
  }

  const final = result ?? localReverse(point);
  if (final.source !== "local") cacheSet(reverseCache, key, final);
  return final;
}

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const cached = cacheGet(searchCache, key);
  if (cached) return cached;

  const bbox = `${MELBOURNE_BBOX.minLng},${MELBOURNE_BBOX.minLat},${MELBOURNE_BBOX.maxLng},${MELBOURNE_BBOX.maxLat}`;
  const photon = await getJson<{ features?: PhotonFeature[] }>(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=-37.8136&lon=144.9631&limit=6&lang=en&bbox=${bbox}`,
  );
  const results = (photon?.features ?? [])
    .map(photonFeatureToResult)
    .filter((r): r is GeocodeResult => r !== null);

  if (results.length) {
    cacheSet(searchCache, key, results);
    return results;
  }
  return searchSuburbs(q).map((s) => ({
    lat: s.lat,
    lng: s.lng,
    label: `${s.name} VIC ${s.postcode}`,
    source: "local" as const,
  }));
}
