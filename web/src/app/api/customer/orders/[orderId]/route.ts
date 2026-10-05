import { NextResponse } from "next/server";
import { currentCustomer } from "@/server/auth";
import { getCustomerOrder } from "@/server/orders";

/** One order, for the live status timeline on the order page. */
export async function GET(_request: Request, ctx: RouteContext<"/api/customer/orders/[orderId]">) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { orderId } = await ctx.params;
  const order = await getCustomerOrder(customer.customerId, orderId);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(
    { order, serverNow: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
