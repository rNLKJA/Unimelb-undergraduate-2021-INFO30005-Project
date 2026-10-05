import { BadgePercent, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Stars } from "@/components/shared/stars";
import { formatDateTime } from "@/lib/format";
import { discountApplies } from "@/lib/order-rules";
import { formatPrice } from "@/lib/pricing";
import type { OrderDTO } from "@/lib/types";
import { MiniRing } from "./countdown-ring";

export function OrderCard({ order, now, live }: { order: OrderDTO; now: number; live?: boolean }) {
  const discounted = discountApplies({ ...order, now });
  const summary = order.items.map((i) => `${i.quantity}× ${i.food}`).join(", ");
  return (
    <Link
      href={`/customer/orders/${order.orderId}`}
      className="group flex items-center gap-4 rounded-3xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      {live ? <MiniRing status={order.status} startTime={order.startTime} now={now} /> : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium">{order.orderId}</span>
          <StatusBadge status={order.status} />
          {discounted && order.status !== "canceled" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-tomato-300/20 px-2 py-0.5 text-xs font-semibold text-tomato-700 dark:text-tomato-300">
              <BadgePercent className="size-3.5" aria-hidden /> Late discount
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm">{summary}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {order.vanId} · {formatDateTime(order.startTime)}
        </p>
        {order.rating ? <Stars value={order.rating} size="size-3.5" /> : null}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="tabular font-display text-lg font-semibold">
          {formatPrice(order.price)}
        </span>
        <ChevronRight
          className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}
