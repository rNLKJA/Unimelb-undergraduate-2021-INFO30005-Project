"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { customerTimer, OVERDUE_MINUTES, type OrderStatus } from "@/lib/order-rules";
import { cn } from "@/lib/utils";

const WINDOW_MS = OVERDUE_MINUTES * 60_000;

function mmss(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The 15-minute promise as a ring. The label logic is the original customer
 * `countdown()` (ported in `customerTimer`): once the elapsed minutes pass 15
 * the order reads "Over Time, your discount apply".
 */
export function CountdownRing({
  status,
  startTime,
  now,
  size = 168,
  className,
}: {
  status: OrderStatus;
  startTime: number;
  now: number;
  size?: number;
  className?: string;
}) {
  const elapsed = Math.max(0, now - startTime);
  const timer = customerTimer(elapsed);
  const progress = status === "outstanding" ? Math.min(1, elapsed / WINDOW_MS) : 1;
  const r = 44;
  const c = 2 * Math.PI * r;
  const tone =
    status === "fulfilled" || status === "collected"
      ? "text-matcha-500"
      : status === "canceled"
        ? "text-muted-foreground"
        : timer.over
          ? "text-tomato-500"
          : "text-honey-400";

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-secondary" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          className={tone}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - progress) }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <div className="relative px-4 text-center" aria-live="polite">
        {status === "outstanding" ? (
          timer.over ? (
            <>
              <p className="font-display text-lg leading-tight font-semibold text-tomato-600 dark:text-tomato-300">
                Over time
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">your discount applies</p>
            </>
          ) : (
            <>
              <p className="tabular font-display text-3xl leading-none font-semibold">
                {mmss(WINDOW_MS - elapsed)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">left of {OVERDUE_MINUTES} min</p>
            </>
          )
        ) : status === "canceled" ? (
          <X className="size-10 text-muted-foreground" aria-label="Cancelled" />
        ) : (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="grid size-14 place-items-center rounded-full bg-matcha-500 text-white"
          >
            <Check className="size-8" aria-label={status === "fulfilled" ? "Ready" : "Collected"} />
          </motion.span>
        )}
      </div>
    </div>
  );
}

/** Small inline variant for order lists: minutes left, or a tick when ready. */
export function MiniRing({
  status,
  startTime,
  now,
}: {
  status: OrderStatus;
  startTime: number;
  now: number;
}) {
  const elapsed = Math.max(0, now - startTime);
  const timer = customerTimer(elapsed);
  const progress = status === "outstanding" ? Math.min(1, elapsed / WINDOW_MS) : 1;
  const c = 2 * Math.PI * 44;
  const ready = status === "fulfilled" || status === "collected";
  const minutesLeft = Math.max(0, Math.ceil((WINDOW_MS - elapsed) / 60_000));
  return (
    <div className="relative grid size-16 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="9" className="stroke-secondary" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className={cn(
            "transition-[stroke-dashoffset] duration-700",
            ready ? "text-matcha-500" : timer.over ? "text-tomato-500" : "text-honey-400",
          )}
        />
      </svg>
      {ready ? (
        <Check
          className="relative size-6 text-matcha-600 dark:text-matcha-300"
          aria-label="Ready"
        />
      ) : timer.over ? (
        <span className="relative text-[0.65rem] font-bold text-tomato-600 uppercase dark:text-tomato-300">
          Late
        </span>
      ) : (
        <span className="relative text-center leading-none">
          <span className="tabular block font-display text-lg font-semibold">{minutesLeft}</span>
          <span className="block text-[0.6rem] text-muted-foreground">min</span>
        </span>
      )}
    </div>
  );
}
