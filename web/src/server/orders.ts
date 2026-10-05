import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lt,
  ne,
  or,
  sum,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import { customers, orderItems, orders, products, vans, type Order } from "@/db/schema";
import { CUSTOMER_SEEDS, DEMO_CREDENTIALS } from "@/db/seed-data";
import { orderDateString } from "@/lib/legacy-time";
import { VAN_OPEN } from "@/lib/nearest-vans";
import { generateOrderId } from "@/lib/order-id";
import {
  CANCEL_WINDOW_CLOSED_MESSAGE,
  canCustomerModify,
  canRate,
  COMPLETED_STATUSES,
  MODIFY_WINDOW_CLOSED_MESSAGE,
  OVERDUE_MINUTES,
  PROCESSING_STATUSES,
  VENDOR_SUCCESS_MESSAGE,
  vendorTransition,
  type OrderStatus,
} from "@/lib/order-rules";
import { normaliseCart, orderTotal, type CartLine } from "@/lib/pricing";
import { publicName, vanSlug } from "@/lib/slug";
import type { VendorBoard } from "@/lib/board";
import { dayStats } from "@/lib/stats";
import type { OrderDTO } from "@/lib/types";

const MINUTE = 60_000;

export type Result<T = undefined> =
  | ({ ok: true; message: string } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

async function hydrate(rows: Order[]): Promise<OrderDTO[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.orderId);
  const vanIds = [...new Set(rows.map((r) => r.vanId))];
  const customerIds = [...new Set(rows.map((r) => r.customerId))];
  const [items, vanRows, customerRows, menu] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, ids))
      .orderBy(asc(orderItems.id)),
    db.select().from(vans).where(inArray(vans.vanId, vanIds)),
    db
      .select({
        customerId: customers.customerId,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(customers)
      .where(inArray(customers.customerId, customerIds)),
    db.select({ product: products.product, price: products.price }).from(products),
  ]);
  const priceOf = new Map(menu.map((m) => [m.product, m.price]));
  const vanOf = new Map(vanRows.map((v) => [v.vanId, v]));
  const nameOf = new Map(
    customerRows.map((c) => [c.customerId, publicName(c.firstName, c.lastName)]),
  );
  const itemsOf = new Map<string, OrderDTO["items"]>();
  for (const item of items) {
    const list = itemsOf.get(item.orderId) ?? [];
    list.push({ food: item.food, quantity: item.quantity, unitPrice: priceOf.get(item.food) ?? 0 });
    itemsOf.set(item.orderId, list);
  }
  return rows.map((r) => {
    const van = vanOf.get(r.vanId);
    return {
      orderId: r.orderId,
      vanId: r.vanId,
      vanSlug: vanSlug(r.vanId),
      vanAddress: van?.address ?? "",
      vanLat: van?.xCoord ?? 0,
      vanLng: van?.yCoord ?? 0,
      customerId: r.customerId,
      customerName: nameOf.get(r.customerId) ?? "Snacker",
      items: itemsOf.get(r.orderId) ?? [],
      price: r.price,
      status: r.status,
      orderDate: r.orderDate,
      startTime: r.startTime.getTime(),
      discountTime: r.discountTime.getTime(),
      fulfilledTime: r.fulfilledTime?.getTime() ?? null,
      collectionTime: r.collectionTime?.getTime() ?? null,
      rating: r.rating,
      comment: r.comment,
      discountApplied: r.discountApplied,
    };
  });
}

async function findOrder(orderId: string): Promise<Order | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
  return row;
}

async function uniqueOrderId(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = generateOrderId();
    if (!(await findOrder(id))) return id;
  }
  throw new Error("Could not allocate an order id");
}

async function priceLines(lines: readonly CartLine[]) {
  const db = await getDb();
  const menu = await db.select({ product: products.product, price: products.price }).from(products);
  const known = new Set(menu.map((m) => m.product));
  const clean = normaliseCart(lines);
  const unknown = clean.find((l) => !known.has(l.food));
  if (unknown) return { ok: false as const, message: `"${unknown.food}" is not on the menu` };
  if (!clean.length) return { ok: false as const, message: "please order something" };
  return { ok: true as const, lines: clean, total: orderTotal(clean, menu) };
}

