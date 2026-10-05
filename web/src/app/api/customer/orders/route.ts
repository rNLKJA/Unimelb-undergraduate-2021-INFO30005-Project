import { NextResponse } from "next/server";
import { currentCustomer } from "@/server/auth";
import { listCustomerOrders } from "@/server/orders";

/** Live list of the signed-in customer's in-progress orders (polled by the client). */
export async function GET() {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const active = await listCustomerOrders(customer.customerId, "active");
  return NextResponse.json(
    { active, serverNow: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
