import { FALLBACK_BASEMAP } from "./fallback-basemap";

/**
 * Basemaps: OpenFreeMap's free, key-less vector styles, plus a bundled
 * schematic fallback (no network needed) used when the tiles can't load.
 */
export const OPENFREEMAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

export function basemapUrl(theme: "light" | "dark"): string {
  return OPENFREEMAP_STYLES[theme];
}

const NUMERIC_COMPARISONS = new Set(["<", "<=", ">", ">="]);

/**
 * OpenFreeMap's styles compare optional feature properties with numbers
 * (e.g. `["<=", ["get", "ref_length"], 6]` on road shields). Features without
 * the property make MapLibre log "Expected value to be of type number, but
 * found null" on every tile. Prepend `["has", key]` guards to such `all`
 * filters; `all` short-circuits, so the comparison only runs when the
 * property exists and the rendered result is unchanged.
 */
export function guardNumericFilter(filter: unknown): unknown {
  if (!Array.isArray(filter)) return filter;
  const clauses = filter[0] === "all" ? filter.slice(1) : [filter];
  const keys: string[] = [];
  for (const clause of clauses) {
    if (
      Array.isArray(clause) &&
      NUMERIC_COMPARISONS.has(clause[0]) &&
      Array.isArray(clause[1]) &&
      clause[1][0] === "get" &&
      clause[1].length === 2 &&
      typeof clause[1][1] === "string" &&
      typeof clause[2] === "number"
    ) {
      keys.push(clause[1][1]);
    }
  }
  const missing = [...new Set(keys)].filter(
    (key) =>
      !clauses.some((c) => Array.isArray(c) && c[0] === "has" && c[1] === key && c.length === 2),
  );
  if (!missing.length) return filter;
  return ["all", ...missing.map((key) => ["has", key]), ...clauses];
}

/** A MapLibre style object rendering FALLBACK_BASEMAP (no glyphs or sprites required). */
export function fallbackStyle(theme: "light" | "dark") {
  const dark = theme === "dark";
  return {
    version: 8 as const,
    name: "snacks-fallback",
    sources: {
      basemap: { type: "geojson" as const, data: FALLBACK_BASEMAP },
    },
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": dark ? "#1b130e" : "#f7efe3" },
      },
      {
        id: "cbd",
        type: "fill" as const,
        source: "basemap",
        filter: ["==", ["get", "kind"], "cbd"],
        paint: { "fill-color": dark ? "#2a1e16" : "#efe1cc" },
      },
      {
        id: "campus",
        type: "fill" as const,
        source: "basemap",
        filter: ["==", ["get", "kind"], "campus"],
        paint: { "fill-color": dark ? "#302018" : "#f3dcc6" },
      },
      {
        id: "parks",
        type: "fill" as const,
        source: "basemap",
        filter: ["==", ["get", "kind"], "park"],
        paint: { "fill-color": dark ? "#1f2b1b" : "#d9e8cc" },
      },
      {
        id: "water",
        type: "fill" as const,
        source: "basemap",
        filter: ["==", ["get", "kind"], "water"],
        paint: { "fill-color": dark ? "#132029" : "#cfe2ec" },
      },
      {
        id: "rivers",
        type: "line" as const,
        source: "basemap",
        filter: ["==", ["get", "kind"], "river"],
        paint: { "line-color": dark ? "#1d3442" : "#a9cddd", "line-width": 4 },
      },
      {
        id: "roads",
        type: "line" as const,
        source: "basemap",
        filter: ["==", ["get", "kind"], "road"],
        layout: { "line-cap": "round" as const, "line-join": "round" as const },
        paint: {
          "line-color": dark ? "#4b3a2e" : "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 16, 7],
        },
      },
    ],
  };
}