// ---------------------------------------------------------------------------
// Customer side
// ---------------------------------------------------------------------------

/**
 * Port of `customerController.addToCart` with `confirm: true`: price the cart
 * server-side from the menu, then create an "outstanding" order whose
 * discount deadline is 15 minutes after it was placed.
 */
export async function placeOrder(input: {
  customerId: string;
  vanId: string;
  lines: readonly CartLine[];
  now?: number;
  /** Internal use (demo data): skip the "van must be open" check. */
  allowClosedVan?: boolean;
}): Promise<Result<{ orderId: string }>> {
  const now = input.now ?? Date.now();
  const db = await getDb();
  const [van] = await db.select().from(vans).where(eq(vans.vanId, input.vanId)).limit(1);
  if (!van) return { ok: false, message: "Van is invalid (Van doesn't exist)" };
  if (van.status !== VAN_OPEN && !input.allowClosedVan) {
    return { ok: false, message: `${van.vanId} is closed right now. Please choose another van.` };
  }
  const priced = await priceLines(input.lines);
  if (!priced.ok) return priced;

  const orderId = await uniqueOrderId();
  await db.batch([
    db.insert(orders).values({
      orderId,
      vanId: van.vanId,
      customerId: input.customerId,
      price: priced.total,
      status: "outstanding",
      orderDate: orderDateString(new Date(now)),
      startTime: new Date(now),
      discountTime: new Date(now + OVERDUE_MINUTES * MINUTE),
      discountApplied: false,
    }),
    db.insert(orderItems).values(priced.lines.map((l) => ({ orderId, ...l }))),
  ]);
  return { ok: true, message: "Thanks for your order !!", data: { orderId } };
}

export type CustomerOrderGroup = "active" | "completed" | "cancelled";

const GROUP_STATUSES: Record<CustomerOrderGroup, readonly OrderStatus[]> = {
  active: PROCESSING_STATUSES,
  completed: COMPLETED_STATUSES,
  cancelled: ["canceled"],
};

/** `getCustomerOutstandingOrders` / `getCustomerCompletedOrders` (newest first). */
export async function listCustomerOrders(
  customerId: string,
  group: CustomerOrderGroup,
  limit = 50,
): Promise<OrderDTO[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(eq(orders.customerId, customerId), inArray(orders.status, [...GROUP_STATUSES[group]])),
    )
    .orderBy(desc(orders.startTime))
    .limit(limit);
  return hydrate(rows);
}

