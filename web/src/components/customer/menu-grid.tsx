"use client";

import { ArrowRight, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { SnackImage } from "@/components/shared/snack-image";
import { Button } from "@/components/ui/button";
import { cartDisplayTotal, formatPrice } from "@/lib/pricing";
import type { ProductDTO, SnackKind, VanDTO } from "@/lib/types";
import { useCart } from "./cart-provider";
import { QuantityStepper } from "./quantity-stepper";

const SECTIONS: { kind: SnackKind; title: string; blurb: string }[] = [
  { kind: "coffee", title: "Coffee", blurb: "Pulled to order, all one price." },
  { kind: "biscuit", title: "Biscuits", blurb: "Baked fresh each morning." },
  { kind: "cake", title: "Cakes", blurb: "For one, or for the office." },
];

export function MenuGrid({ van, menu }: { van: VanDTO; menu: ProductDTO[] }) {
  const { cart, count, dispatch, selectVan } = useCart();
  const priceOf = new Map(menu.map((m) => [m.product, m.price]));
  const total = cartDisplayTotal(
    cart.lines.map((l) => ({ ...l, price: priceOf.get(l.food) ?? 0 })),
  );
  const qtyOf = (food: string) => cart.lines.find((l) => l.food === food)?.quantity ?? 0;

  const ensureVan = () => {
    if (cart.van?.vanId === van.vanId) return;
    selectVan({ vanId: van.vanId, slug: van.slug, address: van.address });
    if (cart.van)
      toast.info(`Now ordering from ${van.vanId}`, { description: "Your cart moved with you." });
  };

  const add = (item: ProductDTO) => {
    ensureVan();
    dispatch({ type: "add", food: item.product });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-10">
        {SECTIONS.map((section) => {
          const items = menu.filter((m) => m.kind === section.kind);
          if (!items.length) return null;
          return (
            <section key={section.kind} aria-labelledby={`menu-${section.kind}`}>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 id={`menu-${section.kind}`} className="text-2xl font-semibold">
                  {section.title}
                </h2>
                <p className="text-sm text-muted-foreground">{section.blurb}</p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => {
                  const qty = qtyOf(item.product);
                  return (
                    <li
                      key={item.product}
                      className="group flex gap-4 rounded-3xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <SnackImage
                        src={item.photo}
                        alt={item.product}
                        size={104}
                        className="size-24 shrink-0 transition-transform duration-300 group-hover:-rotate-3 sm:size-[104px]"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="text-lg leading-tight font-semibold">{item.product}</h3>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                          <span className="tabular font-display text-lg font-semibold">
                            {formatPrice(item.price)}
                          </span>
                          {qty > 0 ? (
                            <QuantityStepper
                              size="sm"
                              food={item.product}
                              quantity={qty}
                              onIncrement={() =>
                                dispatch({ type: "increment", food: item.product })
                              }
                              onDecrement={() =>
                                dispatch({ type: "decrement", food: item.product })
                              }
                              onRemove={() => dispatch({ type: "remove", food: item.product })}
                            />
                          ) : (
                            <Button
                              type="button"
                              onClick={() => add(item)}
                              disabled={!van.open}
                              className="h-9 rounded-full px-4"
                              aria-label={`Add ${item.product} to cart`}
                            >
                              <Plus aria-hidden /> Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Desktop cart summary */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-3xl border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShoppingBag className="size-5 text-primary" aria-hidden /> Your order
          </h2>
          {cart.lines.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing yet. Add a coffee to get started.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {cart.lines.map((line) => (
                <li key={line.food} className="flex justify-between gap-2">
                  <span>
                    <span className="tabular font-semibold">{line.quantity}×</span> {line.food}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {formatPrice((priceOf.get(line.food) ?? 0) * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="tabular font-display text-xl font-semibold">{formatPrice(total)}</span>
          </div>
          {count ? (
            <Button asChild className="mt-4 h-11 w-full rounded-xl text-base font-semibold">
              <Link href="/customer/cart">
                Review &amp; pay <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button className="mt-4 h-11 w-full rounded-xl text-base font-semibold" disabled>
              Review &amp; pay <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile cart bar */}
      <AnimatePresence>
        {count > 0 ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-3 bottom-[4.6rem] z-30 lg:hidden"
          >
            <Link
              href="/customer/cart"
              className="flex items-center justify-between rounded-2xl bg-espresso-900 px-4 py-3.5 text-crema-100 shadow-xl dark:bg-crema-200 dark:text-espresso-900"
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className="tabular grid size-7 place-items-center rounded-full bg-tomato-600 text-sm text-white">
                  {count}
                </span>
                View cart
              </span>
              <span className="tabular font-display text-lg font-semibold">
                {formatPrice(total)}
              </span>
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
