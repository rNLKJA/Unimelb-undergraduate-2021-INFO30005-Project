"use client";

import { Loader2, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateOrderAction } from "@/app/customer/actions";
import { SnackImage } from "@/components/shared/snack-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatPrice, orderTotal } from "@/lib/pricing";
import type { OrderDTO, ProductDTO } from "@/lib/types";
import { QuantityStepper } from "./quantity-stepper";

/**
 * Port of the "Update Order" cart on the order page: every snack is listed,
 * quantities may drop to zero (those lines are dropped), and saving restarts
 * the order clock exactly like the original `updateOrder`.
 */
export function ChangeOrderDialog({
  order,
  menu,
  onSaved,
}: {
  order: OrderDTO;
  menu: ProductDTO[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initial = () =>
    Object.fromEntries(
      menu.map((m) => [m.product, order.items.find((i) => i.food === m.product)?.quantity ?? 0]),
    );
  const [qty, setQty] = useState<Record<string, number>>(initial);
  const lines = Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([food, quantity]) => ({ food, quantity }));
  const total = orderTotal(lines, menu);

  const save = () =>
    startTransition(async () => {
      const result = await updateOrderAction({ orderId: order.orderId, items: lines });
      if (result.status === "ok") {
        toast.success(result.message ?? "Order updated");
        setOpen(false);
        onSaved();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setQty(initial());
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-10 rounded-full px-4">
          <Pencil aria-hidden /> Change order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change order {order.orderId}</DialogTitle>
          <DialogDescription>
            Saving restarts the 15-minute clock, just like placing a new order.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {menu.map((item) => (
            <li key={item.product} className="flex items-center gap-3 py-2.5">
              <SnackImage src={item.photo} alt="" size={44} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.product}</p>
                <p className="tabular text-xs text-muted-foreground">{formatPrice(item.price)}</p>
              </div>
              <QuantityStepper
                size="sm"
                food={item.product}
                quantity={qty[item.product] ?? 0}
                onIncrement={() =>
                  setQty((q) => ({
                    ...q,
                    [item.product]: Math.min(50, (q[item.product] ?? 0) + 1),
                  }))
                }
                onDecrement={() =>
                  setQty((q) => ({ ...q, [item.product]: Math.max(0, (q[item.product] ?? 0) - 1) }))
                }
                onRemove={
                  (qty[item.product] ?? 0) > 0
                    ? () => setQty((q) => ({ ...q, [item.product]: 0 }))
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
        <DialogFooter className="items-center gap-3 sm:justify-between">
          <p className="text-sm">
            New total{" "}
            <span className="tabular font-display text-lg font-semibold">{formatPrice(total)}</span>
          </p>
          <Button
            onClick={save}
            disabled={pending || lines.length === 0}
            className="h-10 rounded-full px-5"
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {lines.length === 0 ? "Add at least one item" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
