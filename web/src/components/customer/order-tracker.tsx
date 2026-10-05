"use client";

import { BadgePercent, Ban, Clock, Loader2, MapPin, Navigation, Store } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { cancelOrderAction } from "@/app/customer/actions";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { fetcher } from "@/lib/fetcher";
import { formatDate, formatTime } from "@/lib/format";
import {
  canCustomerModify,
  CANCEL_WINDOW_CLOSED_MESSAGE,
  discountApplies,
  MODIFY_WINDOW_CLOSED_MESSAGE,
  UPDATE_WINDOW_MINUTES,
} from "@/lib/order-rules";
import { formatPrice } from "@/lib/pricing";
import type { OrderDTO, ProductDTO } from "@/lib/types";
import { ChangeOrderDialog } from "./change-order-dialog";
import { CountdownRing } from "./countdown-ring";
import { OrderTimeline } from "./order-timeline";
import { RatingForm } from "./rating-form";

const VanMap = dynamic(() => import("@/components/map/van-map").then((m) => m.VanMap), {
  ssr: false,
  loading: () => <div className="bg-grain h-full w-full animate-pulse bg-muted" />,
});

const HEADLINE = {
  outstanding: "Your order is being prepared",
  fulfilled: "Ready for pickup!",
  collected: "Collected. Enjoy!",
  canceled: "Order cancelled",
} as const;

