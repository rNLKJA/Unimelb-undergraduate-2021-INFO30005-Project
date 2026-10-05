import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getCustomer, type PublicCustomer } from "./customers";
import { adminExists } from "./records";
import { readSession } from "./session";
import { getVan } from "./vans";
import type { VanDTO } from "@/lib/types";

/**
 * Route guards — the revival's `ensureAuthenticated` / `ensureVanAuthenticated`.
 * A session only counts if its subject still exists (the demo database can be
 * reset underneath a browser that still holds a cookie).
 */
export const currentCustomer = cache(async (): Promise<PublicCustomer | null> => {
  const id = await readSession("customer");
  return id ? getCustomer(id) : null;
});

export const currentVan = cache(async (): Promise<VanDTO | null> => {
  const id = await readSession("vendor");
  return id ? getVan(id) : null;
});

export const currentAdmin = cache(async (): Promise<string | null> => {
  const username = await readSession("admin");
  return username && (await adminExists(username)) ? username : null;
});

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\"))
    return fallback;
  return next;
}

export async function requireCustomer(next: string): Promise<PublicCustomer> {
  const customer = await currentCustomer();
  if (!customer) redirect(`/customer/login?next=${encodeURIComponent(next)}`);
  return customer;
}

export async function requireVan(): Promise<VanDTO> {
  const van = await currentVan();
  if (!van) redirect("/vendor/login");
  return van;
}

export async function requireAdmin(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
