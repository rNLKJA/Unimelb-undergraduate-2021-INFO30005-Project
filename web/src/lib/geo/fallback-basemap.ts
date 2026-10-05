/**
 * A tiny, hand-drawn schematic basemap of inner Melbourne (bay, rivers, parks,
 * the Hoddle grid and a few arterial roads). It is bundled with the app and
 * rendered by MapLibre when the OpenFreeMap vector tiles cannot be loaded
 * (offline, blocked, or the tile service is down), so the van map still works.
 * Coordinates are approximate and intentionally simplified — this is a
 * fallback, not a survey.
 */
type Position = [number, number];
type Feature = {
  type: "Feature";
  properties: { kind: string; name: string };
  geometry:
    | { type: "Polygon"; coordinates: Position[][] }
    | { type: "LineString"; coordinates: Position[] };
};
export type FallbackFeatureCollection = { type: "FeatureCollection"; features: Feature[] };

const polygon = (kind: string, name: string, ring: Position[]): Feature => ({
  type: "Feature",
  properties: { kind, name },
  geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
});

const line = (kind: string, name: string, coordinates: Position[]): Feature => ({
  type: "Feature",
  properties: { kind, name },
  geometry: { type: "LineString", coordinates },
});

export const FALLBACK_BASEMAP: FallbackFeatureCollection = {
  type: "FeatureCollection",
  features: [
    polygon("water", "Port Phillip Bay", [
      [144.6, -37.87],
      [144.83, -37.87],
      [144.875, -37.862],
      [144.905, -37.868],
      [144.912, -37.858],
      [144.906, -37.846],
      [144.915, -37.838],
      [144.931, -37.846],
      [144.945, -37.85],
      [144.96, -37.855],
      [144.97, -37.864],
      [144.975, -37.868],
      [144.982, -37.884],
      [144.985, -37.905],
      [144.99, -37.925],
      [145.0, -37.94],
      [145.005, -37.952],
      [145.01, -38.1],
      [144.6, -38.1],
    ]),
    polygon("park", "Royal Park", [
      [144.944, -37.776],
      [144.957, -37.775],
      [144.958, -37.792],
      [144.951, -37.795],
      [144.944, -37.788],
    ]),
    polygon("park", "Princes Park", [
      [144.9585, -37.776],
      [144.9625, -37.7755],
      [144.9635, -37.7895],
      [144.959, -37.79],
    ]),
    polygon("campus", "University of Melbourne", [
      [144.957, -37.7955],
      [144.9655, -37.7945],
      [144.9662, -37.8008],
      [144.9575, -37.8015],
    ]),
    polygon("park", "Carlton Gardens", [
      [144.969, -37.802],
      [144.973, -37.8015],
      [144.9737, -37.8075],
      [144.9697, -37.808],
    ]),
    polygon("park", "Flagstaff Gardens", [
      [144.953, -37.809],
      [144.957, -37.8085],
      [144.9575, -37.812],
      [144.9535, -37.8125],
    ]),
    polygon("park", "Fitzroy Gardens", [
      [144.978, -37.811],
      [144.982, -37.8105],
      [144.983, -37.816],
      [144.979, -37.8165],
    ]),
    polygon("park", "Yarra Park", [
      [144.979, -37.8165],
      [144.988, -37.818],
      [144.987, -37.8235],
      [144.978, -37.822],
    ]),
    polygon("park", "Kings Domain & Botanic Gardens", [
      [144.9705, -37.8225],
      [144.985, -37.826],
      [144.986, -37.8365],
      [144.973, -37.838],
    ]),
    polygon("park", "Albert Park", [
      [144.958, -37.836],
      [144.975, -37.8385],
      [144.976, -37.852],
      [144.962, -37.853],
    ]),
    polygon("cbd", "Hoddle Grid", [
      [144.9528, -37.8206],
      [144.9727, -37.8152],
      [144.9701, -37.8085],
      [144.9502, -37.814],
    ]),
    line("river", "Yarra River", [
      [144.912, -37.838],
      [144.918, -37.828],
      [144.925, -37.822],
      [144.935, -37.822],
      [144.945, -37.8225],
      [144.955, -37.8215],
      [144.962, -37.8195],
      [144.9675, -37.8195],
      [144.975, -37.8215],
      [144.982, -37.8235],
      [144.99, -37.8255],
      [144.998, -37.826],
      [145.003, -37.82],
      [145.0, -37.81],
      [144.998, -37.8],
      [145.005, -37.795],
      [145.012, -37.79],
    ]),
    line("river", "Maribyrnong River", [
      [144.914, -37.82],
      [144.905, -37.81],
      [144.896, -37.795],
      [144.89, -37.78],
    ]),
    line("road", "Swanston St / St Kilda Rd", [
      [144.9625, -37.785],
      [144.964, -37.7985],
      [144.9671, -37.8178],
      [144.9725, -37.83],
      [144.978, -37.845],
      [144.981, -37.862],
    ]),
    line("road", "Royal Pde / Elizabeth St", [
      [144.957, -37.775],
      [144.959, -37.7995],
      [144.9645, -37.8185],
    ]),
    line("road", "Flinders St", [
      [144.9528, -37.8206],
      [144.9727, -37.8152],
    ]),
    line("road", "La Trobe St", [
      [144.9502, -37.814],
      [144.9701, -37.8085],
    ]),
    line("road", "Grattan St", [
      [144.952, -37.7999],
      [144.971, -37.7977],
    ]),
    line("road", "Victoria St", [
      [144.952, -37.8062],
      [144.986, -37.8075],
      [145.0, -37.812],
    ]),
    line("road", "Alexandra Pde", [
      [144.962, -37.79],
      [144.975, -37.7885],
      [144.995, -37.7875],
    ]),
    line("road", "Lygon St", [
      [144.9665, -37.806],
      [144.9682, -37.78],
    ]),
    line("road", "Nicholson St", [
      [144.9735, -37.81],
      [144.9765, -37.78],
    ]),
    line("road", "Flemington Rd", [
      [144.958, -37.8035],
      [144.94, -37.789],
      [144.93, -37.783],
    ]),
    line("road", "Kings Way", [
      [144.962, -37.8195],
      [144.958, -37.835],
      [144.95, -37.85],
    ]),
    line("road", "Hoddle St / Punt Rd", [
      [144.992, -37.785],
      [144.99, -37.81],
      [144.985, -37.84],
    ]),
  ],
};