export async function customerOrderCounts(customerId: string) {
  const db = await getDb();
  const rows = await db
    .select({ status: orders.status, n: count() })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .groupBy(orders.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Partial<
    Record<OrderStatus, number>
  >;
  return {
    active: (by.outstanding ?? 0) + (by.fulfilled ?? 0),
    completed: by.collected ?? 0,
    cancelled: by.canceled ?? 0,
  };
}

/** The snack a customer has ordered most (by quantity), ignoring cancelled orders. */
export async function favouriteSnack(
  customerId: string,
): Promise<{ food: string; quantity: number } | null> {
  const db = await getDb();
  const [row] = await db
    .select({ food: orderItems.food, quantity: sum(orderItems.quantity) })
    .from(orderItems)
    .innerJoin(orders, eq(orders.orderId, orderItems.orderId))
    .where(and(eq(orders.customerId, customerId), ne(orders.status, "canceled")))
    .groupBy(orderItems.food)
    .orderBy(desc(sum(orderItems.quantity)))
    .limit(1);
  return row ? { food: row.food, quantity: Number(row.quantity) } : null;
}

export async function getCustomerOrder(
  customerId: string,
  orderId: string,
): Promise<OrderDTO | null> {
  const row = await findOrder(orderId);
  if (!row || row.customerId !== customerId) return null;
  const [dto] = await hydrate([row]);
  return dto;
}

/**
 * Port of `updateOrder`: within the 10-minute window an outstanding order can
 * be changed; the new items replace the old ones and the order clock restarts
 * (`start_time`, `discount_time` and `order_date` are reset, as originally).
 */
export async function updateCustomerOrder(input: {
  customerId: string;
  orderId: string;
  lines: readonly CartLine[];
  now?: number;
}): Promise<Result> {
  const now = input.now ?? Date.now();
  const row = await findOrder(input.orderId);
  if (!row || row.customerId !== input.customerId) return { ok: false, message: "Order not found" };
  if (!canCustomerModify(row.status, now - row.startTime.getTime())) {
    return { ok: false, message: MODIFY_WINDOW_CLOSED_MESSAGE };
  }
  const priced = await priceLines(input.lines);
  if (!priced.ok) {
    return priced.message === "please order something"
      ? { ok: false, message: "do you want to cancel your order?" }
      : priced;
  }
  const db = await getDb();
  await db.batch([
    db.delete(orderItems).where(eq(orderItems.orderId, row.orderId)),
    db.insert(orderItems).values(priced.lines.map((l) => ({ orderId: row.orderId, ...l }))),
    db
      .update(orders)
      .set({
        price: priced.total,
        orderDate: orderDateString(new Date(now)),
        startTime: new Date(now),
        discountTime: new Date(now + OVERDUE_MINUTES * MINUTE),
      })
      .where(eq(orders.orderId, row.orderId)),
  ]);
  return { ok: true, message: "your order have been updated !!" };
}

/**
 * Port of `cancelOrder`. The original only checked the window in the browser;
 * the revival enforces it on the server as well.
 */
export async function cancelCustomerOrder(input: {
  customerId: string;
  orderId: string;
  now?: number;
}): Promise<Result> {
  const now = input.now ?? Date.now();
  const row = await findOrder(input.orderId);
  if (!row || row.customerId !== input.customerId) return { ok: false, message: "Order not found" };
  if (!canCustomerModify(row.status, now - row.startTime.getTime())) {
    return { ok: false, message: CANCEL_WINDOW_CLOSED_MESSAGE };
  }
  const db = await getDb();
  await db.update(orders).set({ status: "canceled" }).where(eq(orders.orderId, row.orderId));
  return { ok: true, message: "order canceled" };
}

/** Port of `rating`: one 1–5 rating plus an optional comment per order. */
export async function rateOrder(input: {
  customerId: string;
  orderId: string;
  rating: number;
  comment: string;
}): Promise<Result> {
  const row = await findOrder(input.orderId);
  if (!row || row.customerId !== input.customerId) return { ok: false, message: "No order Found" };
  if (row.status === "canceled") return { ok: false, message: "Cancelled orders can't be rated" };
  if (!canRate(row)) return { ok: false, message: "Thanks for your Rating" };
  const db = await getDb();
  await db
    .update(orders)
    .set({ rating: input.rating, comment: input.comment.trim() || null })
    .where(eq(orders.orderId, row.orderId));
  return { ok: true, message: "Thanks for rating out service" };
}

// ---------------------------------------------------------------------------
// Vendor side
// ---------------------------------------------------------------------------

/** `getOutstandingOrders` (outstanding + fulfilled for the van) plus today's pickups. */
export async function vendorBoard(vanId: string, now: number = Date.now()): Promise<VendorBoard> {
  const db = await getDb();
  const since = now - 24 * 60 * MINUTE;
  const [active, recent] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(eq(orders.vanId, vanId), inArray(orders.status, ["outstanding", "fulfilled"])))
      .orderBy(asc(orders.startTime)),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.vanId, vanId), gte(orders.startTime, new Date(since))))
      .orderBy(desc(orders.startTime)),
  ]);
  const activeDtos = await hydrate(active);
  const collectedRows = recent
    .filter((o) => o.status === "collected")
    .sort((a, b) => (b.collectionTime?.getTime() ?? 0) - (a.collectionTime?.getTime() ?? 0))
    .slice(0, 12);
  return {
    outstanding: activeDtos.filter((o) => o.status === "outstanding"),
    fulfilled: activeDtos
      .filter((o) => o.status === "fulfilled")
      .sort((a, b) => (a.fulfilledTime ?? 0) - (b.fulfilledTime ?? 0)),
    collected: await hydrate(collectedRows),
    stats: {
      ...dayStats(
        recent.map((o) => ({
          status: o.status,
          price: o.price,
          startTime: o.startTime.getTime(),
          discountTime: o.discountTime.getTime(),
          fulfilledTime: o.fulfilledTime?.getTime() ?? null,
          rating: o.rating,
        })),
        now,
      ),
      // "In progress" must match the tickets on the board, including any
      // carried over from an earlier day.
      active: active.length,
    },
    serverNow: now,
  };
}

