"use client";

import { ArrowRight, Clock, Loader2, MapPin, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { placeOrderAction } from "@/app/customer/actions";
import { DemoLoginButton } from "@/components/shared/demo-login";
import { EmptyState } from "@/components/shared/empty-state";
import { SnackImage } from "@/components/shared/snack-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cartDisplayTotal, formatPrice } from "@/lib/pricing";
import type { ProductDTO } from "@/lib/types";
import { useCart } from "./cart-provider";
import { QuantityStepper } from "./quantity-stepper";

export function CartView({ menu, signedIn }: { menu: ProductDTO[]; signedIn: boolean }) {
  const router = useRouter();
  const { cart, count, ready, dispatch, clear } = useCart();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const product = new Map(menu.map((m) => [m.product, m]));
  const lines = cart.lines.filter((l) => product.has(l.food));
  const total = cartDisplayTotal(
    lines.map((l) => ({ ...l, price: product.get(l.food)?.price ?? 0 })),
  );

  if (!ready) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title="Your cart is empty"
        action={
          <Button asChild className="h-11 rounded-full px-5">
            <Link href={cart.van ? `/customer/van/${cart.van.slug}/menu` : "/customer"}>
              {cart.van ? `Browse ${cart.van.vanId}'s menu` : "Find a van"}{" "}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      >
        Pick a van on the map, then add a coffee or a cake.
      </EmptyState>
    );
  }

  const place = () => {
    if (!cart.van) {
      toast.error("please choose a van first~");
      router.push("/customer");
      return;
    }
    startTransition(async () => {
      const result = await placeOrderAction({ vanId: cart.van!.vanId, items: lines });
      if (result.status === "ok" && result.orderId) {
        clear();
        setConfirming(false);
        toast.success("Thanks for your order !!", {
          description: `Order ${result.orderId} is with ${cart.van!.vanId}.`,
        });
        router.push(`/customer/orders/${result.orderId}`);
      } else {
        setConfirming(false);
        toast.error(
          result.status === "error" ? result.message : "Something went wrong placing the order",
        );
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section aria-labelledby="cart-items" className="space-y-3">
        <h2 id="cart-items" className="sr-only">
          Items
        </h2>
        <ul className="space-y-3">
          {lines.map((line) => {
            const item = product.get(line.food)!;
            return (
              <li
                key={line.food}
                className="flex items-center gap-4 rounded-3xl border bg-card p-3.5 shadow-sm"
              >
                <SnackImage
                  src={item.photo}
                  alt=""
                  size={72}
                  className="size-16 shrink-0 sm:size-[72px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{line.food}</p>
                  <p className="tabular text-sm text-muted-foreground">
                    {formatPrice(item.price)} each
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <QuantityStepper
                    size="sm"
                    food={line.food}
                    quantity={line.quantity}
                    onIncrement={() => dispatch({ type: "increment", food: line.food })}
                    onDecrement={() => dispatch({ type: "decrement", food: line.food })}
                    onRemove={() => dispatch({ type: "remove", food: line.food })}
                  />
                  <span className="tabular w-20 text-right font-semibold">
                    {formatPrice(item.price * line.quantity)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <Button variant="ghost" className="text-muted-foreground" onClick={() => clear()}>
          Clear cart
        </Button>
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            Pick up from
          </p>
          {cart.van ? (
            <div className="mt-2 flex items-start gap-3">
              <Store className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{cart.van.vanId}</p>
                <p className="flex items-start gap-1 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {cart.van.address}
                </p>
                <Link
                  href="/customer"
                  className="mt-1 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Change van
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-sm">please choose a van first~</p>
              <Button asChild variant="secondary" className="rounded-full">
                <Link href="/customer">Choose a van</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items</dt>
              <dd className="tabular">{count}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="tabular font-display text-2xl font-semibold">{formatPrice(total)}</dd>
            </div>
          </dl>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
            <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Ready within 15 minutes or the order is flagged for the late discount. You can change or
            cancel for 10 minutes after ordering.
          </p>
          {signedIn ? (
            <Button
              className="mt-4 h-12 w-full rounded-xl text-base font-semibold"
              onClick={() => setConfirming(true)}
              disabled={!cart.van || pending}
            >
              Place order · {formatPrice(total)}
            </Button>
          ) : (
            <div className="mt-4 space-y-2">
              <DemoLoginButton
                role="customer"
                next="/customer/cart"
                className="h-12 w-full rounded-xl text-base font-semibold"
              >
                Continue as demo customer
              </DemoLoginButton>
              <Button asChild variant="outline" className="h-11 w-full rounded-xl">
                <Link href="/customer/login?next=/customer/cart">Log in or sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </aside>

      <AlertDialog open={confirming} onOpenChange={(open) => !pending && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Order will be placed, are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {count} item{count === 1 ? "" : "s"} from {cart.van?.vanId} for {formatPrice(total)}.
              The van starts preparing straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                place();
              }}
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Place order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