function windowLeft(ms: number) {
  // timeAllow() keeps the window open until the elapsed minute count passes 10.
  const left = Math.max(0, (UPDATE_WINDOW_MINUTES + 1) * 60_000 - ms);
  const s = Math.floor(left / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Poll every 4 s until the order is finished. Defined once at module level:
 * SWR restarts its timer whenever this function's identity changes, and the
 * tracker re-renders every second for the countdown.
 */
function pollInterval(latest?: { order: OrderDTO }) {
  return latest && (latest.order.status === "collected" || latest.order.status === "canceled")
    ? 0
    : 4000;
}

export function OrderTracker({
  initial,
  menu,
  serverNow,
}: {
  initial: OrderDTO;
  menu: ProductDTO[];
  serverNow: number;
}) {
  const { data, mutate } = useSWR<{ order: OrderDTO; serverNow: number }>(
    `/api/customer/orders/${initial.orderId}`,
    fetcher,
    {
      refreshInterval: pollInterval,
      fallbackData: { order: initial, serverNow },
      revalidateOnMount: false,
    },
  );
  const order = data?.order ?? initial;
  const now = useNow(serverNow);
  const elapsed = now - order.startTime;
  const modifiable = canCustomerModify(order.status, elapsed);
  const discounted = discountApplies({ ...order, now });
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  // Keep an open dialog mounted when the window closes mid-edit, so the
  // customer sees why Save/Cancel stopped working instead of losing the dialog.
  const showControls = order.status === "outstanding" && (modifiable || changeOpen || cancelOpen);
  const live = order.status === "outstanding" || order.status === "fulfilled";

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelOrderAction(order.orderId);
      setCancelOpen(false);
      if (result.status === "ok") {
        toast.success("order canceled");
        await mutate();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-3xl border bg-card shadow-sm"
          aria-labelledby="order-status"
        >
          <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <CountdownRing status={order.status} startTime={order.startTime} now={now} />
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={order.status}
                  id="order-status"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-2xl font-semibold"
                >
                  {HEADLINE[order.status]}
                </motion.h2>
              </AnimatePresence>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <StatusBadge status={order.status} />
                {discounted && order.status !== "canceled" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-tomato-300/20 px-2.5 py-0.5 text-xs font-semibold text-tomato-700 dark:text-tomato-300">
                    <BadgePercent className="size-3.5" aria-hidden /> Late-order discount applies
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Ordered at {formatTime(order.startTime)} on {formatDate(order.startTime)}
                {order.status === "outstanding" ? (
                  <> · Ready by {formatTime(order.discountTime)}</>
                ) : null}
              </p>
              {showControls ? (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
                  <ChangeOrderDialog
                    order={order}
                    menu={menu}
                    open={changeOpen}
                    onOpenChange={setChangeOpen}
                    windowClosed={!modifiable}
                    onSaved={() => mutate()}
                  />
                  <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                    {modifiable ? (
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-10 rounded-full px-4 text-tomato-600 hover:bg-tomato-300/15 hover:text-tomato-700 dark:text-tomato-300"
                        >
                          <Ban aria-hidden /> Cancel
                        </Button>
                      </AlertDialogTrigger>
                    ) : null}
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel order {order.orderId}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {modifiable
                            ? `${order.vanId} will stop preparing it. This can't be undone.`
                            : `${CANCEL_WINDOW_CLOSED_MESSAGE}. The ${UPDATE_WINDOW_MINUTES}-minute window closed while this was open.`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>
                          {modifiable ? "Keep my order" : "Close"}
                        </AlertDialogCancel>
                        {modifiable ? (
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              cancel();
                            }}
                            disabled={pending}
                            className="bg-tomato-600 text-white hover:bg-tomato-700"
                          >
                            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                            Cancel order
                          </AlertDialogAction>
                        ) : null}
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {modifiable ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden /> {windowLeft(elapsed)} left to
                      change
                    </span>
                  ) : null}
                </div>
              ) : null}
              {order.status === "outstanding" && !modifiable ? (
                <p className="text-xs text-muted-foreground">{MODIFY_WINDOW_CLOSED_MESSAGE}.</p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-6 border-t bg-muted/40 p-6 sm:grid-cols-2 sm:p-8">
            <OrderTimeline order={order} />
            <div>
              <h3 className="mb-2 text-sm font-semibold">Order details</h3>
              <ul className="space-y-1.5 text-sm">
                {order.items.map((item) => (
                  <li key={item.food} className="flex justify-between gap-3">
                    <span>
                      <span className="tabular font-semibold">{item.quantity}×</span> {item.food}
                    </span>
                    <span className="tabular text-muted-foreground">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between border-t pt-3">
                <span className="text-sm font-semibold">Total</span>
                <span className="tabular font-display text-xl font-semibold">
                  {formatPrice(order.price)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {order.status !== "canceled" ? (
          <section
            className="rounded-3xl border bg-card p-6 shadow-sm"
            aria-label="Rate this order"
          >
            <RatingForm orderId={order.orderId} rating={order.rating} comment={order.comment} />
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        <section
          className="overflow-hidden rounded-3xl border bg-card shadow-sm"
          aria-labelledby="pickup"
        >
          <VanMap
            className="h-56"
            ariaLabel={`Map showing ${order.vanId}`}
            initialCenter={{ lat: order.vanLat, lng: order.vanLng }}
            initialZoom={15}
            points={[
              {
                id: order.vanId,
                lat: order.vanLat,
                lng: order.vanLng,
                label: order.vanId,
                open: true,
                highlight: true,
              },
            ]}
            selectedId={order.vanId}
          />
          <div className="space-y-3 p-5">
            <h2 id="pickup" className="flex items-center gap-2 text-lg font-semibold">
              <Store className="size-5 text-primary" aria-hidden /> {order.vanId}
            </h2>
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {order.vanAddress}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="h-10 rounded-full px-4">
                <a
                  href={`https://www.openstreetmap.org/directions?to=${order.vanLat}%2C${order.vanLng}#map=17/${order.vanLat}/${order.vanLng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation aria-hidden /> Directions
                </a>
              </Button>
              <Button asChild variant="ghost" className="h-10 rounded-full px-4">
                <Link href={`/customer/van/${order.vanSlug}/menu`}>Order again</Link>
              </Button>
            </div>
          </div>
        </section>
        {live ? (
          <p className="px-1 text-xs text-muted-foreground">
            This page refreshes on its own. When the van marks your order{" "}
            {order.status === "fulfilled" ? "collected" : "ready"}, you&apos;ll see it here within a
            few seconds.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
