import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  extractBlock,
  extractFunction,
  loadLegacyUtility,
  readCoursework,
  type LegacyUtility,
} from "@/test/legacy";
import {
  canCustomerModify,
  customerTimer,
  discountApplies,
  prepTone,
  vendorTimer,
  vendorTransition,
  withinUpdateWindow,
} from "./order-rules";

const MIN = 60_000;
const SEC = 1_000;
const T0 = Date.parse("2021-05-30T02:10:00Z");

let original: LegacyUtility;
beforeAll(() => {
  original = loadLegacyUtility();
});
afterEach(() => {
  vi.useRealTimers();
});

type CustomerHarness = {
  timeAllow: () => boolean;
  countdown: (start: number, timer: { innerHTML: string }) => void;
};

/**
 * Load timeConvert/timeAllow/countdown verbatim from OneofCustomerOrder.hbs,
 * substituting the Handlebars values the controller passed in
 * (updateMin = 10, overdueMin = 15, thisOrder = the order JSON).
 */
function loadCustomerView(order: { order_date: string; start_time: string }): CustomerHarness {
  const hbs = readCoursework("views/OneofCustomerOrder.hbs");
  const source = ["timeConvert", "timeAllow", "countdown"]
    .map((name) => extractFunction(hbs, name))
    .join("\n")
    .replaceAll("{{{json thisOrder}}}", "__order")
    .replaceAll("{{{updateMin}}}", "10")
    .replaceAll("{{{overdueMin}}}", "15");
  return new Function("__order", `${source}\nreturn { timeAllow, countdown };`)(order);
}

/** The browser rebuilt the order time from the D-M-YYYY / H:M:S strings in local time. */
function browserOrderStrings(t: number) {
  const d = new Date(t);
  return {
    order_date: `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`,
    start_time: `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`,
  };
}

const ELAPSED = [
  -5 * SEC,
  0,
  30 * SEC,
  5 * MIN,
  10 * MIN,
  10 * MIN + 59 * SEC,
  11 * MIN,
  14 * MIN + 59 * SEC,
  15 * MIN,
  15 * MIN + 59 * SEC,
  16 * MIN,
  59 * MIN,
  61 * MIN,
  25 * 60 * MIN,
];

describe("customer order view parity (OneofCustomerOrder.hbs)", () => {
  it.each(ELAPSED)("timeAllow() after %i ms", (elapsed) => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + elapsed);
    const view = loadCustomerView(browserOrderStrings(T0));
    expect(withinUpdateWindow(elapsed)).toBe(view.timeAllow());
  });

  it.each(ELAPSED.filter((e) => e >= 0))("countdown() label after %i ms", (elapsed) => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + elapsed);
    const view = loadCustomerView(browserOrderStrings(T0));
    const timer = { innerHTML: "" };
    view.countdown(T0, timer);
    vi.advanceTimersByTime(1000);
    expect(customerTimer(elapsed + 1000).label).toBe(timer.innerHTML);
  });

  it("the change/cancel window is 'under 11 minutes' and only for outstanding orders", () => {
    expect(canCustomerModify("outstanding", 10 * MIN + 59 * SEC)).toBe(true);
    expect(canCustomerModify("outstanding", 11 * MIN)).toBe(false);
    expect(canCustomerModify("fulfilled", 1 * MIN)).toBe(false);
  });
});

type Block = { innerHTML: string };

/** Run the vendor dashboard's onload timer verbatim from vendor-outstanding-orders.hbs. */
function runVendorView(orders: Record<string, unknown>[]): Block[] {
  const hbs = readCoursework("views/vendor-outstanding-orders.hbs");
  const start = hbs.indexOf("onload = function()");
  const block = extractBlock(hbs, start)
    .replace("onload = function()", "var __onload = function()")
    .replace("{{{orders}}}", "__orders");
  const blocks: Block[] = orders.map(() => ({ innerHTML: "Check Order Status" }));
  const document = { getElementById: (id: number) => blocks[id] };
  const location = { reload: () => undefined };
  new Function("document", "location", "__orders", `${block}\n__onload();`)(
    document,
    location,
    orders,
  );
  vi.advanceTimersByTime(1000);
  return blocks;
}

