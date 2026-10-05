"use client";

import {
  BadgePercent,
  Check,
  ChefHat,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Store,
  Timer,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { liveVendorBoard } from "@/app/live-actions";
import { advanceOrderAction, simulateOrderAction } from "@/app/vendor/actions";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { liveData } from "@/lib/fetcher";
import { formatWhen } from "@/lib/format";
import { prepTone, vendorTimer } from "@/lib/order-rules";
import { formatPrice } from "@/lib/pricing";
import type { VendorBoardData } from "@/lib/board";
import type { OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatTiles } from "./stat-tiles";

const TONE = {
  preparing: "border-l-honey-400",
  "on-time": "border-l-matcha-500",
  late: "border-l-tomato-500",
} as const;

function Ticket({
  order,
  now,
  busy,
  onAdvance,
}: {
  order: OrderDTO;
  now: number;
  busy: boolean;
  onAdvance: (order: OrderDTO) => void;
}) {
  const timer = vendorTimer({
    status: order.status,
    discountTime: order.discountTime,
    discountApplied: order.discountApplied,
    now,
  });
  const tone = prepTone({
    status: order.status,
    discountTime: order.discountTime,
    fulfilledTime: order.fulfilledTime,
    now,
  });
  return (
    <motion.article
      layout
      layoutId={order.orderId}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn("rounded-xl border border-l-4 bg-card p-3 shadow-sm", TONE[tone])}
      aria-label={`Order ${order.orderId} for ${order.customerName}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-medium">{order.orderId}</p>
          <p className="text-xs text-muted-foreground">
            {order.customerName} · {formatWhen(order.startTime, now)}
          </p>
        </div>
        <p className="tabular text-right font-display text-base font-semibold">
          {formatPrice(order.price)}
        </p>
      </header>
      <ul className="mt-2 space-y-0.5 text-sm">
        {order.items.map((item) => (
          <li key={item.food} className="flex gap-2">
            <span className="tabular w-6 shrink-0 text-right font-bold">{item.quantity}×</span>
            <span>{item.food}</span>
          </li>
        ))}
      </ul>
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {order.status === "outstanding" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              timer.overdue
                ? "bg-tomato-300/25 text-tomato-700 dark:text-tomato-300"
                : "bg-honey-300/40 text-espresso-800 dark:bg-honey-300/15 dark:text-honey-300",
            )}
          >
            <Timer className="size-3.5" aria-hidden /> {timer.label}
          </span>
        ) : order.discountApplied ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-tomato-300/20 px-2 py-0.5 text-xs font-semibold text-tomato-700 dark:text-tomato-300">
            <BadgePercent className="size-3.5" aria-hidden /> Discount applied
          </span>
        ) : order.fulfilledTime ? (
          <span className="text-xs text-muted-foreground">
            Ready at {formatWhen(order.fulfilledTime, now)}
          </span>
        ) : (
          <span />
        )}
        {order.status === "outstanding" ? (
          <Button
            size="sm"
            className="h-8 rounded-lg"
            disabled={busy}
            onClick={() => onAdvance(order)}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}{" "}
            Fulfilled
          </Button>
        ) : order.status === "fulfilled" ? (
          <Button
            size="sm"
            className="h-8 rounded-lg bg-matcha-600 text-white hover:bg-matcha-700"
            disabled={busy}
            onClick={() => onAdvance(order)}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <PackageCheck aria-hidden />}{" "}
            Collected
          </Button>
        ) : order.collectionTime ? (
          <span className="text-xs text-muted-foreground">
            Picked up {formatWhen(order.collectionTime, now)}
          </span>
        ) : null}
      </footer>
    </motion.article>
  );
}

function Column({
  title,
  hint,
  icon: Icon,
  orders,
  empty,
  children,
  accent,
}: {
  title: string;
  hint: string;
  icon: typeof ChefHat;
  orders: OrderDTO[];
  empty: string;
  children: (order: OrderDTO) => React.ReactNode;
  accent: string;
}) {
  return (
    <section
      className="flex min-h-48 flex-col rounded-2xl bg-muted/80 p-2.5"
      aria-label={`${title}: ${orders.length}`}
    >
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
          <span className={cn("grid size-6 place-items-center rounded-md text-white", accent)}>
            <Icon className="size-3.5" aria-hidden />
          </span>
          {title}
          <span className="tabular rounded-full bg-card px-2 py-0.5 text-xs">{orders.length}</span>
        </h2>
        <span className="hidden text-xs text-muted-foreground xl:inline">{hint}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {orders.map((order) => children(order))}
        </AnimatePresence>
        {orders.length === 0 ? (
          <p className="grid flex-1 place-items-center rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function OrderBoard({ initial }: { initial: VendorBoardData }) {
  const { data, error, mutate, isValidating } = useSWR<VendorBoardData>(
    "live-vendor-board",
    () => liveData(liveVendorBoard()),
    {
      refreshInterval: 3000,
      fallbackData: initial,
      revalidateOnMount: false,
    },
  );
  const board = data ?? initial;
  const now = useNow(initial.serverNow);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [simulating, startSimulate] = useTransition();
  const known = useRef(new Set(initial.outstanding.map((o) => o.orderId)));

  // Announce orders that arrive while the board is open.
  useEffect(() => {
    const fresh = board.outstanding.filter((o) => !known.current.has(o.orderId));
    for (const o of board.outstanding) known.current.add(o.orderId);
    if (fresh.length && fresh.length < 4) {
      for (const o of fresh) {
        toast(`New order ${o.orderId}`, {
          description: `${o.customerName}: ${o.items.map((i) => `${i.quantity}× ${i.food}`).join(", ")}`,
          icon: <ChefHat className="size-4" />,
        });
      }
    }
  }, [board.outstanding]);

  const advance = async (order: OrderDTO) => {
    const target = order.status === "outstanding" ? "fulfilled" : "collected";
    setBusyId(order.orderId);
    // Optimistically move the ticket, then confirm with the server.
    const optimistic: VendorBoardData = {
      ...board,
      outstanding:
        target === "fulfilled"
          ? board.outstanding.filter((o) => o.orderId !== order.orderId)
          : board.outstanding,
      fulfilled:
        target === "fulfilled"
          ? [
              ...board.fulfilled,
              {
                ...order,
                status: "fulfilled",
                fulfilledTime: Date.now(),
                discountApplied: order.discountApplied || Date.now() > order.discountTime,
              },
            ]
          : board.fulfilled.filter((o) => o.orderId !== order.orderId),
      collected:
        target === "collected"
          ? [{ ...order, status: "collected", collectionTime: Date.now() }, ...board.collected]
          : board.collected,
    };
    try {
      await mutate(
        async () => {
          const result = await advanceOrderAction(order.orderId, target);
          if (result.status === "error") throw new Error(result.message);
          toast.success(
            target === "fulfilled" ? `${order.orderId} Fulfilled!` : `${order.orderId} Collected!`,
          );
          return liveData(liveVendorBoard());
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the order");
    } finally {
      setBusyId(null);
    }
  };

  const simulate = () =>
    startSimulate(async () => {
      const result = await simulateOrderAction();
      if (result.status === "error") toast.error(result.message);
      await mutate();
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Order board</h1>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            {error ? (
              <>
                <WifiOff className="size-3.5 text-tomato-500" aria-hidden /> Connection lost,
                retrying…
              </>
            ) : (
              <>
                <RefreshCw className={cn("size-3.5", isValidating && "animate-spin")} aria-hidden />{" "}
                Live · refreshes every 3 s
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!board.van.open ? (
            <Link
              href="/vendor"
              className="inline-flex items-center gap-1.5 rounded-lg bg-honey-300/40 px-3 py-1.5 text-sm font-medium text-espresso-800 dark:text-honey-300"
            >
              <Store className="size-4" aria-hidden /> Van is closed: open it to appear on the map
            </Link>
          ) : null}
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={simulate}
            disabled={simulating}
          >
            {simulating ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Simulate a customer order
          </Button>
        </div>
      </div>

      <StatTiles stats={board.stats} />

      <LayoutGroup>
        <div className="grid gap-3 lg:grid-cols-3">
          <Column
            title="Outstanding"
            hint="Oldest first"
            icon={ChefHat}
            accent="bg-honey-500"
            orders={board.outstanding}
            empty="No orders waiting. Nice work."
          >
            {(order) => (
              <Ticket
                key={order.orderId}
                order={order}
                now={now}
                busy={busyId === order.orderId}
                onAdvance={advance}
              />
            )}
          </Column>
          <Column
            title="Ready for pickup"
            hint="Waiting for the customer"
            icon={PackageCheck}
            accent="bg-matcha-500"
            orders={board.fulfilled}
            empty="Nothing on the counter."
          >
            {(order) => (
              <Ticket
                key={order.orderId}
                order={order}
                now={now}
                busy={busyId === order.orderId}
                onAdvance={advance}
              />
            )}
          </Column>
          <Column
            title="Recently collected"
            hint="Last 24 hours"
            icon={Check}
            accent="bg-espresso-500"
            orders={board.collected}
            empty="No pickups in the last 24 hours."
          >
            {(order) => (
              <Ticket
                key={order.orderId}
                order={order}
                now={now}
                busy={false}
                onAdvance={advance}
              />
            )}
          </Column>
        </div>
      </LayoutGroup>
    </div>
  );
}
