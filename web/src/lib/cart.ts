/**
 * Cart state for the customer app — a pure reducer so it can be unit-tested.
 *
 * Behaviour follows the 2021 browser cart (`coursework/js/cartController.js`):
 *  - adding a snack that is already in the cart bumps its quantity (`repeatAdd`)
 *  - the minus stepper never goes below 1 (`reduceItemCount`: `quantity >= 2`);
 *    removing a line is a separate action (the red "X")
 *  - typing an invalid / non-positive quantity resets it to 1 (`quantityChanged`)
 *  - the cart remembers which van it is for (`sessionStorage.selected_van`);
 *    ordering without a van sends the customer back to the map.
 * The revival persists it in localStorage instead of sessionStorage.
 */
import type { CartLine } from "./pricing";

export type CartVan = { vanId: string; slug: string; address: string };

export type CartState = { van: CartVan | null; lines: CartLine[] };

export const EMPTY_CART: CartState = { van: null, lines: [] };

export const MAX_QUANTITY = 50;

export type CartAction =
  | { type: "add"; food: string; quantity?: number }
  | { type: "increment"; food: string }
  | { type: "decrement"; food: string }
  | { type: "set"; food: string; quantity: number }
  | { type: "remove"; food: string }
  | { type: "selectVan"; van: CartVan }
  | { type: "clear" }
  | { type: "hydrate"; state: CartState };

const clamp = (n: number) => Math.min(MAX_QUANTITY, Math.max(1, n));

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const qty = Math.max(1, Math.floor(action.quantity ?? 1));
      const existing = state.lines.find((l) => l.food === action.food);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.food === action.food ? { ...l, quantity: clamp(l.quantity + qty) } : l,
          ),
        };
      }
      return { ...state, lines: [...state.lines, { food: action.food, quantity: clamp(qty) }] };
    }
    case "increment":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.food === action.food ? { ...l, quantity: clamp(l.quantity + 1) } : l,
        ),
      };
    case "decrement":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.food === action.food && l.quantity >= 2 ? { ...l, quantity: l.quantity - 1 } : l,
        ),
      };
    case "set": {
      const n = Number(action.quantity);
      const quantity = Number.isFinite(n) && n > 0 ? clamp(Math.floor(n)) : 1;
      return {
        ...state,
        lines: state.lines.map((l) => (l.food === action.food ? { ...l, quantity } : l)),
      };
    }
    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.food !== action.food) };
    case "selectVan":
      return { ...state, van: action.van };
    case "clear":
      return { ...state, lines: [] };
    case "hydrate":
      return sanitiseCart(action.state);
  }
}

/** Defensive parse of whatever was in localStorage. */
export function sanitiseCart(value: unknown): CartState {
  if (!value || typeof value !== "object") return EMPTY_CART;
  const raw = value as Partial<CartState>;
  const van =
    raw.van &&
    typeof raw.van.vanId === "string" &&
    typeof raw.van.slug === "string" &&
    typeof raw.van.address === "string"
      ? { vanId: raw.van.vanId, slug: raw.van.slug, address: raw.van.address }
      : null;
  const lines = Array.isArray(raw.lines)
    ? raw.lines
        .filter((l): l is CartLine => !!l && typeof l.food === "string" && Number(l.quantity) > 0)
        .map((l) => ({ food: l.food, quantity: clamp(Math.floor(Number(l.quantity))) }))
    : [];
  return { van, lines };
}
