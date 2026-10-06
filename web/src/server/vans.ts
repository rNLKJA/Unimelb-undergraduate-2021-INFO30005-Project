import "server-only";
import bcrypt from "bcryptjs";
import { asc, avg, count, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { orders, vans, type Van } from "@/db/schema";
import { VAN_CLOSED, VAN_OPEN } from "@/lib/nearest-vans";
import { MESSAGES } from "@/lib/validation";
import { vanSlug } from "@/lib/slug";
import type { VanDTO } from "@/lib/types";
import { auditInsert } from "./audit";

type Ratings = Map<string, { average: number; count: number }>;

async function ratingsByVan(): Promise<Ratings> {
  const db = await getDb();
  const rows = await db
    .select({ vanId: orders.vanId, average: avg(orders.rating), count: count(orders.rating) })
    .from(orders)
    .where(isNotNull(orders.rating))
    .groupBy(orders.vanId);
  return new Map(
    rows.map((r) => [
      r.vanId,
      { average: Math.round(Number(r.average ?? 0) * 10) / 10, count: Number(r.count) },
    ]),
  );
}

export function toVanDTO(van: Van, ratings?: Ratings): VanDTO {
  return {
    id: van.id,
    vanId: van.vanId,
    slug: vanSlug(van.vanId),
    lat: van.xCoord,
    lng: van.yCoord,
    address: van.address,
    status: van.status,
    open: van.status === VAN_OPEN,
    locationUpdatedAt: van.locationUpdatedAt ? van.locationUpdatedAt.getTime() : null,
    rating: ratings?.get(van.vanId) ?? null,
  };
}

/** Every van in database order (the order `locate_van` ranked ties by). */
export async function listVans(): Promise<VanDTO[]> {
  const db = await getDb();
  const [rows, ratings] = await Promise.all([
    db.select().from(vans).orderBy(asc(vans.id)),
    ratingsByVan(),
  ]);
  return rows.map((v) => toVanDTO(v, ratings));
}

export async function getVan(vanId: string): Promise<VanDTO | null> {
  const db = await getDb();
  const [row] = await db.select().from(vans).where(eq(vans.vanId, vanId)).limit(1);
  if (!row) return null;
  return toVanDTO(row, await ratingsByVan());
}

export async function getVanBySlug(slug: string): Promise<VanDTO | null> {
  const all = await listVans();
  return all.find((v) => v.slug === slug) ?? null;
}

/** Port of `setStatus` / `turnVanStatusOn` / `turnVanStatusOff`, now audit-logged. */
export async function setVanStatus(
  vanId: string,
  open: boolean,
  now: number = Date.now(),
): Promise<void> {
  const db = await getDb();
  const [row] = await db
    .select({ status: vans.status })
    .from(vans)
    .where(eq(vans.vanId, vanId))
    .limit(1);
  if (!row) return;
  const next = open ? VAN_OPEN : VAN_CLOSED;
  await db.batch([
    db.update(vans).set({ status: next }).where(eq(vans.vanId, vanId)),
    auditInsert(db, {
      actor: { role: "vendor", id: vanId },
      action: open ? "van.opened" : "van.closed",
      entityType: "van",
      entityId: vanId,
      detail: { from: row.status === VAN_OPEN ? "open" : "closed", to: open ? "open" : "closed" },
      effectiveAt: now,
    }),
  ]);
}

/** Port of `getVanLocation`: coordinates plus the (typed or geocoded) address. */
export async function setVanLocation(
  vanId: string,
  location: { lat: number; lng: number; address: string },
  now: number = Date.now(),
): Promise<void> {
  const db = await getDb();
  await db.batch([
    db
      .update(vans)
      .set({
        xCoord: location.lat,
        yCoord: location.lng,
        address: location.address,
        locationUpdatedAt: new Date(now),
      })
      .where(eq(vans.vanId, vanId)),
    auditInsert(db, {
      actor: { role: "vendor", id: vanId },
      action: "van.location_updated",
      entityType: "van",
      entityId: vanId,
      detail: {
        lat: Math.round(location.lat * 1e5) / 1e5,
        lng: Math.round(location.lng * 1e5) / 1e5,
        address: location.address,
      },
      effectiveAt: now,
    }),
  ]);
}

/**
 * Port of the "vendor-login" passport strategy. The original compared an
 * unsalted MD5; the revival stores bcrypt hashes. Like the original vendor
 * login view, one generic message is shown whichever part was wrong.
 */
export async function authenticateVan(
  vanId: string,
  password: string,
): Promise<{ ok: true; vanId: string } | { ok: false; message: string }> {
  const db = await getDb();
  const [row] = await db.select().from(vans).where(eq(vans.vanId, vanId)).limit(1);
  if (!row || !(await bcrypt.compare(password, row.password))) {
    return { ok: false, message: MESSAGES.vendorLoginFailed };
  }
  return { ok: true, vanId: row.vanId };
}
