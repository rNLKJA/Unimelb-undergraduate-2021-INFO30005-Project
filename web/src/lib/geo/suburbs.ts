import { haversineMeters, type LatLng } from "../distance";

/**
 * Approximate centroids of inner-Melbourne suburbs. Used as the fully local
 * fallback for reverse geocoding / search (when Photon and Nominatim are
 * unreachable) and as labels on the bundled fallback basemap.
 */
export type Suburb = LatLng & { name: string; postcode: string };

export const SUBURBS: readonly Suburb[] = [
  { name: "Melbourne", postcode: "3000", lat: -37.8136, lng: 144.9631 },
  { name: "Carlton", postcode: "3053", lat: -37.8001, lng: 144.9671 },
  { name: "Parkville", postcode: "3052", lat: -37.7871, lng: 144.9515 },
  { name: "North Melbourne", postcode: "3051", lat: -37.799, lng: 144.942 },
  { name: "West Melbourne", postcode: "3003", lat: -37.807, lng: 144.944 },
  { name: "Fitzroy", postcode: "3065", lat: -37.798, lng: 144.978 },
  { name: "Collingwood", postcode: "3066", lat: -37.802, lng: 144.988 },
  { name: "East Melbourne", postcode: "3002", lat: -37.813, lng: 144.985 },
  { name: "Southbank", postcode: "3006", lat: -37.823, lng: 144.965 },
  { name: "Docklands", postcode: "3008", lat: -37.816, lng: 144.946 },
  { name: "South Melbourne", postcode: "3205", lat: -37.834, lng: 144.958 },
  { name: "Richmond", postcode: "3121", lat: -37.823, lng: 145.0 },
  { name: "South Yarra", postcode: "3141", lat: -37.838, lng: 144.992 },
  { name: "St Kilda", postcode: "3182", lat: -37.865, lng: 144.98 },
  { name: "Port Melbourne", postcode: "3207", lat: -37.839, lng: 144.942 },
  { name: "Albert Park", postcode: "3206", lat: -37.841, lng: 144.955 },
  { name: "Prahran", postcode: "3181", lat: -37.851, lng: 144.993 },
  { name: "Brunswick", postcode: "3056", lat: -37.767, lng: 144.961 },
  { name: "Brunswick East", postcode: "3057", lat: -37.772, lng: 144.978 },
  { name: "Carlton North", postcode: "3054", lat: -37.784, lng: 144.972 },
  { name: "Fitzroy North", postcode: "3068", lat: -37.784, lng: 144.984 },
  { name: "Kensington", postcode: "3031", lat: -37.794, lng: 144.929 },
  { name: "Flemington", postcode: "3031", lat: -37.788, lng: 144.93 },
  { name: "Abbotsford", postcode: "3067", lat: -37.805, lng: 144.999 },
  { name: "Footscray", postcode: "3011", lat: -37.8, lng: 144.9 },
  { name: "Northcote", postcode: "3070", lat: -37.77, lng: 145.0 },
  { name: "Coburg", postcode: "3058", lat: -37.744, lng: 144.964 },
];

export function nearestSuburb(point: LatLng): Suburb & { meters: number } {
  let best = SUBURBS[0];
  let bestMeters = Infinity;
  for (const s of SUBURBS) {
    const m = haversineMeters(point, s);
    if (m < bestMeters) {
      best = s;
      bestMeters = m;
    }
  }
  return { ...best, meters: bestMeters };
}

export function searchSuburbs(query: string, limit = 5): Suburb[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SUBURBS.filter((s) => s.name.toLowerCase().includes(q) || s.postcode.startsWith(q)).slice(
    0,
    limit,
  );
}

/** Rough bounding box of Greater Melbourne for biasing geocoder searches. */
export const MELBOURNE_BBOX = { minLng: 144.5, minLat: -38.2, maxLng: 145.5, maxLat: -37.5 };
