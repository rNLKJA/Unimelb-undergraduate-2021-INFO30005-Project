import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { loadLegacyUtility, type LegacyUtility } from "@/test/legacy";
import {
  clockString,
  legacyCurrentDate,
  legacyCurrentTime,
  legacyDiscountTime,
  legacyEstimateTime,
  legacyMelbourneHour,
  orderDateString,
} from "./legacy-time";

let original: LegacyUtility;
beforeAll(() => {
  original = loadLegacyUtility();
});
afterEach(() => {
  vi.useRealTimers();
});

// A spread of instants covering every branch of the original hour conversion,
// minute overflow, and day/month boundaries.
const INSTANTS = [
  "2021-05-30T00:05:09Z",
  "2021-05-30T02:10:00Z",
  "2021-05-30T03:44:59Z",
  "2021-05-30T13:59:59Z",
  "2021-05-30T14:00:00Z",
  "2021-05-30T14:30:00Z",
  "2021-05-30T18:50:30Z",
  "2021-05-30T23:59:59Z",
  "2021-12-31T23:47:00Z",
  "2026-10-05T09:31:43Z",
];

describe("legacy time helpers match coursework/js/utility.js", () => {
  it.each(INSTANTS)("currentTime / discountTime / currentDate at %s", (iso) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
    const now = new Date();
    expect(legacyCurrentTime(now)).toBe(original.currentTime());
    expect(legacyDiscountTime(now)).toBe(original.discountTime());
    expect(legacyCurrentDate(now)).toBe(original.currentDate());
  });

  it("reproduces the documented quirks", () => {
    expect(legacyMelbourneHour(2)).toBe(12);
    expect(legacyMelbourneHour(14)).toBe(0); // should be 0 -> correct by accident
    expect(legacyMelbourneHour(18)).toBe(8); // should be 4 (or 5 in DST)
    // minute overflow carries into an unwrapped hour: 13:50 UTC -> "23:50" + 15 = "24:5"
    expect(legacyDiscountTime(new Date("2021-05-30T13:50:07Z"))).toBe("24:5:7");
  });
});

describe("legacyEstimateTime (order detail 'Delivery Estimation')", () => {
  it.each([
    ["9:05:12", "9:20"],
    ["9:44:59", "9:59"],
    ["9:45:00", "10:0"],
    ["23:50:00", "0:5"],
  ])("%s -> %s", (start, expected) => {
    expect(legacyEstimateTime(start)).toBe(expected);
  });
});

describe("correct Melbourne formatting used by the revived app", () => {
  it("handles AEST and AEDT", () => {
    // 30 May 2021 is AEST (UTC+10)
    expect(orderDateString(new Date("2021-05-30T14:30:00Z"))).toBe("31-5-2021");
    expect(clockString(new Date("2021-05-30T14:30:05Z"))).toBe("0:30:5");
    // 5 Oct 2026 is AEDT (UTC+11)
    expect(clockString(new Date("2026-10-05T09:31:43Z"))).toBe("20:31:43");
  });
});
