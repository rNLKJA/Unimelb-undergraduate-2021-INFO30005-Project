import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { loadLegacyUtility, type LegacyUtility } from "@/test/legacy";
import { mulberry32 } from "./rng";
import { generateOrderId, ORDER_ID_PATTERN } from "./order-id";

let original: LegacyUtility;
beforeAll(() => {
  original = loadLegacyUtility();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateOrderId ports utility.generateOrderID", () => {
  it("produces the identical ID for the same random stream", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const a = mulberry32(seed);
      vi.spyOn(Math, "random").mockImplementation(a);
      const legacy = original.generateOrderID("RU3777776");
      vi.restoreAllMocks();
      expect(generateOrderId(mulberry32(seed))).toBe(legacy);
    }
  });

  it("matches the documented shape (e.g. ARD4391846 from the Postman collection)", () => {
    expect("ARD4391846").toMatch(ORDER_ID_PATTERN);
    for (let i = 0; i < 200; i++) expect(generateOrderId()).toMatch(ORDER_ID_PATTERN);
  });

  it("does not zero-pad the number", () => {
    const seq = [0, 0, 0, 0.0000001];
    let i = 0;
    expect(generateOrderId(() => seq[i++])).toBe("AAA0");
  });
});
