import { CheckCircle2, ChefHat, PackageCheck, XCircle } from "lucide-react";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-rules";
import { cn } from "@/lib/utils";

const STYLE: Record<OrderStatus, string> = {
  outstanding:
    "bg-honey-300/40 text-espresso-800 ring-honey-400/60 dark:bg-honey-400/15 dark:text-honey-300",
  fulfilled:
    "bg-matcha-300/35 text-matcha-600 ring-matcha-400/60 dark:bg-matcha-400/15 dark:text-matcha-300",
  collected:
    "bg-espresso-100 text-espresso-700 ring-espresso-200 dark:bg-espresso-700/40 dark:text-espresso-100 dark:ring-espresso-600",
  canceled:
    "bg-tomato-300/20 text-tomato-700 ring-tomato-300/60 dark:bg-tomato-500/15 dark:text-tomato-300",
};

const ICON = {
  outstanding: ChefHat,
  fulfilled: PackageCheck,
  collected: CheckCircle2,
  canceled: XCircle,
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const Icon = ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        STYLE[status],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
