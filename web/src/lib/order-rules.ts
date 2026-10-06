/**
 * Order business rules ported from the 2021 controllers and views.
 *
 * Sources:
 *  - `vendorController.stateOrderAsFulfilled` / `markOrderAsCollected`
 *    (state machine and the messages they returned)
 *  - `customerController.cancelOrder` / `updateOrder` + `OneofCustomerOrder.hbs`
 *    (`timeAllow()` — the 10 minute change/cancel window, and `countdown()` —
 *    the customer's 15 minute discount timer)
 *  - `vendor-outstanding-orders.hbs` (the vendor's "N Minutes Remaining" timer)
 */

export const ORDER_STATUSES = ["outstanding", "fulfilled", "collected", "canceled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** `updateMin` passed to the order detail view. */
export const UPDATE_WINDOW_MINUTES = 10;
/** `overdueMin` passed to the order views; also the gap to `discount_time`. */
export const OVERDUE_MINUTES = 15;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  outstanding: "Preparing",
  fulfilled: "Ready for pickup",
  collected: "Collected",
  canceled: "Cancelled",
};

/** The customer "Processing" tab: `$or: [{status: outstanding}, {status: fulfilled}]`. */
export const PROCESSING_STATUSES: readonly OrderStatus[] = ["outstanding", "fulfilled"];
/** The customer "Completed" tab: `{status: "collected"}`. */
export const COMPLETED_STATUSES: readonly OrderStatus[] = ["collected"];

export type TransitionResult =
  | { ok: true; status: OrderStatus }
  | { ok: false; reason: "not-found" | "invalid-transition"; message: string };

/**
 * Vendor transitions. Only outstanding -> fulfilled and fulfilled -> collected
 * are valid; anything else returned the original message
 * "Not valid to fulfilled order" (sic) for both endpoints.
 */
export function vendorTransition(
  current: OrderStatus | null | undefined,
  target: "fulfilled" | "collected",
): TransitionResult {
  if (!current) return { ok: false, reason: "not-found", message: "Order not found" };
  const allowed =
    (target === "fulfilled" && current === "outstanding") ||
    (target === "collected" && current === "fulfilled");
  if (!allowed) {
    return { ok: false, reason: "invalid-transition", message: "Not valid to fulfilled order" };
  }
  return { ok: true, status: target };
}

/** Success messages the original endpoints sent back. */
export const VENDOR_SUCCESS_MESSAGE = {
  fulfilled: "Order Ready for Pick Up",
  collected: "Order Collected",
} as const;

/** Break an elapsed duration down exactly like the original `countdown()` did. */
export function elapsedParts(distanceMs: number) {
  return {
    days: Math.floor(distanceMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distanceMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distanceMs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distanceMs % (1000 * 60)) / 1000),
  };
}

/**
 * Port of `timeAllow()`: an order may be changed or cancelled while the
 * elapsed time's minute component is at most 10 and no hour/day has passed —
 * i.e. strictly less than 11 minutes after it was placed.
 */
export function withinUpdateWindow(elapsedMs: number): boolean {
  const { days, hours, minutes } = elapsedParts(elapsedMs);
  return !(minutes > UPDATE_WINDOW_MINUTES || hours !== 0 || days !== 0);
}

/** The customer can change or cancel only outstanding orders inside the window. */
export function canCustomerModify(status: OrderStatus, elapsedMs: number): boolean {
  return status === "outstanding" && withinUpdateWindow(elapsedMs);
}

export const MODIFY_WINDOW_CLOSED_MESSAGE = "10mins past, not able to change your Order";
export const CANCEL_WINDOW_CLOSED_MESSAGE = "10mins past, not able to cancel this order";

/**
 * Port of the customer `countdown()` label: "Ordered time: h:m:s" until the
 * minute component exceeds 15 (or an hour/day passes), then the discount
 * message. Returns the parts so the UI can render them nicely.
 */
export function customerTimer(elapsedMs: number) {
  const parts = elapsedParts(elapsedMs);
  const over = parts.minutes > OVERDUE_MINUTES || parts.hours !== 0 || parts.days !== 0;
  const label = over
    ? "Over Time, your discount apply"
    : `Ordered time: ${parts.hours}:${parts.minutes}:${parts.seconds}`;
  return { ...parts, over, label };
}

/**
 * Port of the vendor dashboard timer: minutes remaining until `discount_time`,
 * `Math.round`ed, zero once the deadline has passed. Outstanding orders read
 * "N Minutes Remaining" or "This Order is Overdue" (also when the discount
 * flag is already set). Other statuses keep the placeholder text.
 */
export function vendorTimer(input: {
  status: OrderStatus;
  discountTime: number;
  discountApplied: boolean;
  now: number;
}) {
  const remainingSeconds = (input.discountTime - input.now) / 1000;
  const minutesRemaining = remainingSeconds >= 0 ? Math.round(remainingSeconds / 60) : 0;
  let label = "Check Order Status";
  if (input.status === "outstanding") {
    if (minutesRemaining <= 0 || input.discountApplied) label = "This Order is Overdue";
    else label = `${minutesRemaining} Minutes Remaining`;
  }
  return { minutesRemaining, overdue: label === "This Order is Overdue", label };
}

/**
 * Timer colour from the vendor mock-up (Mockup 1): blue while preparing inside
 * the window, green if prepared within 15 minutes, red if it ran over.
 */
export type TimerTone = "preparing" | "on-time" | "late";

export function prepTone(input: {
  status: OrderStatus;
  discountTime: number;
  fulfilledTime: number | null;
  now: number;
}): TimerTone {
  if (input.status === "outstanding") {
    return input.now > input.discountTime ? "late" : "preparing";
  }
  if (input.fulfilledTime == null) return "on-time";
  return input.fulfilledTime > input.discountTime ? "late" : "on-time";
}

/**
 * Whether the late-order discount applies. The original stored a
 * `discount_applied` flag (set through `markOrderAsDiscounted`); the revived app
 * sets it automatically when an order is fulfilled after `discount_time`, and
 * treats still-outstanding orders past the deadline as discounted too.
 */
export function discountApplies(input: {
  status: OrderStatus;
  discountApplied: boolean;
  discountTime: number;
  fulfilledTime: number | null;
  now: number;
}): boolean {
  if (input.discountApplied) return true;
  if (input.status === "canceled") return false;
  if (input.status === "outstanding") return input.now > input.discountTime;
  return input.fulfilledTime != null && input.fulfilledTime > input.discountTime;
}

/** Ratings in the original were a <select> of 1..5 plus an optional comment. */
export const RATING_VALUES = [1, 2, 3, 4, 5] as const;

export function canRate(order: { rating: number | null }): boolean {
  return order.rating == null;
}
