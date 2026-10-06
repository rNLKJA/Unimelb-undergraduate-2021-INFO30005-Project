import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { OrderTracker } from "@/components/customer/order-tracker";
import { currentCustomer, requireCustomer } from "@/server/auth";
import { serverNow } from "@/server/clock";
import { listMenu } from "@/server/menu";
import { getCustomerOrder } from "@/server/orders";

/** One lookup per request, shared by the metadata and the page. */
const loadOrder = cache(async (customerId: string, orderId: string) =>
  getCustomerOrder(customerId, orderId),
);

export async function generateMetadata(
  props: PageProps<"/customer/orders/[orderId]">,
): Promise<Metadata> {
  const { orderId } = await props.params;
  const customer = await currentCustomer();
  const order = customer ? await loadOrder(customer.customerId, orderId) : null;
  // The orders segment streams a loading state, so a missing order renders the
  // not-found UI after the head is sent; keep the tab title in step with it.
  return { title: order ? `Order ${order.orderId}` : "Order not found" };
}

export default async function OrderPage(props: PageProps<"/customer/orders/[orderId]">) {
  const { orderId } = await props.params;
  const customer = await requireCustomer(`/customer/orders/${orderId}`);
  const [order, menu] = await Promise.all([loadOrder(customer.customerId, orderId), listMenu()]);
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link
        href="/customer/orders"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> My orders
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-semibold">
          Order <span className="font-mono text-[0.85em] font-medium">{order.orderId}</span>
        </h1>
        <p className="text-sm text-muted-foreground">Ding ding! Here’s your order summary.</p>
      </div>
      <OrderTracker initial={order} menu={menu} serverNow={serverNow()} />
    </div>
  );
}
