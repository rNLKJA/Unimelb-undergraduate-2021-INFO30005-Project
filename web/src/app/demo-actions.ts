"use server";

import { redirect } from "next/navigation";
import { DEMO_CREDENTIALS } from "@/db/seed-data";
import { safeNext } from "@/server/auth";
import { getCustomer } from "@/server/customers";
import { ensureCustomerActivity, ensureVanActivity } from "@/server/orders";
import { adminExists } from "@/server/records";
import { startSession } from "@/server/session";
import { getVan } from "@/server/vans";

/**
 * One-click "Try as customer / vendor / admin". Each demo account is part of
 * the seed; before handing over, a little live activity is topped up so the
 * order tracker and the vendor board have something to show.
 */
export async function demoLoginAction(form: FormData): Promise<void> {
  const role = String(form.get("role"));
  const vendorVan = DEMO_CREDENTIALS.vendor.vanId;

  if (role === "customer") {
    const id = DEMO_CREDENTIALS.customer.customerId;
    if (!(await getCustomer(id))) redirect("/customer/login?demo=missing");
    await ensureCustomerActivity(id, vendorVan);
    await startSession("customer", id);
    redirect(safeNext(String(form.get("next") ?? ""), "/customer"));
  }

  if (role === "vendor") {
    if (!(await getVan(vendorVan))) redirect("/vendor/login?demo=missing");
    await ensureVanActivity(vendorVan);
    await startSession("vendor", vendorVan);
    redirect("/vendor/orders");
  }

  if (role === "admin") {
    if (!(await adminExists(DEMO_CREDENTIALS.admin.username)))
      redirect("/admin/login?demo=missing");
    await startSession("admin", DEMO_CREDENTIALS.admin.username);
    redirect("/admin/records");
  }

  redirect("/");
}
