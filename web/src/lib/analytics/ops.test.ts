import { describe, expect, it } from "vitest";
import { wilson } from "@/lib/stats/proportion";
import {
  fulfilmentMinutes,
  fulfilmentSummary,
  histogram,
  lateRateByVan,
  ordersPerDay,
  shiftDayKey,
  timeToFulfil,
  type OpsOrder,
} from "./ops";

const MIN = 60_000;
// 2 pm on 6 Oct 2026 in Melbourne (AEDT, UTC+11).
const NOW = Date.parse("2026-10-06T03:00:00Z");

let seq = 0;
function order(o: Partial<OpsOrder> & { minutes?: number | null }): OpsOrder {
  const start = o.startTime ?? NOW - 3 * 60 * MIN;
  const fulfilled =
    o.fulfilledTime !== undefined
      ? o.fulfilledTime
      : o.minutes == null
        ? null
        : start + o.minutes * MIN;
  return {
    orderId: `O${seq++}`,
    vanId: o.vanId ?? "Van A",
    status: o.status ?? (fulfilled == null ? "outstanding" : "collected"),
    startTime: start,
    discountTime: start + 15 * MIN,
    fulfilledTime: fulfilled,
    discountApplied: o.discountApplied ?? (fulfilled != null && fulfilled > start + 15 * MIN),
    rating: o.rating ?? null,
  };
}

describe("calendar keys", () => {
  it("shifts across month ends and DST changes without skipping a day", () => {
    expect(shiftDayKey("2026-10-04", 1)).toBe("2026-10-05");
    expect(shiftDayKey("2026-10-05", -1)).toBe("2026-10-04");
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("orders per day", () => {
  it("counts non-cancelled orders per Melbourne day, flags today as partial", () => {
    const orders = [
      order({ startTime: NOW - 60 * MIN, minutes: 5 }),
      order({ startTime: NOW - 24 * 60 * MIN, minutes: 5 }),
      order({ startTime: NOW - 24 * 60 * MIN, minutes: 5 }),
      order({ startTime: NOW - 24 * 60 * MIN, status: "canceled", minutes: null }),
      order({ startTime: NOW - 40 * 24 * 60 * MIN, minutes: 5 }), // outside the window
    ];
    const res = ordersPerDay(orders, NOW, 3);
    expect(res.series).toEqual([
      { day: "2026-10-04", count: 0, partial: false },
      { day: "2026-10-05", count: 2, partial: false },
      { day: "2026-10-06", count: 1, partial: true },
    ]);
    expect(res.completeDays).toBe(2);
    expect(res.meanPerDay.estimate).toBe(1);
    expect(res.meanPerDay.seed).toBe(4399);
  });
});

describe("fulfilment time", () => {
  const orders = [4, 6, 8, 10, 12, 14, 16, 20].map((m) => order({ minutes: m }));

  it("measures served orders only and summarises them with intervals", () => {
    const minutes = fulfilmentMinutes([
      ...orders,
      order({ minutes: null }),
      order({ status: "canceled", minutes: null }),
    ]);
    expect(minutes).toEqual([4, 6, 8, 10, 12, 14, 16, 20]);
    const s = fulfilmentSummary(minutes);
    expect(s.n).toBe(8);
    expect(s.median.estimate).toBe(11);
    expect(s.median.lower).toBeLessThanOrEqual(11);
    expect(s.median.upper).toBeGreaterThanOrEqual(11);
    expect(s.p90.estimate).toBeCloseTo(17.2, 12);
    expect(s.withinPromise).toEqual(wilson(6, 8));
  });

  it("bins into a fixed-width histogram", () => {
    expect(histogram([0.5, 1.2, 1.9, 4], 2)).toEqual([
      { from: 0, to: 2, count: 3 },
      { from: 2, to: 4, count: 0 },
      { from: 4, to: 6, count: 1 },
    ]);
    expect(histogram([])).toEqual([]);
  });
});

describe("late-discount rate by van", () => {
  it("uses served orders, Wilson intervals, and sorts by rate", () => {
    const orders = [
      order({ vanId: "Van A", minutes: 20 }),
      order({ vanId: "Van A", minutes: 10 }),
      order({ vanId: "Van B", minutes: 5 }),
      order({ vanId: "Van B", minutes: 5 }),
      order({ vanId: "Van B", minutes: 16 }),
      order({ vanId: "Van C", minutes: null }), // not served yet: excluded
    ];
    const res = lateRateByVan(orders);
    expect(res.byVan.map((v) => [v.vanId, v.late.successes, v.late.n])).toEqual([
      ["Van A", 1, 2],
      ["Van B", 1, 3],
    ]);
    expect(res.byVan[0].late).toEqual(wilson(1, 2));
    expect(res.overall).toEqual(wilson(2, 5));
  });
});

describe("time to fulfil (Kaplan–Meier)", () => {
  it("censors open orders at now and excludes cancellations", () => {
    const orders = [
      ...[4, 6, 8, 10, 12, 14, 16, 20].map((m) => order({ minutes: m })),
      order({ startTime: NOW - 9 * MIN, minutes: null }), // still preparing, 9 min so far
      order({ status: "canceled", minutes: null }),
    ];
    const res = timeToFulfil(orders, NOW);
    expect(res.cancelled).toBe(1);
    expect(res.stillPreparing).toBe(1);
    expect(res.km.n).toBe(9);
    expect(res.km.events).toBe(8);
    const censoredStep = res.km.steps.find((s) => s.nCensor === 1);
    expect(censoredStep?.time).toBeCloseTo(9, 9);
    // 6 of 9 events by 15 minutes, with one censored at 9: S(15) = (8/9)(7/8)(6/7)(4/5)(3/4)(2/3).
    const s15 = (8 / 9) * (7 / 8) * (6 / 7) * (4 / 5) * (3 / 4) * (2 / 3);
    expect(res.readyBy15.estimate).toBeCloseTo(1 - s15, 12);
    expect(res.readyBy15.lower).toBeLessThan(res.readyBy15.estimate);
    expect(res.readyBy15.upper).toBeGreaterThan(res.readyBy15.estimate);
    expect(res.medianMinutes).toBe(12);
  });
});
