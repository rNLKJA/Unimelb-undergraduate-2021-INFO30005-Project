"use server";

import type { VendorBoardData } from "@/lib/board";
import type { LiveResult } from "@/lib/fetcher";
import type { OrderDTO, VanDTO } from "@/lib/types";
import { currentCustomer, currentVan } from "@/server/auth";
import { getCustomerOrder, listCustomerOrders, vendorBoard } from "@/server/orders";
import { listVans } from "@/server/vans";

/**
 * Read-only Server Functions polled by the live screens (van finder, order
 * list, order tracker, vendor board).
 *
 * Why not Route Handlers: on Vercel, App Router pages and Route Handlers are
 * bundled into separate functions. Without a shared Turso database each
 * function keeps its own /tmp copy of the demo data, so a Route Handler would
 * never see an order the page's own Server Action had just written. These
 * functions run in the page's function instead. With Turso both would work;
 * keeping one path keeps the live screens simple.
 */

const unauthorised = { ok: false, status: 401, error: "Please log in to get access" } as const;

export async function liveVans(): Promise<LiveResult<{ vans: VanDTO[]; serverNow: number }>> {
  return { ok: true, data: { vans: await listVans(), serverNow: Date.now() } };
}

export async function liveActiveOrders(): Promise<
  LiveResult<{ active: OrderDTO[]; serverNow: number }>
> {
  const customer = await currentCustomer();
  if (!customer) return unauthorised;
  const active = await listCustomerOrders(customer.customerId, "active");
  return { ok: true, data: { active, serverNow: Date.now() } };
}

export async function liveOrder(
  orderId: string,
): Promise<LiveResult<{ order: OrderDTO; serverNow: number }>> {
  const customer = await currentCustomer();
  if (!customer) return unauthorised;
  const order = await getCustomerOrder(customer.customerId, String(orderId).slice(0, 40));
  if (!order) return { ok: false, status: 404, error: "Order not found" };
  return { ok: true, data: { order, serverNow: Date.now() } };
}

export async function liveVendorBoard(): Promise<LiveResult<VendorBoardData>> {
  const van = await currentVan();
  if (!van) return unauthorised;
  const board = await vendorBoard(van.vanId);
  return { ok: true, data: { ...board, van } };
}
