import { describe, expect, it } from "vitest";
import { averageRating, dayStats, type StatOrder } from "./stats";

const MIN = 60_000;
// 2 pm in Melbourne on 1 Oct 2026 (AEST, UTC+10).
const NOW = Date.parse("2026-10-01T04:00:00Z");

const order = (o: Partial<StatOrder>): StatOrder => ({
  status: "collected",
  price: 10,
  startTime: NOW - 60 * MIN,
  discountTime: NOW - 45 * MIN,
  fulfilledTime: NOW - 50 * MIN,
  rating: null,
  ...o,
});

describe("vendor day stats", () => {
  it("counts today's non-cancelled orders in Melbourne time", () => {
    const stats = dayStats(
      [
        order({}),
        order({ fulfilledTime: NOW - 40 * MIN }), // late: ready after discount_time
        order({ status: "outstanding", fulfilledTime: null, price: 5.5 }),
        order({ status: "canceled", price: 100 }),
        order({ startTime: NOW - 20 * 60 * MIN }), // yesterday in Melbourne
      ],
      NOW,
    );
    expect(stats.orders).toBe(3);
    expect(stats.revenue).toBe(25.5);
    expect(stats.active).toBe(1);
    expect(stats.avgPrepMinutes).toBe(15);
    expect(stats.onTimeRate).toBe(0.5);
  });

  it("handles empty days and averages ratings", () => {
    expect(dayStats([], NOW)).toEqual({
      orders: 0,
      revenue: 0,
      active: 0,
      avgPrepMinutes: null,
      onTimeRate: null,
    });
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBeNull();
  });
});
