import "server-only";
import type { LatLng } from "@/lib/distance";
import {
  coordKey,
  formatNominatimAddress,
  nominatimPlaceToResult,
  photonFeatureToResult,
  type GeocodeResult,
  type NominatimAddress,
  type NominatimPlace,
  type PhotonFeature,
} from "@/lib/geocode-format";
import { MELBOURNE_BBOX, nearestSuburb, searchSuburbs } from "@/lib/geo/suburbs";

/**
 * Server-side geocoding through free, key-less services:
 *  1. Photon (photon.komoot.io) — primary, for reverse lookups and search;
 *  2. Nominatim — fallback, at most one request a second as its usage policy
 *     requires. Its policy rules out autocomplete, so search only falls back
 *     to it when the visitor explicitly submits a query (presses Enter);
 *  3. the bundled suburb list — fully local last resort.
 * Responses are cached in memory and every request identifies the app. When
 * Photon times out or errors it is skipped for a minute, so a slow upstream
 * doesn't make every keystroke wait for the full timeout.
 */
const REPO = "https://github.com/rNLKJA/Unimelb-undergraduate-2021-INFO30005-Project";
const USER_AGENT = `SnacksInAVan/1.0 (+${process.env.GEOCODER_CONTACT?.trim() || REPO})`;
const PHOTON_REVERSE_TIMEOUT_MS = 3000;
const PHOTON_SEARCH_TIMEOUT_MS = 5000;
const NOMINATIM_TIMEOUT_MS = 4000;
const NOMINATIM_INTERVAL_MS = 1100;
const PHOTON_COOLDOWN_MS = 60_000;
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

async function getJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "en" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

let photonDownUntil = 0;

/** Photon with a simple circuit breaker: after a failure, skip it for a minute. */
async function photon<T>(url: string, timeoutMs: number): Promise<T | null> {
  if (Date.now() < photonDownUntil) return null;
  const result = await getJson<T>(url, timeoutMs);
  if (result === null) photonDownUntil = Date.now() + PHOTON_COOLDOWN_MS;
  return result;
}

let nextNominatimSlot = 0;

/**
 * Reserve the next Nominatim request slot (one a second across this server
 * instance). Waits up to `maxWaitMs` for it; returns false if it is further off.
 */
async function reserveNominatimSlot(maxWaitMs: number): Promise<boolean> {
  const now = Date.now();
  const slot = Math.max(now, nextNominatimSlot);
  if (slot - now > maxWaitMs) return false;
  nextNominatimSlot = slot + NOMINATIM_INTERVAL_MS;
  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
  return true;
}

/** Test hook: forget cached answers, the breaker and the Nominatim slot. */
export function __resetGeocoder() {
  reverseCache.clear();
  searchCache.clear();
  photonDownUntil = 0;
  nextNominatimSlot = 0;
}

function localReverse(point: LatLng): GeocodeResult {
  const suburb = nearestSuburb(point);
  return { ...point, label: `Near ${suburb.name} VIC ${suburb.postcode}`, source: "local" };
}

export async function reverseGeocode(point: LatLng): Promise<GeocodeResult> {
  const key = coordKey(point);
  const cached = cacheGet(reverseCache, key);
  if (cached) return cached;

  const found = await photon<{ features?: PhotonFeature[] }>(
    `https://photon.komoot.io/reverse?lat=${point.lat}&lon=${point.lng}&lang=en&limit=1`,
    PHOTON_REVERSE_TIMEOUT_MS,
  );
  let result = found?.features?.length ? photonFeatureToResult(found.features[0]) : null;
  if (result) result = { ...result, lat: point.lat, lng: point.lng };

  if (!result && (await reserveNominatimSlot(0))) {
    const nominatim = await getJson<{ address?: NominatimAddress; display_name?: string }>(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&zoom=18&addressdetails=1`,
      NOMINATIM_TIMEOUT_MS,
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

export type PlaceSearchResult = {
  results: GeocodeResult[];
  /** True when street-level search was unavailable and only local suburbs were checked. */
  degraded: boolean;
};

function localSearch(q: string): GeocodeResult[] {
  return searchSuburbs(q).map((s) => ({
    lat: s.lat,
    lng: s.lng,
    label: `${s.name} VIC ${s.postcode}`,
    source: "local" as const,
  }));
}

/**
 * Place search biased to Greater Melbourne. `submit` marks an explicit search
 * (Enter), which may fall back to Nominatim; keystroke searches never do.
 */
export async function searchPlaces(
  query: string,
  { submit = false }: { submit?: boolean } = {},
): Promise<PlaceSearchResult> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return { results: [], degraded: false };
  const key = q.toLowerCase();
  const cached = cacheGet(searchCache, key);
  if (cached) return { results: cached, degraded: false };

  const bbox = MELBOURNE_BBOX;
  const found = await photon<{ features?: PhotonFeature[] }>(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=-37.8136&lon=144.9631&limit=6&lang=en&bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    PHOTON_SEARCH_TIMEOUT_MS,
  );
  if (found) {
    const results = (found.features ?? [])
      .map(photonFeatureToResult)
      .filter((r): r is GeocodeResult => r !== null);
    if (results.length) {
      cacheSet(searchCache, key, results);
      return { results, degraded: false };
    }
    return { results: localSearch(q), degraded: false };
  }

  if (submit && (await reserveNominatimSlot(2000))) {
    const places = await getJson<NominatimPlace[]>(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=au&viewbox=${bbox.minLng},${bbox.maxLat},${bbox.maxLng},${bbox.minLat}&bounded=1&limit=6&addressdetails=1`,
      NOMINATIM_TIMEOUT_MS,
    );
    if (Array.isArray(places)) {
      const results = places
        .map(nominatimPlaceToResult)
        .filter((r): r is GeocodeResult => r !== null);
      if (results.length) {
        cacheSet(searchCache, key, results);
        return { results, degraded: false };
      }
      return { results: localSearch(q), degraded: false };
    }
  }

  return { results: localSearch(q), degraded: true };
}
