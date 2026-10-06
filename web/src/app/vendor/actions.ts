"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/types";
import { vanLocationSchema, vendorLoginSchema } from "@/lib/validation";
import { recordAudit } from "@/server/audit";
import { currentVan } from "@/server/auth";
import { reverseGeocode } from "@/server/geocode";
import { advanceOrder, simulateOrder } from "@/server/orders";
import { endSession, startSession } from "@/server/session";
import { authenticateVan, setVanLocation, setVanStatus } from "@/server/vans";

export async function vendorLoginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = vendorLoginSchema.safeParse({
    vanId: form.get("vanId"),
    password: form.get("password"),
  });
  if (!parsed.success)
    return { status: "error", message: "Please Enter the CORRECT Van ID or Password" };
  const result = await authenticateVan(parsed.data.vanId, parsed.data.password);
  if (!result.ok) return { status: "error", message: result.message };
  await startSession("vendor", result.vanId);
  await recordAudit({
    actor: { role: "vendor", id: result.vanId },
    action: "session.started",
    entityType: "session",
    entityId: "vendor",
  });
  redirect("/vendor/orders");
}

export async function vendorLogoutAction(): Promise<void> {
  await endSession("vendor");
  redirect("/vendor/login");
}

/**
 * Port of `setStatus`. The original header refused to toggle until the
 * vendor had pushed a location in the current page session ("You need update
 * location first"); the client enforces that for opening, and the server
 * double-checks that the van has an address to show customers.
 */
export async function setVanOpenAction(open: boolean): Promise<ActionState> {
  const van = await currentVan();
  if (!van) return { status: "error", message: "Please log in to get access" };
  if (open && !van.address) return { status: "error", message: "You need update location first" };
  await setVanStatus(van.vanId, open);
  revalidatePath("/vendor", "layout");
  revalidatePath("/customer");
  return { status: "ok", message: open ? "Van Online!" : "Van Offline!" };
}

/**
 * Port of `getVanLocation`: save the GPS / map position; a vendor-typed
 * address wins, otherwise the reverse-geocoded one is stored.
 */
export async function setVanLocationAction(input: {
  lat: number;
  lng: number;
  address?: string;
}): Promise<ActionState & { address?: string }> {
  const van = await currentVan();
  if (!van) return { status: "error", message: "Please log in to get access" };
  const parsed = vanLocationSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "location Update fail!" };
  const typed = parsed.data.address.trim();
  const address =
    typed || (await reverseGeocode({ lat: parsed.data.lat, lng: parsed.data.lng })).label;
  await setVanLocation(van.vanId, { lat: parsed.data.lat, lng: parsed.data.lng, address });
  revalidatePath("/vendor", "layout");
  revalidatePath("/customer");
  return { status: "ok", message: "Location updated", address };
}

export async function advanceOrderAction(
  orderId: string,
  target: "fulfilled" | "collected",
): Promise<ActionState> {
  const van = await currentVan();
  if (!van) return { status: "error", message: "Please log in to get access" };
  if (target !== "fulfilled" && target !== "collected")
    return { status: "error", message: "Unknown state" };
  const result = await advanceOrder({ vanId: van.vanId, orderId: String(orderId), target });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/vendor/history");
  return { status: "ok", message: result.message };
}

export async function simulateOrderAction(): Promise<ActionState> {
  const van = await currentVan();
  if (!van) return { status: "error", message: "Please log in to get access" };
  const result = await simulateOrder(van.vanId);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "ok", message: `New order ${result.data.orderId} from a demo customer` };
}
