import { describe, expect, it } from "vitest";
import { VAN_SEEDS } from "@/db/seed-data";
import { publicName, slugify, vanSlug } from "./slug";

describe("slugs", () => {
  it("slugifies van and product names", () => {
    expect(vanSlug("Ardeth Lavon")).toBe("ardeth-lavon");
    expect(slugify("Flat White")).toBe("flat-white");
    expect(slugify("  Café  Crème! ")).toBe("cafe-creme");
  });

  it("gives every seeded van a unique slug", () => {
    const slugs = VAN_SEEDS.map((v) => vanSlug(v.vanId));
    expect(new Set(slugs).size).toBe(VAN_SEEDS.length);
  });

  it("shows only first name and last initial publicly", () => {
    expect(publicName("Olivia", "Nguyen")).toBe("Olivia N.");
    expect(publicName("Sam", "")).toBe("Sam");
  });
});
