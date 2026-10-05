import "server-only";
import { desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { blogs, customers, orderItems, orders } from "@/db/schema";
import { orderDateString } from "@/lib/legacy-time";
import { publicName } from "@/lib/slug";
import type { BlogDTO, RatingDTO } from "@/lib/types";

async function authors(ids: string[]) {
  if (!ids.length) return new Map<string, { name: string; avatar: string }>();
  const db = await getDb();
  const rows = await db
    .select({
      customerId: customers.customerId,
      firstName: customers.firstName,
      lastName: customers.lastName,
      avatar: customers.portfolioImg,
    })
    .from(customers)
    .where(inArray(customers.customerId, ids));
  return new Map(
    rows.map((r) => [
      r.customerId,
      { name: publicName(r.firstName, r.lastName), avatar: r.avatar ?? "flat-white" },
    ]),
  );
}

/** Port of `blog_req`: the 100 newest posts. Author emails are never exposed. */
export async function listPosts(viewer: string | null, limit = 100): Promise<BlogDTO[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(blogs)
    .orderBy(desc(blogs.createdAt), desc(blogs.id))
    .limit(limit);
  const who = await authors([...new Set(rows.map((r) => r.customerId))]);
  return rows.map((r) => ({
    id: r.id,
    authorName: who.get(r.customerId)?.name ?? "Snacker",
    avatar: who.get(r.customerId)?.avatar ?? "flat-white",
    content: r.content,
    date: r.date,
    createdAt: r.createdAt.getTime(),
    mine: viewer === r.customerId,
  }));
}

/** Port of `blog_post` (date stored as the legacy "D-M-YYYY" string). */
export async function createPost(customerId: string, content: string, now: number = Date.now()) {
  const db = await getDb();
  await db.insert(blogs).values({
    customerId,
    content,
    date: orderDateString(new Date(now)),
    createdAt: new Date(now),
  });
}

/** Recent order ratings (the "Bonus 3" rating feature) for the community page. */
export async function recentRatings(limit = 24): Promise<RatingDTO[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(isNotNull(orders.rating))
    .orderBy(desc(orders.startTime))
    .limit(limit);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.orderId);
  const [who, items] = await Promise.all([
    authors([...new Set(rows.map((r) => r.customerId))]),
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
  ]);
  return rows.map((r) => ({
    orderId: r.orderId,
    vanId: r.vanId,
    rating: r.rating as number,
    comment: r.comment,
    customerName: who.get(r.customerId)?.name ?? "Snacker",
    avatar: who.get(r.customerId)?.avatar ?? "flat-white",
    at: (r.collectionTime ?? r.startTime).getTime(),
    items: items.filter((i) => i.orderId === r.orderId).map((i) => `${i.quantity}× ${i.food}`),
  }));
}

export async function postCountBy(customerId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: blogs.id })
    .from(blogs)
    .where(eq(blogs.customerId, customerId));
  return rows.length;
}
