import { haversineMeters, legacyEuclideanDistance, type LatLng } from "./distance";

/** Default map centre used by the original map views: the University of Melbourne. */
export const MELBOURNE_UNI: LatLng = { lat: -37.7963, lng: 144.9614 };
export const DEFAULT_ZOOM = 12;

/** How many vans the original `locate_van` controller returned. */
export const NEAREST_VAN_COUNT = 5;

/** Van status values from the original schema: "1" = open, "0" = closed. */
export const VAN_OPEN = "1";
export const VAN_CLOSED = "0";

export type VanLike = {
  vanId: string;
  /** Latitude — the original schema called this `x_coord`. */
  xCoord: number;
  /** Longitude — the original schema called this `y_coord`. */
  yCoord: number;
  address: string;
  status: string;
};

export type RankedVan<T extends VanLike> = T & {
  /** The original (degree-space) euclidean score used for ranking. */
  dist: number;
  /** Real-world distance for display. */
  meters: number;
};

/**
 * The original query filter: `{ status: "1", address: { $ne: "" } }` —
 * only open vans that have published an address appear on the map.
 */
export function isVisibleOnMap(van: VanLike): boolean {
  return van.status === VAN_OPEN && van.address !== "";
}

/**
 * Port of `customerController.locate_van`: filter to open vans, score each with
 * the legacy euclidean distance, sort ascending (stable, so ties keep database
 * order) and keep the first five.
 */
export function nearestVans<T extends VanLike>(
  vans: readonly T[],
  user: LatLng,
  count: number = NEAREST_VAN_COUNT,
): RankedVan<T>[] {
  return vans
    .filter(isVisibleOnMap)
    .map((van) => scoreVan(van, user))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count);
}

/** Attach the legacy ranking score and the display distance to one van. */
export function scoreVan<T extends VanLike>(van: T, user: LatLng): RankedVan<T> {
  const position = { lat: van.xCoord, lng: van.yCoord };
  return {
    ...van,
    dist: legacyEuclideanDistance(position, user),
    meters: haversineMeters(position, user),
  };
}

export type SelectedVan<T extends VanLike> = RankedVan<T> & {
  /** 1-based position in the nearest list, or null when the van is outside the top five. */
  rank: number | null;
};

/**
 * Resolve the van the customer picked. Any open van on the map can be chosen
 * (the 2021 dropdown listed every open van), not only the five nearest; with
 * no valid choice the closest van is the default.
 */
export function resolveSelectedVan<T extends VanLike>(
  vans: readonly T[],
  nearest: readonly RankedVan<T>[],
  selectedId: string | null,
  user: LatLng,
): SelectedVan<T> | null {
  if (selectedId) {
    const index = nearest.findIndex((v) => v.vanId === selectedId);
    if (index >= 0) return { ...nearest[index], rank: index + 1 };
    const other = vans.find((v) => v.vanId === selectedId && isVisibleOnMap(v));
    if (other) return { ...scoreVan(other, user), rank: null };
  }
  return nearest[0] ? { ...nearest[0], rank: 1 } : null;
}
