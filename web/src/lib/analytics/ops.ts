/**
 * Operations analytics for the records area: framework-free, so the numbers
 * on /admin/analytics are unit-tested. Every rate carries a Wilson interval,
 * every median a seeded bootstrap interval, and every figure its n.
 */
import { melbourneDayKey } from "@/lib/format";
import { OVERDUE_MINUTES, type OrderStatus } from "@/lib/order-rules";
import {
  bootstrapMean,
  bootstrapMedian,
  bootstrapQuantile,
  type BootstrapCI,
} from "@/lib/stats/bootstrap";
import { kaplanMeier, kmQuantile, survivalAt, type KaplanMeier } from "@/lib/stats/survival";
import { wilson, type ProportionCI } from "@/lib/stats/proportion";

export type OpsOrder = {
  orderId: string;
  vanId: string;
  status: OrderStatus;
  startTime: number;
  discountTime: number;
  fulfilledTime: number | null;
  discountApplied: boolean;
  rating: number | null;
  /**
   * True when demo housekeeping invented `fulfilledTime` while closing out an
   * order nobody finished. Such a time is not an observation: it is left out
   * of every fulfilment figure, and the order is censored at `closedOutAt`.
   */
  fulfilmentImputed: boolean;
  /** When demo housekeeping closed the order out, or null. */
  closedOutAt: number | null;
};

/** A ready time that was actually recorded (not cancelled, not invented by housekeeping). */
const observedReady = (o: OpsOrder): boolean =>
  o.fulfilledTime != null && o.status !== "canceled" && !o.fulfilmentImputed;

/** Orders whose ready time was invented by demo housekeeping (excluded from the figures). */
export function imputedOrders(orders: readonly OpsOrder[]): number {
  return orders.filter((o) => o.fulfilmentImputed && o.status !== "canceled").length;
}

/** Seed for every bootstrap on the analytics page (the team's group number). */
export const ANALYTICS_SEED = 4399;
export const BOOTSTRAP_REPS = 2000;

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" calendar arithmetic, independent of time zones and DST. */
export function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + deltaDays * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

export type DayCount = { day: string; count: number; partial: boolean };

/**
 * Non-cancelled orders per Melbourne calendar day over the last `days` days,
 * today included (and flagged partial). The mean per day uses complete days
 * only, with a bootstrap interval over days.
 */
export function ordersPerDay(
  orders: readonly OpsOrder[],
  now: number,
  days = 21,
): { series: DayCount[]; meanPerDay: BootstrapCI; completeDays: number } {
  const today = melbourneDayKey(now);
  const keys = Array.from({ length: days }, (_, i) => shiftDayKey(today, i - (days - 1)));
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const o of orders) {
    if (o.status === "canceled") continue;
    const key = melbourneDayKey(o.startTime);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const series = keys.map((day) => ({ day, count: counts.get(day) ?? 0, partial: day === today }));
  const complete = series.filter((d) => !d.partial).map((d) => d.count);
  return {
    series,
    meanPerDay: bootstrapMean(complete, { seed: ANALYTICS_SEED, reps: BOOTSTRAP_REPS }),
    completeDays: complete.length,
  };
}

/**
 * Minutes from placing an order to "ready for pickup", for every served
 * order with a recorded ready time (housekeeping-imputed times excluded).
 */
export function fulfilmentMinutes(orders: readonly OpsOrder[]): number[] {
  return orders
    .filter(observedReady)
    .map((o) => ((o.fulfilledTime as number) - o.startTime) / 60_000);
}

export type FulfilmentSummary = {
  n: number;
  median: BootstrapCI;
  p90: BootstrapCI;
  /** Share ready within the 15-minute promise, with a Wilson interval. */
  withinPromise: ProportionCI;
};

export function fulfilmentSummary(minutes: readonly number[]): FulfilmentSummary {
  const opts = { seed: ANALYTICS_SEED, reps: BOOTSTRAP_REPS };
  const onTime = minutes.filter((m) => m <= OVERDUE_MINUTES).length;
  return {
    n: minutes.length,
    median: bootstrapMedian(minutes, opts),
    p90: bootstrapQuantile(minutes, 0.9, opts),
    withinPromise: wilson(onTime, minutes.length),
  };
}

export type Bin = { from: number; to: number; count: number };