/**
 * Ports of `stateOrderAsFulfilled` and `markOrderAsCollected`. Fulfilling
 * after `discount_time` also sets `discount_applied` — the original had this
 * auto-marking written (and commented out) in the vendor view, backed by
 * `markOrderAsDiscounted`.
 */
export async function advanceOrder(input: {
  vanId: string;
  orderId: string;
  target: "fulfilled" | "collected";
  now?: number;
}): Promise<Result> {
  const now = input.now ?? Date.now();
  const row = await findOrder(input.orderId);
  const current = row && row.vanId === input.vanId ? row.status : null;
  const transition = vendorTransition(current, input.target);
  if (!transition.ok || !row)
    return { ok: false, message: transition.ok ? "Order not found" : transition.message };
  const db = await getDb();
  if (input.target === "fulfilled") {
    await db
      .update(orders)
      .set({
        status: "fulfilled",
        fulfilledTime: new Date(now),
        discountApplied: row.discountApplied || now > row.discountTime.getTime(),
      })
      .where(eq(orders.orderId, row.orderId));
  } else {
    await db
      .update(orders)
      .set({ status: "collected", collectionTime: new Date(now) })
      .where(eq(orders.orderId, row.orderId));
  }
  return { ok: true, message: VENDOR_SUCCESS_MESSAGE[input.target] };
}

export async function getVanOrder(vanId: string, orderId: string): Promise<OrderDTO | null> {
  const row = await findOrder(orderId);
  if (!row || row.vanId !== vanId) return null;
  const [dto] = await hydrate([row]);
  return dto;
}

/**
 * Order history + search (`getOrders` / `vanSearchOrder`). The original
 * searched one exact order id and listed every order in the database; the
 * revival scopes history to the signed-in van and also matches partial ids
 * and customer emails.
 */
