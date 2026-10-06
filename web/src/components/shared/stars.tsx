import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  className,
  size = "size-4",
}: {
  value: number;
  className?: string;
  size?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            size,
            n <= Math.round(value)
              ? "fill-honey-400 text-honey-500"
              : "fill-transparent text-espresso-200 dark:text-espresso-600",
          )}
        />
      ))}
    </span>
  );
}
