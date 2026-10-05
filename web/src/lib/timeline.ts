import type { OrderStatus } from "./order-rules";

/**
 * The customer-facing status timeline. The 2021 views printed the raw status
 * ("Status: outstanding"); the revival shows the same state machine
 * (outstanding -> fulfilled -> collected, or canceled) as steps.
 */
export type TimelineKey = "placed" | "preparing" | "ready" | "collected" | "canceled";
export type TimelineState = "done" | "current" | "upcoming";
export type TimelineStep = {
  key: TimelineKey;
  label: string;
  at: number | null;
  state: TimelineState;
};

export type TimelineOrder = {
  status: OrderStatus;
  startTime: number;
  fulfilledTime: number | null;
  collectionTime: number | null;
};

export function orderTimeline(order: TimelineOrder): TimelineStep[] {
  const placed: TimelineStep = {
    key: "placed",
    label: "Order placed",
    at: order.startTime,
    state: "done",
  };

  if (order.status === "canceled") {
    return [placed, { key: "canceled", label: "Cancelled", at: null, state: "done" }];
  }

  const rank: Record<Exclude<OrderStatus, "canceled">, number> = {
    outstanding: 1,
    fulfilled: 2,
    collected: 3,
  };
  const r = rank[order.status];
  const stateFor = (i: number): TimelineState =>
    i < r ? "done" : i === r ? "current" : "upcoming";

  return [
    placed,
    { key: "preparing", label: "Preparing", at: order.startTime, state: stateFor(1) },
    { key: "ready", label: "Ready for pickup", at: order.fulfilledTime, state: stateFor(2) },
    {
      key: "collected",
      label: "Collected",
      at: order.collectionTime,
      state: order.status === "collected" ? "done" : "upcoming",
    },
  ];
}
