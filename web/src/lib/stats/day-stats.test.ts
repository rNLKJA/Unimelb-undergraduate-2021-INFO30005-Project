import { describe, expect, it } from "vitest";
import { averageRating, dayStats, onTimeNote, type StatOrder } from "./day-stats";

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
    expect(stats.served).toBe(2);
    expect(stats.onTime).toBe(1);
  });

  it("handles empty days and averages ratings", () => {
    expect(dayStats([], NOW)).toEqual({
      orders: 0,
      revenue: 0,
      active: 0,
      avgPrepMinutes: null,
      onTimeRate: null,
      served: 0,
      onTime: 0,
    });
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBeNull();
  });

  it("states the n and Wilson interval behind the on-time rate", () => {
    // Wilson 95% for 4/4 is [0.5101, 1] (statsmodels proportion_confint, method="wilson").
    expect(onTimeNote({ onTime: 4, served: 4 })).toBe("4 of 4 · 95% CI 51–100%");
    // 1/2: [0.0945, 0.9055].
    expect(onTimeNote({ onTime: 1, served: 2 })).toBe("1 of 2 · 95% CI 9–91%");
    expect(onTimeNote({ onTime: 0, served: 0 })).toBeUndefined();
  });
});
