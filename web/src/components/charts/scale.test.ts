import { describe, expect, it } from "vitest";
import { niceTicks, pct } from "./scale";

describe("chart scales", () => {
  it("maps values to clamped percentages", () => {
    expect(pct(5, 0, 10)).toBe(50);
    expect(pct(-1, 0, 10)).toBe(0);
    expect(pct(11, 0, 10)).toBe(100);
    expect(pct(3, 3, 3)).toBe(0);
  });

  it("picks round tick steps that cover the range", () => {
    expect(niceTicks(0, 10, 4)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(niceTicks(0, 11, 4)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(0, 0.34, 4)).toEqual([0, 0.1, 0.2, 0.3, 0.4]);
    expect(niceTicks(-0.05, 0.2, 4)).toEqual([-0.1, 0, 0.1, 0.2]);
    expect(niceTicks(0, 23, 6)).toEqual([0, 5, 10, 15, 20, 25]);
    expect(niceTicks(4, 4)).toEqual([4]);
    expect(niceTicks(NaN, 1)).toEqual([]);
  });
});
