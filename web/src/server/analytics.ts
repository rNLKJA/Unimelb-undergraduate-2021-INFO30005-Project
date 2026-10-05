import "server-only";
import { asc, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { customers, orders } from "@/db/schema";
import type { OpsOrder } from "@/lib/analytics/ops";
import { fulfilmentMinutes } from "@/lib/analytics/ops";
import { mean, sd } from "@/lib/stats/descriptive";
import { wilson, type ProportionCI } from "@/lib/stats/proportion";

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
    })
    .from(orders)
    .orderBy(asc(orders.startTime));
  return rows.map((r) => ({
    ...r,
    startTime: r.startTime.getTime(),
    discountTime: r.discountTime.getTime(),
    fulfilledTime: r.fulfilledTime?.getTime() ?? null,
  }));
}

export type ExperimentFacts = {
  /** Share of rated orders rated 4 or 5, with its Wilson interval. */
  ratingFourPlus: ProportionCI;
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
  const [all, rated, people] = await Promise.all([
    opsOrders(),
    db.select({ rating: orders.rating }).from(orders).where(isNotNull(orders.rating)),
    db.select({ id: customers.id }).from(customers),
  ]);
  const ratings = rated.map((r) => Number(r.rating));
  return {
    ratingFourPlus: wilson(ratings.filter((r) => r >= 4).length, ratings.length),
    ratingMean: mean(ratings),
    ratingSd: sd(ratings),
    fulfilmentPool: fulfilmentMinutes(all).map((m) => Math.round(m * 100) / 100),
    customers: people.length,
    orders: all.length,
  };
}
