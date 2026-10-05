"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { formatTime } from "@/lib/format";
import { orderTimeline, type TimelineOrder } from "@/lib/timeline";
import { cn } from "@/lib/utils";

export function OrderTimeline({ order }: { order: TimelineOrder }) {
  const steps = orderTimeline(order);
  return (
    <ol className="relative space-y-0" aria-label="Order progress">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? (
              <span
                className={cn(
                  "absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-0.5 rounded-full",
                  step.state === "done" ? "bg-matcha-400" : "bg-border",
                )}
                aria-hidden
              />
            ) : null}
            <motion.span
              layout
              className={cn(
                "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                step.state === "done" &&
                  step.key !== "canceled" &&
                  "border-matcha-500 bg-matcha-500 text-white",
                step.key === "canceled" && "border-tomato-500 bg-tomato-500 text-white",
                step.state === "current" &&
                  "border-honey-400 bg-card text-espresso-800 dark:text-honey-300",
                step.state === "upcoming" && "border-border bg-card text-muted-foreground",
              )}
              aria-hidden
            >
              {step.state === "done" ? <Check className="size-4" /> : i + 1}
              {step.state === "current" ? (
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-honey-400/40" />
              ) : null}
            </motion.span>
            <div className="pt-0.5">
              <p
                className={cn(
                  "text-sm font-semibold",
                  step.state === "upcoming" && "text-muted-foreground",
                )}
              >
                {step.label}
                <span className="sr-only">
                  {step.state === "done"
                    ? " (done)"
                    : step.state === "current"
                      ? " (in progress)"
                      : " (not yet)"}
                </span>
              </p>
              {step.at && step.state !== "upcoming" ? (
                <p className="tabular text-xs text-muted-foreground">{formatTime(step.at)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
