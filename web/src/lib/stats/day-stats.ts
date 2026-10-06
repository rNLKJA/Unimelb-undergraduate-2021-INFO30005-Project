import { melbourneDayKey } from "../format";
import type { OrderStatus } from "../order-rules";
import { wilson } from "./proportion";

export type StatOrder = {
  status: OrderStatus;
  price: number;
  startTime: number;
  discountTime: number;
  fulfilledTime: number | null;
  rating: number | null;
};

export type DayStats = {
  orders: number;
  revenue: number;
  active: number;
  avgPrepMinutes: number | null;
  onTimeRate: number | null;
  /** Today's orders with a ready time: the n behind "Avg. prep" and "On time". */
  served: number;
  /** Of those, ready before `discount_time`. */
  onTime: number;
};

/**
 * Vendor dashboard figures for one Melbourne calendar day. Cancelled orders
 * are excluded; "on time" means ready before `discount_time` (15 minutes).
 */
export function dayStats(orders: readonly StatOrder[], now: number): DayStats {
  const today = melbourneDayKey(now);
  const todays = orders.filter(
    (o) => o.status !== "canceled" && melbourneDayKey(o.startTime) === today,
  );
  const fulfilled = todays.filter((o) => o.fulfilledTime != null);
  const prep = fulfilled.map((o) => ((o.fulfilledTime as number) - o.startTime) / 60_000);
  const onTime = fulfilled.filter((o) => (o.fulfilledTime as number) <= o.discountTime).length;
  return {
    orders: todays.length,
    revenue: Math.round(todays.reduce((sum, o) => sum + o.price, 0) * 100) / 100,
    active: todays.filter((o) => o.status === "outstanding" || o.status === "fulfilled").length,
    avgPrepMinutes: prep.length
      ? Math.round((prep.reduce((a, b) => a + b, 0) / prep.length) * 10) / 10
      : null,
    onTimeRate: fulfilled.length ? onTime / fulfilled.length : null,
    served: fulfilled.length,
    onTime,
  };
}

/**
 * The n and Wilson 95% interval behind the on-time rate, for the vendor tile:
 * "4 of 4 · 95% CI 51–100%". A 100% from four orders is not a 100% from forty.
 */
export function onTimeNote(stats: Pick<DayStats, "onTime" | "served">): string | undefined {
  if (!stats.served) return undefined;
  const ci = wilson(stats.onTime, stats.served);
  const pct = (x: number) => Math.round(x * 100);
  return `${stats.onTime} of ${stats.served} · 95% CI ${pct(ci.lower)}–${pct(ci.upper)}%`;
}

/** Mean of 1–5 ratings, one decimal place. */
export function averageRating(ratings: readonly number[]): number | null {
  if (!ratings.length) return null;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}
