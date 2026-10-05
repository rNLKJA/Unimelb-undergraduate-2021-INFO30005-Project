/**
 * Deterministic seed: the recovered menu, 15 vans around inner Melbourne,
 * demo + synthetic customers, three weeks of order history with ratings, and
 * community blog posts. Content is reproducible (seeded PRNG); timestamps are
 * relative to the moment the seed runs so the history always looks recent.
 *
 *   pnpm db:seed     # seed DATABASE_URL (default file:./data/app.db)
 *   pnpm db:reset    # delete, migrate and seed ./data/app.db
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { MENU } from "../lib/menu";
import { orderDateString } from "../lib/legacy-time";
import { generateOrderId } from "../lib/order-id";
import { orderTotal } from "../lib/pricing";
import { intBetween, mulberry32, pick } from "../lib/rng";
import { OVERDUE_MINUTES } from "../lib/order-rules";
import type { Db } from "./connection";
import * as schema from "./schema";
import { SEEDED_AT_KEY } from "./rebase";
import {
  BLOG_POSTS,
  CUSTOMER_SEEDS,
  DEMO_CREDENTIALS,
  RATING_COMMENTS,
  VAN_SEEDS,
} from "./seed-data";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
export const SEED = 4399; // the team's group number

export type SeedOptions = { now?: number; bcryptRounds?: number; historyDays?: number };

export async function clearDatabase(db: Db) {
  // Children first so foreign keys are never violated.
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.blogs);
  await db.delete(schema.customers);
  await db.delete(schema.vans);
  await db.delete(schema.products);
  await db.delete(schema.admins);
  await db.delete(schema.appMeta);
  await db.run(sql`DELETE FROM sqlite_sequence`).catch(() => undefined);
}

export async function seedDatabase(db: Db, options: SeedOptions = {}) {
  const now = options.now ?? Date.now();
  const rounds = options.bcryptRounds ?? 10;
  const historyDays = options.historyDays ?? 21;
  const random = mulberry32(SEED);

  await clearDatabase(db);

  // Menu ----------------------------------------------------------------------
  await db.insert(schema.products).values(
    MENU.map((m) => ({
      product: m.product,
      price: m.price,
      photo: m.photo,
      description: m.description,
    })),
  );

  // Accounts ------------------------------------------------------------------
  const [customerHash, vendorHash, adminHash] = await Promise.all([
    bcrypt.hash(DEMO_CREDENTIALS.customer.password, rounds),
    bcrypt.hash(DEMO_CREDENTIALS.vendor.password, rounds),
    bcrypt.hash(DEMO_CREDENTIALS.admin.password, rounds),
  ]);

  await db.insert(schema.admins).values({
    username: DEMO_CREDENTIALS.admin.username,
    password: adminHash,
    createdAt: new Date(now - 30 * DAY),
  });

  await db.insert(schema.customers).values(
    CUSTOMER_SEEDS.map((c, i) => ({
      customerId: c.customerId,
      firstName: c.firstName,
      lastName: c.lastName,
      password: customerHash,
      portfolioImg: c.avatar,
      createdAt: new Date(now - (28 - i) * DAY),
    })),
  );

  await db.insert(schema.vans).values(
    VAN_SEEDS.map((v) => ({
      vanId: v.vanId,
      password: vendorHash,
      xCoord: v.lat,
      yCoord: v.lng,
      address: v.address,
      status: v.status,
      locationUpdatedAt: new Date(now - intBetween(random, 5, 90) * MINUTE),
    })),
  );

  // Order history -------------------------------------------------------------
  const usedIds = new Set<string>();
  const nextOrderId = () => {
    let id = generateOrderId(random);
    while (usedIds.has(id)) id = generateOrderId(random);
    usedIds.add(id);
    return id;
  };

  type NewOrder = typeof schema.orders.$inferInsert;
  type NewItem = typeof schema.orderItems.$inferInsert;
  const orderRows: NewOrder[] = [];
  const itemRows: NewItem[] = [];

  const demoVan = DEMO_CREDENTIALS.vendor.vanId;
  const customerIds = CUSTOMER_SEEDS.map((c) => c.customerId);

  function addOrder(startTime: number, vanId: string, forceStatus?: "collected" | "canceled") {
    const orderId = nextOrderId();
    const lineCount = intBetween(random, 1, 3);
    const foods = new Set<string>();
    while (foods.size < lineCount) foods.add(pick(random, MENU).product);
    const lines = [...foods].map((food) => ({
      food,
      quantity: food.includes("Cake") ? 1 : intBetween(random, 1, 3),
    }));
    const price = orderTotal(lines, MENU);
    const discountTime = startTime + OVERDUE_MINUTES * MINUTE;
    const status = forceStatus ?? (random() < 0.12 ? "canceled" : "collected");

    let fulfilledTime: number | null = null;
    let collectionTime: number | null = null;
    let rating: number | null = null;
    let comment: string | null = null;
    if (status === "collected") {
      fulfilledTime = startTime + intBetween(random, 4 * 60, 21 * 60) * 1000;
      collectionTime = fulfilledTime + intBetween(random, 1 * 60, 12 * 60) * 1000;
      if (random() < 0.6) {
        rating = pick(random, [5, 5, 5, 4, 4, 4, 3, 2]);
        comment = random() < 0.6 ? pick(random, RATING_COMMENTS) : null;
      }
    }

    orderRows.push({
      orderId,
      vanId,
      customerId: pick(random, customerIds),
      price,
      status,
      orderDate: orderDateString(new Date(startTime)),
      startTime: new Date(startTime),
      discountTime: new Date(discountTime),
      fulfilledTime: fulfilledTime ? new Date(fulfilledTime) : null,
      collectionTime: collectionTime ? new Date(collectionTime) : null,
      rating,
      comment,
      discountApplied: fulfilledTime != null && fulfilledTime > discountTime,
    });
    for (const line of lines) itemRows.push({ orderId, ...line });
  }

  for (let daysAgo = historyDays; daysAgo >= 1; daysAgo--) {
    const count = intBetween(random, 6, 11);
    for (let i = 0; i < count; i++) {
      const start = now - daysAgo * DAY - intBetween(random, 0, 10 * 60) * MINUTE;
      const vanId = random() < 0.3 ? demoVan : pick(random, VAN_SEEDS).vanId;
      addOrder(start, vanId);
    }
  }
  // A few already-collected orders earlier "today" so the vendor board has history.
  for (let i = 0; i < 4; i++) {
    addOrder(now - intBetween(random, 70, 300) * MINUTE, demoVan, "collected");
  }

  orderRows.sort((a, b) => (a.startTime as Date).getTime() - (b.startTime as Date).getTime());
  for (let i = 0; i < orderRows.length; i += 100) {
    await db.insert(schema.orders).values(orderRows.slice(i, i + 100));
  }
  for (let i = 0; i < itemRows.length; i += 200) {
    await db.insert(schema.orderItems).values(itemRows.slice(i, i + 200));
  }

  // Community blog ------------------------------------------------------------
  await db.insert(schema.blogs).values(
    BLOG_POSTS.map((p, i) => {
      const created = now - p.daysAgo * DAY - (BLOG_POSTS.length - i) * 17 * MINUTE;
      return {
        customerId: p.author,
        content: p.content,
        date: orderDateString(new Date(created)),
        createdAt: new Date(created),
      };
    }),
  );

  await db.insert(schema.appMeta).values({ key: SEEDED_AT_KEY, value: String(now) });

  return {
    products: MENU.length,
    vans: VAN_SEEDS.length,
    customers: CUSTOMER_SEEDS.length,
    orders: orderRows.length,
    orderItems: itemRows.length,
    blogs: BLOG_POSTS.length,
    admins: 1,
  };
}
