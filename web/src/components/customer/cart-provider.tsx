"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { cartReducer, EMPTY_CART, type CartAction, type CartState, type CartVan } from "@/lib/cart";
import { itemCount } from "@/lib/pricing";

const STORAGE_KEY = "siav-cart-v1";

type CartContextValue = {
  cart: CartState;
  count: number;
  ready: boolean;
  dispatch: (action: CartAction) => void;
  add: (food: string) => void;
  selectVan: (van: CartVan) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * The customer's cart and chosen van, persisted in localStorage — the
 * revival of the original `sessionStorage.cart` / `selected_van` pair.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [ready, markReady] = useReducer(() => true, false);

  // Load the saved cart once on the client (the server always renders an empty cart).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: JSON.parse(raw) });
    } catch {
      // ignore corrupt storage
    }
    markReady();
  }, []);

  // Persist only after the saved cart has been loaded, so it is never overwritten by the empty default.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // storage full or disabled: the cart still works for this page view
    }
  }, [cart, ready]);

  const add = useCallback((food: string) => dispatch({ type: "add", food }), []);
  const selectVan = useCallback((van: CartVan) => dispatch({ type: "selectVan", van }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo(
    () => ({ cart, count: itemCount(cart.lines), ready, dispatch, add, selectVan, clear }),
    [cart, ready, add, selectVan, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
