import "server-only";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { customers, orders } from "@/db/schema";
import type { OpsOrder } from "@/lib/analytics/ops";
import { fulfilmentMinutes, ratingFourPlusBaseline } from "@/lib/analytics/ops";
import { mean, sd } from "@/lib/stats/descriptive";
import { type ProportionCI } from "@/lib/stats/proportion";

/** Every order, in the shape the analytics functions take (small demo dataset: read it all). */
export async function opsOrders(): Promise<OpsOrder[]> {
  const db = await getDb();
  const rows = await db
    .select({
      orderId: orders.orderId,
      vanId: orders.vanId,
      status: orders.status,
      startTime: orders.startTime,
      discountTime: orders.discountTime,
      fulfilledTime: orders.fulfilledTime,
      discountApplied: orders.discountApplied,
      rating: orders.rating,
      fulfilmentImputed: orders.fulfilmentImputed,
      closedOutAt: orders.closedOutAt,
    })
    .from(orders)
    .orderBy(asc(orders.startTime));
  return rows.map((r) => ({
    ...r,
    startTime: r.startTime.getTime(),
    discountTime: r.discountTime.getTime(),
    fulfilledTime: r.fulfilledTime?.getTime() ?? null,
    closedOutAt: r.closedOutAt?.getTime() ?? null,
  }));
}

export type ExperimentFacts = {
  /**
   * Share of non-cancelled orders rated 4 or 5 stars, unrated orders counting
   * as "no" (the primary metric's own definition), with its Wilson interval.
   */
  ratingFourPlus: ProportionCI;
  /** Non-cancelled orders that were rated at all (the secondary metric's sample). */
  ratedOrders: number;
  ratingMean: number;
  ratingSd: number;
  /** Observed minutes-to-ready, resampled by the experiment simulation. */
  fulfilmentPool: number[];
  customers: number;
  orders: number;
};

/** What the demo data can (and cannot) say about baselines for the experiment designer. */
export async function experimentFacts(): Promise<ExperimentFacts> {
  const db = await getDb();
  const [all, people] = await Promise.all([
    opsOrders(),
    db.select({ id: customers.id }).from(customers),
  ]);
  const ratings = all
    .filter((o) => o.status !== "canceled" && o.rating != null)
    .map((o) => Number(o.rating));
  return {
    ratingFourPlus: ratingFourPlusBaseline(all),
    ratedOrders: ratings.length,
    ratingMean: mean(ratings),
    ratingSd: sd(ratings),
    fulfilmentPool: fulfilmentMinutes(all).map((m) => Math.round(m * 100) / 100),
    customers: people.length,
    orders: all.length,
  };
}
