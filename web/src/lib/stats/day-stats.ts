import { melbourneDayKey } from "../format";
import type { OrderStatus } from "../order-rules";

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
  };
}

/** Mean of 1–5 ratings, one decimal place. */
export function averageRating(ratings: readonly number[]): number | null {
  if (!ratings.length) return null;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}