export async function searchVanOrders(input: {
  vanId: string;
  q?: string;
  status?: OrderStatus | "all";
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: OrderDTO[];
  total: number;
  page: number;
  pageSize: number;
  exact: OrderDTO | null;
}> {
  const db = await getDb();
  const pageSize = Math.min(50, Math.max(5, input.pageSize ?? 20));
  const page = Math.max(1, input.page ?? 1);
  const conditions: SQL[] = [eq(orders.vanId, input.vanId)];
  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[%_]/g, "")}%`;
    conditions.push(
      or(
        like(orders.orderId, pattern.toUpperCase()),
        like(orders.customerId, pattern.toLowerCase()),
      ) as SQL,
    );
  }
  if (input.status && input.status !== "all") conditions.push(eq(orders.status, input.status));
  const where = and(...conditions);
  const [[{ n }], rows] = await Promise.all([
    db.select({ n: count() }).from(orders).where(where),
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.startTime))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  const exactRow = q ? await findOrder(q.toUpperCase()) : undefined;
  const exact = exactRow && exactRow.vanId === input.vanId ? (await hydrate([exactRow]))[0] : null;
  return { rows: await hydrate(rows), total: Number(n), page, pageSize, exact };
}

// ---------------------------------------------------------------------------
// Demo helpers (keep the public demo lively)
// ---------------------------------------------------------------------------

function randomLines(): CartLine[] {
  const foods = [
    "Cappuccino",
    "Latte",
    "Flat White",
    "Long Black",
    "Plain Biscuit",
    "Fancy Biscuit",
    "Small Cake",
    "Large Cake",
  ];
  const n = 1 + Math.floor(Math.random() * 3);
  const chosen = new Set<string>();
  while (chosen.size < n) chosen.add(foods[Math.floor(Math.random() * foods.length)]);
  return [...chosen].map((food) => ({
    food,
    quantity: food.includes("Cake") ? 1 : 1 + Math.floor(Math.random() * 2),
  }));
}

/**
 * Simulated orders come only from the seeded synthetic customers: never the
 * public demo customer (their "My orders" should hold only what they placed)
 * and never accounts created by visitors.
 */
export const SIMULATION_CUSTOMER_IDS: readonly string[] = CUSTOMER_SEEDS.map(
  (c) => c.customerId,
).filter((id) => id !== DEMO_CREDENTIALS.customer.customerId);

/** Demo orders still active after this long are treated as abandoned. */
export const DEMO_STALE_AFTER_MINUTES = 90;

/** "Simulate a customer order" on the vendor board. */
export async function simulateOrder(vanId: string, now: number = Date.now(), ageMinutes = 0) {
  const db = await getDb();
  const pool = await db
    .select({ customerId: customers.customerId })
    .from(customers)
    .where(inArray(customers.customerId, [...SIMULATION_CUSTOMER_IDS]));
  if (!pool.length) return { ok: false as const, message: "No customers to simulate" };
  const customerId = pool[Math.floor(Math.random() * pool.length)].customerId;
  return placeOrder({
    customerId,
    vanId,
    lines: randomLines(),
    now: now - ageMinutes * MINUTE,
    allowClosedVan: true,
  });
}

/**
 * With persistent storage (Turso) demo orders nobody finishes would stay
 * "outstanding" forever and pile up as days-old overdue tickets. Before a demo
 * login, close out active orders older than DEMO_STALE_AFTER_MINUTES as if the
 * van had served them on time (fulfilled 12 min and collected 20 min after
 * they were placed; a fulfilled one is collected 5 min after it was ready).
 * Returns how many orders were closed out.
 */
export async function closeStaleDemoOrders(
  scope: { vanId: string } | { customerId: string },
  now: number = Date.now(),
): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(now - DEMO_STALE_AFTER_MINUTES * MINUTE);
  const stale = await db
    .select()
    .from(orders)
    .where(
      and(
        "vanId" in scope ? eq(orders.vanId, scope.vanId) : eq(orders.customerId, scope.customerId),
        inArray(orders.status, ["outstanding", "fulfilled"]),
        lt(orders.startTime, cutoff),
      ),
    );
  for (const row of stale) {
    const start = row.startTime.getTime();
    const fulfilled = row.fulfilledTime?.getTime() ?? start + 12 * MINUTE;
    await db
      .update(orders)
      .set({
        status: "collected",
        fulfilledTime: new Date(fulfilled),
        collectionTime: new Date(Math.max(fulfilled + 5 * MINUTE, start + 20 * MINUTE)),
        discountApplied: row.discountApplied || fulfilled > row.discountTime.getTime(),
      })
      .where(eq(orders.orderId, row.orderId));
  }
  return stale.length;
}

/** Make sure the demo van has a few live orders when someone tries the vendor portal. */
export async function ensureVanActivity(vanId: string, now: number = Date.now()) {
  const db = await getDb();
  await closeStaleDemoOrders({ vanId }, now);
  const [{ n }] = await db
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.vanId, vanId), inArray(orders.status, ["outstanding", "fulfilled"])));
  const missing = Math.max(0, 3 - Number(n));
  const ages = [2, 8, 13];
  for (let i = 0; i < missing; i++) {
    const placed = await simulateOrder(vanId, now, ages[i]);
    if (placed.ok && i === 2) {
      await advanceOrder({
        vanId,
        orderId: placed.data.orderId,
        target: "fulfilled",
        now: now - 4 * MINUTE,
      });
    }
  }
}

/** Give the demo customer one live order so the tracking screen has something to show. */
export async function ensureCustomerActivity(
  customerId: string,
  vanId: string,
  now: number = Date.now(),
) {
  const db = await getDb();
  await closeStaleDemoOrders({ customerId }, now);
  const [{ n }] = await db
    .select({ n: count() })
    .from(orders)
    .where(
      and(eq(orders.customerId, customerId), inArray(orders.status, ["outstanding", "fulfilled"])),
    );
  if (Number(n) > 0) return;
  await placeOrder({
    customerId,
    vanId,
    lines: [
      { food: "Flat White", quantity: 1 },
      { food: "Fancy Biscuit", quantity: 1 },
    ],
    now: now - 1 * MINUTE,
    allowClosedVan: true,
  });
}
