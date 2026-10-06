import { describe, expect, it } from "vitest";
import { MENU } from "./menu";
import { cartDisplayTotal, formatPrice, itemCount, normaliseCart, orderTotal } from "./pricing";

describe("menu recovered from Mockup 2/Customer Task 1 output.html", () => {
  it("has the original eight items and prices in order", () => {
    expect(MENU.map((m) => [m.product, m.price])).toEqual([
      ["Cappuccino", 4.99],
      ["Latte", 4.99],
      ["Flat White", 4.99],
      ["Long Black", 4.99],
      ["Plain Biscuit", 10.99],
      ["Fancy Biscuit", 12.99],
      ["Small Cake", 12.99],
      ["Large Cake", 18.99],
    ]);
  });
});

describe("orderTotal ports the addToCart price calculation", () => {
  it("prices the Postman collection's first cart (3 flat white, 2 small cake, 2 plain, 5 fancy)", () => {
    const cart = [
      { food: "Flat White", quantity: 3 },
      { food: "Small Cake", quantity: 2 },
      { food: "Plain Biscuit", quantity: 2 },
      { food: "Fancy Biscuit", quantity: 5 },
    ];
    expect(orderTotal(cart, MENU)).toBe(127.88);
  });

  it("prices the second Postman cart (adds 20 lattes, one fewer plain biscuit)", () => {
    const cart = [
      { food: "Flat White", quantity: 3 },
      { food: "Small Cake", quantity: 2 },
      { food: "Plain Biscuit", quantity: 1 },
      { food: "Fancy Biscuit", quantity: 5 },
      { food: "Latte", quantity: 20 },
    ];
    expect(orderTotal(cart, MENU)).toBe(216.69);
  });

  it("rounds like toFixed(2) and ignores unknown foods", () => {
    expect(orderTotal([{ food: "Latte", quantity: 3 }], MENU)).toBe(14.97);
    expect(orderTotal([{ food: "Pie", quantity: 3 }], MENU)).toBe(0);
  });

  it("cartDisplayTotal matches the browser's Math.round(total*100)/100", () => {
    const lines = [
      { food: "Latte", quantity: 3, price: 4.99 },
      { food: "Large Cake", quantity: 1, price: 18.99 },
    ];
    expect(cartDisplayTotal(lines)).toBe(Math.round((3 * 4.99 + 18.99) * 100) / 100);
    expect(itemCount(lines)).toBe(4);
  });

  it("normalises carts like repeatAdd() and the quantity guards", () => {
    expect(
      normaliseCart([
        { food: "Latte", quantity: 1 },
        { food: "Latte", quantity: 2 },
        { food: "Long Black", quantity: 0 },
      ]),
    ).toEqual([{ food: "Latte", quantity: 3 }]);
  });

  it("formats AUD", () => {
    expect(formatPrice(127.88)).toBe("$127.88");
    expect(formatPrice(10)).toBe("$10.00");
  });
});
