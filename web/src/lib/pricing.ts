export type MenuPrice = { product: string; price: number };
export type CartLine = { food: string; quantity: number };

/**
 * Port of the server-side total in `customerController.addToCart`:
 * every cart line takes the menu price of the matching product, the total is
 * `Σ parseInt(quantity) × parseFloat(price)` and the stored value is
 * `price.toFixed(2)` (coerced back to a number by Mongoose).
 * Unknown products contribute nothing (their price is undefined -> NaN is
 * avoided here by skipping them; the revived app validates items first).
 */
export function orderTotal(lines: readonly CartLine[], menu: readonly MenuPrice[]): number {
  const priceOf = new Map(menu.map((m) => [m.product, m.price]));
  let price = 0;
  for (const line of lines) {
    const unit = priceOf.get(line.food);
    if (unit === undefined) continue;
    price += parseInt(String(line.quantity), 10) * parseFloat(String(unit));
  }
  return Number(price.toFixed(2));
}

/**
 * Port of the browser-side `updateCartTotal()` rounding:
 * `Math.round(total * 100) / 100`.
 */
export function cartDisplayTotal(lines: readonly (CartLine & { price: number })[]): number {
  let total = 0;
  for (const line of lines) total += line.price * line.quantity;
  return Math.round(total * 100) / 100;
}

export function itemCount(lines: readonly CartLine[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

export function formatPrice(amount: number): string {
  return AUD.format(amount);
}

/**
 * Normalise a cart: drop zero/negative quantities and merge duplicate foods —
 * mirrors `repeatAdd()` (adding an item already in the cart bumps its count)
 * and the `quantity >= 1` guard of the cart steppers.
 */
export function normaliseCart(lines: readonly CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    const qty = Math.floor(Number(line.quantity));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    merged.set(line.food, (merged.get(line.food) ?? 0) + qty);
  }
  return [...merged].map(([food, quantity]) => ({ food, quantity }));
}
