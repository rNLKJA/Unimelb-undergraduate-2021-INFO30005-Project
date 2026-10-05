"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The cart stepper. Like the original `reduceItemCount`, minus never goes
 * below 1; at 1 it becomes a remove button.
 */
export function QuantityStepper({
  food,
  quantity,
  onIncrement,
  onDecrement,
  onRemove,
  className,
  size = "md",
}: {
  food: string;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const btn = size === "sm" ? "size-8" : "size-9";
  const atMin = quantity <= 1;
  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-full bg-secondary p-1", className)}
      role="group"
      aria-label={`Quantity of ${food}`}
    >
      <button
        type="button"
        onClick={atMin && onRemove ? onRemove : onDecrement}
        disabled={atMin && !onRemove}
        className={cn(
          btn,
          "grid place-items-center rounded-full bg-card text-foreground shadow-sm transition hover:bg-accent disabled:opacity-40",
        )}
        aria-label={atMin && onRemove ? `Remove ${food}` : `One less ${food}`}
      >
        {atMin && onRemove ? (
          <Trash2 className="size-4" aria-hidden />
        ) : (
          <Minus className="size-4" aria-hidden />
        )}
      </button>
      <span className="tabular min-w-7 text-center font-semibold" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        className={cn(
          btn,
          "grid place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-tomato-600",
        )}
        aria-label={`One more ${food}`}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
