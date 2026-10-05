export type LatLng = { lat: number; lng: number };

/**
 * Port of `utility.euclidean_distance(van_coords, user_coords)`.
 *
 * Kept bug-for-bug because it decides which vans are "nearest": both points
 * are rounded to 5 decimal places, the squared degree differences are summed,
 * and the *sum* is rounded to 5 decimal places before the square root. Very
 * close vans therefore tie at 0 and keep their database order.
 */
export function legacyEuclideanDistance(van: LatLng, user: LatLng): number {
  let distance = 0;
  distance += (Number(van.lat.toFixed(5)) - Number(user.lat.toFixed(5))) ** 2;
  distance += (Number(van.lng.toFixed(5)) - Number(user.lng.toFixed(5))) ** 2;
  return Math.sqrt(Number(distance.toFixed(5)));
}

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in metres — used only for display ("850 m away"). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

/** Rough walking time at 5 km/h, rounded up to whole minutes. */
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.ceil(meters / (5000 / 60)));
}