/** Fixed-width histogram from 0 to the bin containing the maximum. */
export function histogram(values: readonly number[], width = 1): Bin[] {
  if (!values.length) return [];
  const max = Math.max(...values);
  const nBins = Math.max(1, Math.floor(max / width) + 1);
  const bins: Bin[] = Array.from({ length: nBins }, (_, i) => ({
    from: i * width,
    to: (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    const i = Math.min(nBins - 1, Math.max(0, Math.floor(v / width)));
    bins[i].count++;
  }
  return bins;
}

export type VanLateRate = { vanId: string; late: ProportionCI };

/**
 * Late-discount rate per van among served orders (ready, or collected): the
 * share flagged for the discount because they were ready after the 15-minute
 * deadline. Sorted by estimate, highest first; vans with no served orders
 * are left out, and so are orders whose ready time housekeeping invented.
 */
export function lateRateByVan(orders: readonly OpsOrder[]): {
  overall: ProportionCI;
  byVan: VanLateRate[];
} {
  const served = orders.filter(observedReady);
  const isLate = (o: OpsOrder) => o.discountApplied || (o.fulfilledTime as number) > o.discountTime;
  const groups = new Map<string, { late: number; n: number }>();
  for (const o of served) {
    const g = groups.get(o.vanId) ?? { late: 0, n: 0 };
    g.n++;
    if (isLate(o)) g.late++;
    groups.set(o.vanId, g);
  }
  const byVan = [...groups.entries()]
    .map(([vanId, g]) => ({ vanId, late: wilson(g.late, g.n) }))
    .sort((a, b) => b.late.p - a.late.p || b.late.n - a.late.n || a.vanId.localeCompare(b.vanId));
  return { overall: wilson(served.filter(isLate).length, served.length), byVan };
}

export type TimeToFulfil = {
  km: KaplanMeier;
  /** Orders left out of the curve because they were cancelled before being ready. */
  cancelled: number;
  /** Orders still being prepared, right-censored at "now". */
  stillPreparing: number;
  /**
   * Orders closed out by demo housekeeping without ever being marked ready,
   * right-censored at their age when they were closed out.
   */
  closedOut: number;
  medianMinutes: number;
  /** P(ready within 15 minutes) = 1 - S(15), with its interval. */
  readyBy15: { estimate: number; lower: number; upper: number };
};

/**
 * Kaplan–Meier "time to fulfil": event = ready for pickup; an order still
 * outstanding is censored at the time we look, and an order demo
 * housekeeping closed out without a ready time is censored at its age when
 * it was closed out (all we know is that it was not ready by then).
 * Cancelled orders are excluded (a competing event, reported separately),
 * which the methods page states.
 */
export function timeToFulfil(orders: readonly OpsOrder[], now: number): TimeToFulfil {
  const times: number[] = [];
  const events: boolean[] = [];
  let cancelled = 0;
  let stillPreparing = 0;
  let closedOut = 0;
  for (const o of orders) {
    if (o.status === "canceled") {
      cancelled++;
      continue;
    }
    if (o.fulfilmentImputed) {
      closedOut++;
      times.push(Math.max(0, ((o.closedOutAt ?? now) - o.startTime) / 60_000));
      events.push(false);
    } else if (o.fulfilledTime != null) {
      times.push((o.fulfilledTime - o.startTime) / 60_000);
      events.push(true);
    } else if (o.status === "outstanding") {
      stillPreparing++;
      times.push(Math.max(0, (now - o.startTime) / 60_000));
      events.push(false);
    }
  }
  const km = kaplanMeier(times, events);
  const s15 = survivalAt(km, OVERDUE_MINUTES);
  return {
    km,
    cancelled,
    stillPreparing,
    closedOut,
    medianMinutes: kmQuantile(km, 0.5),
    readyBy15: { estimate: 1 - s15.survival, lower: 1 - s15.upper, upper: 1 - s15.lower },
  };
}

/**
 * Baseline for the experiment's "rates the first order 4 or 5 stars" metric,
 * with the metric's own denominator: every non-cancelled order, where an
 * order nobody rated counts as "no". (Dividing by rated orders only would
 * describe a different, conditional metric and inflate the baseline.)
 */
export function ratingFourPlusBaseline(orders: readonly OpsOrder[]): ProportionCI {
  const placed = orders.filter((o) => o.status !== "canceled");
  return wilson(placed.filter((o) => o.rating != null && o.rating >= 4).length, placed.length);
}
