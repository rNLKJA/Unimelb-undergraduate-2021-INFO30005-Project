"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { Stars } from "@/components/shared/stars";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { formatPrice } from "@/lib/pricing";
import type { OrderDTO } from "@/lib/types";

/** Every field of an order, like the original `vendor-order-details` / search result view. */
export function OrderDetailsDialog({ order }: { order: OrderDTO }) {
  const rows: [string, React.ReactNode][] = [
    ["Customer", `${order.customerName} (${order.customerId})`],
    ["Order date", order.orderDate],
    ["Start time", formatDateTime(order.startTime)],
    ["Discount time", formatDateTime(order.discountTime)],
    ["Fulfilled time", order.fulfilledTime ? formatDateTime(order.fulfilledTime) : "—"],
    ["Collection time", order.collectionTime ? formatDateTime(order.collectionTime) : "—"],
    ["Discount applied", order.discountApplied ? "Yes" : "No"],
    ["Rating", order.rating ? <Stars key="r" value={order.rating} size="size-3.5" /> : "—"],
    ["Comment", order.comment ?? "—"],
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded font-mono text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {order.orderId}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order <span className="font-mono">{order.orderId}</span>{" "}
            <StatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>{order.vanId}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 rounded-xl bg-muted/60 p-3 text-sm">
          {order.items.map((i) => (
            <li key={i.food} className="flex justify-between">
              <span>
                <span className="font-semibold">{i.quantity}×</span> {i.food}
              </span>
              <span className="tabular">{formatPrice(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t pt-1 font-semibold">
            <span>Total</span>
            <span className="tabular">{formatPrice(order.price)}</span>
          </li>
        </ul>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
