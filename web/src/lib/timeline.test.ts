import { describe, expect, it } from "vitest";
import { orderTimeline } from "./timeline";

const base = { startTime: 1000, fulfilledTime: null, collectionTime: null };

describe("order timeline follows the original state machine", () => {
  it("outstanding: placed done, preparing current", () => {
    expect(orderTimeline({ ...base, status: "outstanding" }).map((s) => [s.key, s.state])).toEqual([
      ["placed", "done"],
      ["preparing", "current"],
      ["ready", "upcoming"],
      ["collected", "upcoming"],
    ]);
  });

  it("fulfilled and collected", () => {
    expect(orderTimeline({ ...base, status: "fulfilled", fulfilledTime: 2000 })[2]).toMatchObject({
      state: "current",
      at: 2000,
    });
    expect(
      orderTimeline({
        ...base,
        status: "collected",
        fulfilledTime: 2000,
        collectionTime: 3000,
      }).every((s) => s.state === "done"),
    ).toBe(true);
  });

  it("canceled orders stop after the placed step", () => {
    expect(orderTimeline({ ...base, status: "canceled" }).map((s) => s.key)).toEqual([
      "placed",
      "canceled",
    ]);
  });
});
