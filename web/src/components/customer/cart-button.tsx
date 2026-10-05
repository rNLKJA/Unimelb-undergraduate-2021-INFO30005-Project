"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "./cart-provider";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/customer/cart"
      className="relative inline-flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
      aria-label={ready && count ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
    >
      <ShoppingBag className="size-[1.15rem]" aria-hidden />
      <AnimatePresence>
        {ready && count > 0 ? (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            className="tabular absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.68rem] font-bold text-primary-foreground"
          >
            {count}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </Link>
  );
}
