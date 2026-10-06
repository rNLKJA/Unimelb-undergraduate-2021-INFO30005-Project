import "server-only";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { orderItems, orders } from "@/db/schema";
import { computeShiftMetrics, type ShiftMetrics } from "@/lib/ai/shift-summary";

/**
 * Today's aggregate figures for a van, for the optional AI shift summary.
 * Reads only the order fields the aggregates need (no customer column).
 */
export async function shiftMetricsFor(
  vanId: string,
  now: number = Date.now(),
): Promise<ShiftMetrics> {
  const db = await getDb();
  const since = new Date(now - 36 * 60 * 60_000); // covers "today" in Melbourne with margin
  const rows = await db
    .select({
      orderId: orders.orderId,
      status: orders.status,
      price: orders.price,
      startTime: orders.startTime,
      fulfilledTime: orders.fulfilledTime,
      discountTime: orders.discountTime,
      discountApplied: orders.discountApplied,
      fulfilmentImputed: orders.fulfilmentImputed,
      rating: orders.rating,
    })
    .from(orders)
    .where(and(eq(orders.vanId, vanId), gte(orders.startTime, since)));
  const items = rows.length
    ? await db
        .select({
          orderId: orderItems.orderId,
          food: orderItems.food,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            rows.map((r) => r.orderId),
          ),
        )
    : [];
  const byOrder = new Map<string, { food: string; quantity: number }[]>();
  for (const i of items) {
    const list = byOrder.get(i.orderId) ?? [];
    list.push({ food: i.food, quantity: i.quantity });
    byOrder.set(i.orderId, list);
  }
  return computeShiftMetrics(
    vanId,
    rows.map((r) => ({
      status: r.status,
      price: r.price,
      startTime: r.startTime.getTime(),
      // A ready time invented by demo housekeeping is not a real one.
      fulfilledTime: r.fulfilmentImputed ? null : (r.fulfilledTime?.getTime() ?? null),
      discountTime: r.discountTime.getTime(),
      discountApplied: r.discountApplied,
      rating: r.rating,
      items: byOrder.get(r.orderId) ?? [],
    })),
    now,
  );
}
