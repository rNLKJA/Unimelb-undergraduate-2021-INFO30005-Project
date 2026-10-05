import { beforeAll, describe, expect, it } from "vitest";
import { loadLegacyUtility, type LegacyUtility } from "@/test/legacy";
import { VAN_SEEDS } from "@/db/seed-data";
import { MELBOURNE_UNI, nearestVans, type VanLike } from "./nearest-vans";

let original: LegacyUtility;
beforeAll(() => {
  original = loadLegacyUtility();
});

const vans: VanLike[] = VAN_SEEDS.map((v) => ({
  vanId: v.vanId,
  xCoord: v.lat,
  yCoord: v.lng,
  address: v.address,
  status: v.status,
}));

/** The original `locate_van` pipeline, reconstructed around the real distance function. */
function originalLocateVan(all: VanLike[], user: { lat: number; lng: number }) {
  const active = all.filter((v) => v.status === "1" && v.address !== "");
  let nearest = active.map((v) => ({
    ...v,
    dist: original.euclidean_distance({ lat: v.xCoord, lng: v.yCoord }, user),
  }));
  nearest = nearest.sort((a, b) => a.dist - b.dist).slice(0, 5);
  return nearest.map((v) => v.vanId);
}

const USERS = [
  MELBOURNE_UNI,
  { lat: -37.8183, lng: 144.9671 }, // Flinders Street Station
  { lat: -37.8162, lng: 144.9446 }, // Docklands
  { lat: -37.7712, lng: 144.9612 }, // Brunswick
  { lat: -37.8497, lng: 144.9765 }, // St Kilda Rd
];

describe("nearestVans ports customerController.locate_van", () => {
  it.each(USERS)("same five vans in the same order for %o", (user) => {
    expect(nearestVans(vans, user).map((v) => v.vanId)).toEqual(originalLocateVan(vans, user));
  });

  it("returns at most five open vans that have an address", () => {
    const result = nearestVans(vans, MELBOURNE_UNI);
    expect(result).toHaveLength(5);
    expect(result.every((v) => v.status === "1" && v.address !== "")).toBe(true);
    expect(result[0].vanId).toBe("Ardeth Lavon");
  });

  it("ignores closed vans and vans without an address", () => {
    const only = nearestVans(
      [
        { vanId: "A", xCoord: -37.7963, yCoord: 144.9614, address: "", status: "1" },
        { vanId: "B", xCoord: -37.7963, yCoord: 144.9614, address: "x", status: "0" },
        { vanId: "C", xCoord: -37.81, yCoord: 144.96, address: "x", status: "1" },
      ],
      MELBOURNE_UNI,
    );
    expect(only.map((v) => v.vanId)).toEqual(["C"]);
  });
});