describe("vendor outstanding-orders timer parity", () => {
  const cases: [number, boolean][] = [
    [0, false],
    [30 * SEC, false],
    [7 * MIN, false],
    [14 * MIN, false],
    [14 * MIN + 29 * SEC, false],
    [14 * MIN + 31 * SEC, false],
    [15 * MIN, false],
    [20 * MIN, false],
    [3 * MIN, true],
  ];

  it.each(cases)("label after %i ms (discount_applied=%s)", (elapsed, discountApplied) => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const order = {
      order_id: "ARD4391846",
      status: "outstanding",
      order_date: original.currentDate(),
      start_time: original.currentTime(),
      discount_time: original.discountTime(),
      discount_applied: discountApplied,
    };
    // The timer fires one second after onload.
    vi.setSystemTime(T0 + elapsed - 1000);
    const [legacy] = runVendorView([order]);
    const port = vendorTimer({
      status: "outstanding",
      discountTime: T0 + 15 * MIN,
      discountApplied,
      now: T0 + elapsed,
    });
    expect(port.label).toBe(legacy.innerHTML);
  });

  it("leaves non-outstanding orders alone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const order = {
      status: "fulfilled",
      order_date: original.currentDate(),
      start_time: original.currentTime(),
      discount_time: original.discountTime(),
      discount_applied: false,
    };
    const [legacy] = runVendorView([order]);
    expect(
      vendorTimer({
        status: "fulfilled",
        discountTime: T0 + 15 * MIN,
        discountApplied: false,
        now: T0,
      }).label,
    ).toBe(legacy.innerHTML);
  });
});

describe("vendor state machine (stateOrderAsFulfilled / markOrderAsCollected)", () => {
  it("allows outstanding -> fulfilled -> collected only", () => {
    expect(vendorTransition("outstanding", "fulfilled")).toEqual({ ok: true, status: "fulfilled" });
    expect(vendorTransition("fulfilled", "collected")).toEqual({ ok: true, status: "collected" });
    expect(vendorTransition("outstanding", "collected")).toMatchObject({
      ok: false,
      message: "Not valid to fulfilled order",
    });
    expect(vendorTransition("collected", "fulfilled")).toMatchObject({ ok: false });
    expect(vendorTransition("canceled", "fulfilled")).toMatchObject({ ok: false });
    expect(vendorTransition(null, "fulfilled")).toMatchObject({ message: "Order not found" });
  });
});

describe("discount + timer tone (Mockup 1 vendor design)", () => {
  const base = { discountTime: T0 + 15 * MIN, discountApplied: false };
  it("outstanding orders are discounted once the deadline passes", () => {
    expect(
      discountApplies({ ...base, status: "outstanding", fulfilledTime: null, now: T0 + 14 * MIN }),
    ).toBe(false);
    expect(
      discountApplies({ ...base, status: "outstanding", fulfilledTime: null, now: T0 + 16 * MIN }),
    ).toBe(true);
  });
  it("fulfilled-late orders keep their discount, cancelled ones never get one", () => {
    expect(
      discountApplies({
        ...base,
        status: "collected",
        fulfilledTime: T0 + 17 * MIN,
        now: T0 + 60 * MIN,
      }),
    ).toBe(true);
    expect(
      discountApplies({
        ...base,
        status: "collected",
        fulfilledTime: T0 + 9 * MIN,
        now: T0 + 60 * MIN,
      }),
    ).toBe(false);
    expect(
      discountApplies({ ...base, status: "canceled", fulfilledTime: null, now: T0 + 60 * MIN }),
    ).toBe(false);
  });
  it("blue while preparing, green if ready inside 15 minutes, red if late", () => {
    expect(
      prepTone({
        status: "outstanding",
        discountTime: T0 + 15 * MIN,
        fulfilledTime: null,
        now: T0 + MIN,
      }),
    ).toBe("preparing");
    expect(
      prepTone({
        status: "outstanding",
        discountTime: T0 + 15 * MIN,
        fulfilledTime: null,
        now: T0 + 16 * MIN,
      }),
    ).toBe("late");
    expect(
      prepTone({
        status: "fulfilled",
        discountTime: T0 + 15 * MIN,
        fulfilledTime: T0 + 8 * MIN,
        now: T0 + 16 * MIN,
      }),
    ).toBe("on-time");
    expect(
      prepTone({
        status: "fulfilled",
        discountTime: T0 + 15 * MIN,
        fulfilledTime: T0 + 18 * MIN,
        now: T0 + 20 * MIN,
      }),
    ).toBe("late");
  });
});
