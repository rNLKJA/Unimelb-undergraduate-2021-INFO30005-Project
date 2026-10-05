/**
 * Turn Photon / Nominatim results into short Australian-style addresses
 * ("State Library Victoria, 328 Swanston Street, Melbourne VIC 3000").
 *
 * The 2021 app reverse-geocoded the van's GPS fix with OpenCage
 * (`vendorController.getVanLocation`) and stored `results[0].formatted`; a
 * vendor-typed address took precedence. The revival keeps that precedence but
 * uses the free, key-less Photon service (with Nominatim as fallback).
 */
import type { LatLng } from "./distance";

export type GeocodeResult = LatLng & { label: string; source: "photon" | "nominatim" | "local" };

const STATE_ABBR: Record<string, string> = {
  victoria: "VIC",
  "new south wales": "NSW",
  queensland: "QLD",
  "south australia": "SA",
  "western australia": "WA",
  tasmania: "TAS",
  "northern territory": "NT",
  "australian capital territory": "ACT",
};

export function stateAbbreviation(state: string | undefined): string | undefined {
  if (!state) return undefined;
  return STATE_ABBR[state.trim().toLowerCase()] ?? state.trim();
}

export type PhotonProperties = {
  name?: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
  district?: string;
  locality?: string;
  state?: string;
  country?: string;
  countrycode?: string;
};

function joinParts(parts: (string | undefined)[], sep: string): string {
  return parts
    .map((p) => p?.trim())
    .filter((p): p is string => !!p)
    .join(sep);
}

export function formatPhotonAddress(p: PhotonProperties): string {
  const streetLine = joinParts([p.housenumber, p.street], " ");
  const suburb = p.locality ?? p.district ?? p.city;
  const region = joinParts([suburb, stateAbbreviation(p.state), p.postcode], " ");
  const name = p.name && p.name !== p.street && p.name !== suburb ? p.name : undefined;
  const label = joinParts([name, streetLine, region], ", ");
  return label || joinParts([p.city, p.country], ", ");
}

export type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: PhotonProperties;
};

export function photonFeatureToResult(feature: PhotonFeature): GeocodeResult | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const label = formatPhotonAddress(feature.properties ?? {});
  if (!label) return null;
  return { lat: coords[1], lng: coords[0], label, source: "photon" };
}

export type NominatimAddress = {
  amenity?: string;
  building?: string;
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  state?: string;
  postcode?: string;
};

export function formatNominatimAddress(a: NominatimAddress, fallback = ""): string {
  const name = a.amenity ?? a.building;
  const streetLine = joinParts([a.house_number, a.road], " ");
  const suburb = a.suburb ?? a.neighbourhood ?? a.town ?? a.city;
  const region = joinParts([suburb, stateAbbreviation(a.state), a.postcode], " ");
  return joinParts([name, streetLine, region], ", ") || fallback;
}

/** Round coordinates for cache keys (~11 m at 4 dp). */
export function coordKey(point: LatLng, dp = 4): string {
  return `${point.lat.toFixed(dp)},${point.lng.toFixed(dp)}`;
}
