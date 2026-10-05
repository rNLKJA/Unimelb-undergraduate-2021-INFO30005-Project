import { describe, expect, it } from "vitest";
import { cartReducer, EMPTY_CART, MAX_QUANTITY, sanitiseCart, type CartState } from "./cart";

const van = { vanId: "Ardeth Lavon", slug: "ardeth-lavon", address: "Grattan Street" };

describe("cart reducer (ports js/cartController.js behaviour)", () => {
  it("adding a snack already in the cart bumps its quantity (repeatAdd)", () => {
    let s = cartReducer(EMPTY_CART, { type: "add", food: "Latte" });
    s = cartReducer(s, { type: "add", food: "Latte" });
    s = cartReducer(s, { type: "add", food: "Small Cake" });
    expect(s.lines).toEqual([
      { food: "Latte", quantity: 2 },
      { food: "Small Cake", quantity: 1 },
    ]);
  });

  it("the minus stepper never goes below 1 (reduceItemCount: quantity >= 2)", () => {
    let s: CartState = { van: null, lines: [{ food: "Latte", quantity: 2 }] };
    s = cartReducer(s, { type: "decrement", food: "Latte" });
    expect(s.lines[0].quantity).toBe(1);
    s = cartReducer(s, { type: "decrement", food: "Latte" });
    expect(s.lines[0].quantity).toBe(1);
  });

  it("invalid or non-positive typed quantities reset to 1 (quantityChanged)", () => {
    const s: CartState = { van: null, lines: [{ food: "Latte", quantity: 4 }] };
    expect(cartReducer(s, { type: "set", food: "Latte", quantity: 0 }).lines[0].quantity).toBe(1);
    expect(
      cartReducer(s, { type: "set", food: "Latte", quantity: Number.NaN }).lines[0].quantity,
    ).toBe(1);
    expect(cartReducer(s, { type: "set", food: "Latte", quantity: 7.8 }).lines[0].quantity).toBe(7);
  });

  it("removes lines, clears items but keeps the chosen van, and caps quantities", () => {
    let s = cartReducer(EMPTY_CART, { type: "selectVan", van });
    s = cartReducer(s, { type: "add", food: "Latte", quantity: 999 });
    expect(s.lines[0].quantity).toBe(MAX_QUANTITY);
    s = cartReducer(s, { type: "increment", food: "Latte" });
    expect(s.lines[0].quantity).toBe(MAX_QUANTITY);
    expect(cartReducer(s, { type: "remove", food: "Latte" }).lines).toEqual([]);
    const cleared = cartReducer(s, { type: "clear" });
    expect(cleared).toEqual({ van, lines: [] });
  });

  it("sanitises whatever was stored in localStorage", () => {
    expect(sanitiseCart(null)).toEqual(EMPTY_CART);
    expect(sanitiseCart("nope")).toEqual(EMPTY_CART);
    expect(
      sanitiseCart({
        van: { vanId: 1 },
        lines: [
          { food: "Latte", quantity: "2" },
          { food: "Bad", quantity: -1 },
          null,
          { quantity: 3 },
        ],
      }),
    ).toEqual({ van: null, lines: [{ food: "Latte", quantity: 2 }] });
    expect(cartReducer(EMPTY_CART, { type: "hydrate", state: { van, lines: [] } }).van).toEqual(
      van,
    );
  });
});
