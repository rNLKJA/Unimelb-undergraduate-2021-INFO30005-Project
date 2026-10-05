import { beforeAll, describe, expect, it } from "vitest";
import { loadLegacyUtility, type LegacyUtility } from "@/test/legacy";
import { formatDistance, haversineMeters, legacyEuclideanDistance } from "./distance";
import { MELBOURNE_UNI } from "./nearest-vans";

let original: LegacyUtility;
beforeAll(() => {
  original = loadLegacyUtility();
});

const POINTS = [
  { lat: -37.7983, lng: 144.961 },
  { lat: -37.8098, lng: 144.9652 },
  { lat: -37.818, lng: 144.9691 },
  { lat: -37.784, lng: 144.9515 },
  { lat: -37.79631, lng: 144.96141 },
  { lat: -37.7963, lng: 144.9614 },
  { lat: -36.63644, lng: 127.11254 }, // the Postman collection's (swapped) test coords
  { lat: -37.123456789, lng: 145.987654321 },
];

describe("legacyEuclideanDistance matches utility.euclidean_distance", () => {
  it.each(POINTS)("van %o vs Melbourne Uni", (van) => {
    expect(legacyEuclideanDistance(van, MELBOURNE_UNI)).toBe(
      original.euclidean_distance(van, MELBOURNE_UNI),
    );
  });

  it("collapses very close vans to 0 because the squared sum is rounded first", () => {
    expect(legacyEuclideanDistance({ lat: -37.799, lng: 144.962 }, MELBOURNE_UNI)).toBe(
      original.euclidean_distance({ lat: -37.799, lng: 144.962 }, MELBOURNE_UNI),
    );
    expect(legacyEuclideanDistance({ lat: -37.7965, lng: 144.9616 }, MELBOURNE_UNI)).toBe(0);
  });
});

describe("haversine display distance", () => {
  it("Melbourne Uni to Federation Square is about 2.5 km", () => {
    const m = haversineMeters(MELBOURNE_UNI, { lat: -37.818, lng: 144.9691 });
    expect(m).toBeGreaterThan(2300);
    expect(m).toBeLessThan(2700);
    expect(formatDistance(m)).toMatch(/^2\.\d km$/);
  });
  it("formats short distances in metres", () => {
    expect(formatDistance(234)).toBe("230 m");
    expect(formatDistance(3)).toBe("10 m");
  });
});
