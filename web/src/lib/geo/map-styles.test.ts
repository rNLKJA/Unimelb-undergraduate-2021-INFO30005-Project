import { describe, expect, it } from "vitest";
import { FALLBACK_BASEMAP } from "./fallback-basemap";
import { basemapUrl, fallbackStyle } from "./map-styles";
import { MELBOURNE_BBOX, nearestSuburb, searchSuburbs } from "./suburbs";

describe("basemaps", () => {
  it("uses key-less OpenFreeMap styles", () => {
    expect(basemapUrl("light")).toMatch(/^https:\/\/tiles\.openfreemap\.org\/styles\//);
    expect(basemapUrl("dark")).toContain("/dark");
  });

  it("builds a self-contained fallback style (no glyphs, sprites or remote sources)", () => {
    const style = fallbackStyle("light");
    expect(style.version).toBe(8);
    expect(JSON.stringify(style)).not.toMatch(/https?:/);
    const kinds = new Set(FALLBACK_BASEMAP.features.map((f) => f.properties.kind));
    for (const layer of style.layers.filter((l) => "filter" in l)) {
      const kind = (layer as { filter: unknown[] }).filter[2] as string;
      expect(kinds.has(kind)).toBe(true);
    }
    expect(fallbackStyle("dark").layers[0]).not.toEqual(style.layers[0]);
  });

  it("keeps the fallback geometry inside Greater Melbourne", () => {
    for (const f of FALLBACK_BASEMAP.features) {
      const coords = (
        f.geometry.type === "Polygon" ? f.geometry.coordinates.flat() : f.geometry.coordinates
      ) as [number, number][];
      for (const [lng, lat] of coords) {
        expect(lng).toBeGreaterThanOrEqual(MELBOURNE_BBOX.minLng);
        expect(lng).toBeLessThanOrEqual(MELBOURNE_BBOX.maxLng);
        expect(lat).toBeGreaterThanOrEqual(MELBOURNE_BBOX.minLat);
        expect(lat).toBeLessThanOrEqual(MELBOURNE_BBOX.maxLat);
      }
    }
  });

  it("offers local suburb lookups for offline geocoding", () => {
    expect(nearestSuburb({ lat: -37.7983, lng: 144.961 }).name).toBe("Carlton");
    expect(searchSuburbs("carl").map((s) => s.name)).toEqual(["Carlton", "Carlton North"]);
  });
});
