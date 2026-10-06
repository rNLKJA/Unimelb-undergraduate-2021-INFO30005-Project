import type { Metadata } from "next";
import { OrdersView } from "@/components/customer/orders-view";
import { requireCustomer } from "@/server/auth";
import { serverNow } from "@/server/clock";
import { listCustomerOrders } from "@/server/orders";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const customer = await requireCustomer("/customer/orders");
  const [active, completed, cancelled] = await Promise.all([
    listCustomerOrders(customer.customerId, "active"),
    listCustomerOrders(customer.customerId, "completed"),
    listCustomerOrders(customer.customerId, "cancelled"),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">My orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live orders refresh by themselves. Tap an order to track it, change it or rate it.
        </p>
      </div>
      <OrdersView
        active={active}
        completed={completed}
        cancelled={cancelled}
        serverNow={serverNow()}
      />
    </div>
  );
}
