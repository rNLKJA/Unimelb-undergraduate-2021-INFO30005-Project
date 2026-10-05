"use client";

import { Check, ChefHat, MapPin, Navigation, PackageCheck, Star } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { VanMark } from "@/components/brand/van-mark";
import { cn } from "@/lib/utils";

/**
 * The landing page's "live demo" story: a customer phone and a vendor tablet
 * side by side, replaying one order through the same state machine the app
 * uses (outstanding -> fulfilled -> collected). Purely illustrative.
 */
const STEPS = [
  {
    key: "find",
    title: "Find the nearest van",
    body: "The customer shares a location; the five closest open vans are ranked.",
  },
  {
    key: "order",
    title: "Order ahead",
    body: "The order lands on the van's board instantly, with a 15-minute promise.",
  },
  {
    key: "ready",
    title: "Mark it ready",
    body: "One tap on the tablet and the customer's phone turns green.",
  },
  {
    key: "collected",
    title: "Pick up & rate",
    body: "Collected orders move to history; the customer leaves a rating.",
  },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const ORDER_ITEMS = ["1× Flat White", "1× Fancy Biscuit"];

function PhoneScreen({ step }: { step: StepKey }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="flex h-full flex-col gap-2 p-2.5"
      >
        {step === "find" && (
          <>
            <div className="relative h-[46%] overflow-hidden rounded-xl bg-[#e9f0e4] dark:bg-[#24301f]">
              <div className="absolute inset-0 [background-image:linear-gradient(90deg,transparent_47%,#fff_47%,#fff_53%,transparent_53%),linear-gradient(0deg,transparent_47%,#fff_47%,#fff_53%,transparent_53%)] [background-size:38px_38px] opacity-70 dark:opacity-10" />
              <span className="absolute top-[52%] left-[44%] size-3 rounded-full bg-sky-500 ring-4 ring-sky-500/25" />
              {[
                [22, 30],
                [62, 26],
                [70, 64],
                [30, 70],
              ].map(([x, y], i) => (
                <span key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
                  <VanMark className="h-3.5 w-auto drop-shadow" />
                </span>
              ))}
            </div>
            <p className="px-1 text-[0.62rem] font-semibold tracking-wide text-muted-foreground uppercase">
              5 nearest vans
            </p>
            {["Ardeth Lavon", "Audrey Laverne", "Penelope Karen"].map((name, i) => (
              <div
                key={name}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                  i === 0 && "border-tomato-400 bg-tomato-300/15",
                )}
              >
                <span className="grid size-4 place-items-center rounded-full bg-espresso-800 text-[0.55rem] font-bold text-crema-100 dark:bg-crema-200 dark:text-espresso-900">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-[0.66rem] font-semibold">{name}</span>
                <span className="text-[0.6rem] text-muted-foreground">
                  {["230 m", "410 m", "520 m"][i]}
                </span>
              </div>
            ))}
          </>
        )}
        {step === "order" && (
          <div className="flex h-full flex-col items-center gap-2 pt-2 text-center">
            <p className="text-[0.62rem] font-semibold tracking-wide text-muted-foreground uppercase">
              Order QXZ4821
            </p>
            <div className="relative grid size-24 place-items-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  className="text-secondary"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  strokeLinecap="round"
                  className="text-honey-400"
                  strokeDasharray={264}
                  initial={{ strokeDashoffset: 264 }}
                  animate={{ strokeDashoffset: 264 * 0.78 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div>
                <p className="tabular font-display text-xl leading-none font-semibold">3:12</p>
                <p className="text-[0.55rem] text-muted-foreground">of 15 min</p>
              </div>
            </div>
            <p className="flex items-center gap-1 text-[0.7rem] font-semibold">
              <ChefHat className="size-3" /> Preparing
            </p>
            <div className="w-full rounded-lg border px-2 py-1.5 text-left text-[0.62rem]">
              {ORDER_ITEMS.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        )}
        {step === "ready" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="grid size-16 place-items-center rounded-full bg-matcha-500 text-white shadow-lg shadow-matcha-500/30"
            >
              <PackageCheck className="size-8" />
            </motion.div>
            <p className="font-display text-base leading-tight font-semibold">Ready for pickup!</p>
            <p className="px-2 text-[0.62rem] text-muted-foreground">
              Ardeth Lavon · Grattan Street, Parkville
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[0.6rem] font-semibold">
              <Navigation className="size-3" /> 230 m away
            </span>
          </div>
        )}
        {step === "collected" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="font-display text-base font-semibold">How was it?</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.span
                  key={n}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: n * 0.08, type: "spring", stiffness: 300, damping: 15 }}
                >
                  <Star className="size-5 fill-honey-400 text-honey-500" />
                </motion.span>
              ))}
            </div>
            <p className="rounded-lg bg-secondary px-2 py-1.5 text-[0.62rem] italic">
              &ldquo;Ready before I got there!&rdquo;
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function OrderTicket({ step }: { step: StepKey }) {
  const ready = step === "ready" || step === "collected";
  return (
    <motion.div
      layoutId="demo-ticket"
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className={cn(
        "rounded-lg border bg-card p-2 shadow-sm",
        step === "order" && "ring-2 ring-honey-400",
        step === "ready" && "ring-2 ring-matcha-400",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="font-mono text-[0.6rem] font-medium">QXZ4821</span>
        <span
          className={cn(
            "rounded-full px-1.5 text-[0.52rem] font-semibold whitespace-nowrap",
            ready ? "bg-matcha-300/40 text-matcha-600" : "bg-honey-300/50 text-espresso-800",
          )}
        >
          {step === "collected" ? "Collected" : ready ? "Ready" : "12 min left"}
        </span>
      </div>
      <p className="mt-0.5 text-[0.6rem] font-semibold">Sam S.</p>
      {ORDER_ITEMS.map((item) => (
        <p key={item} className="text-[0.55rem] text-muted-foreground">
          {item}
        </p>
      ))}
      {step === "order" && (
        <span className="mt-1 flex items-center justify-center gap-1 rounded-md bg-espresso-800 py-0.5 text-[0.52rem] font-semibold text-crema-100 dark:bg-crema-200 dark:text-espresso-900">
          <Check className="size-2.5" /> Mark ready
        </span>
      )}
    </motion.div>
  );
}

function Ghost({ id, name }: { id: string; name: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-card/60 p-2 opacity-80">
      <p className="font-mono text-[0.6rem]">{id}</p>
      <p className="text-[0.55rem] text-muted-foreground">{name}</p>
    </div>
  );
}

function TabletScreen({ step }: { step: StepKey }) {
  const column = step === "find" ? null : step === "order" ? 0 : step === "ready" ? 1 : 2;
  const cols = [
    { title: "Preparing", ghosts: [["ARD5310", "Mia C."]] },
    { title: "Ready", ghosts: [["LPK907", "Jack S."]] },
    {
      title: "Collected",
      ghosts: [
        ["BQZ4417", "Isla P."],
        ["WTE81", "Noah W."],
      ],
    },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <VanMark className="h-3.5 w-auto" />
          <span className="text-[0.68rem] font-semibold">Ardeth Lavon</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-matcha-300/40 px-2 py-0.5 text-[0.55rem] font-semibold text-matcha-600 dark:text-matcha-300">
          <span className="size-1.5 rounded-full bg-matcha-500" /> Open
        </span>
      </div>
      <LayoutGroup>
        <div className="grid flex-1 grid-cols-3 gap-2 p-2">
          {cols.map((col, i) => (
            <div key={col.title} className="flex flex-col gap-1.5 rounded-xl bg-muted/70 p-1.5">
              <p className="px-0.5 text-[0.55rem] font-bold tracking-wide text-muted-foreground uppercase">
                {col.title}
              </p>
              {column === i ? <OrderTicket step={step} /> : null}
              {col.ghosts.map(([id, name]) => (
                <Ghost key={id} id={id} name={name} />
              ))}
            </div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}

export function LiveDemoStory() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const step = STEPS[index].key;

  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % STEPS.length), 3400);
    return () => window.clearTimeout(id);
  }, [index, paused, reduce]);

  return (
    <figure
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
        <div className="absolute inset-[6%] -z-10 rounded-[40%] bg-tomato-300/30 blur-3xl dark:bg-tomato-500/15" />
        {/* Vendor tablet */}
        <div className="absolute top-[4%] left-0 h-[66%] w-[70%] overflow-hidden rounded-[22px] border-[7px] border-espresso-900 bg-background shadow-2xl shadow-espresso-900/20 dark:border-espresso-700">
          <TabletScreen step={step} />
        </div>
        <span className="absolute top-[73%] left-[2%] text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Vendor tablet
        </span>
        {/* Customer phone */}
        <div className="absolute right-0 bottom-[6%] h-[82%] w-[33%] overflow-hidden rounded-[26px] border-[6px] border-espresso-900 bg-background shadow-2xl shadow-espresso-900/25 dark:border-espresso-700">
          <div className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-espresso-900/80 dark:bg-espresso-600" />
          <PhoneScreen step={step} />
        </div>
        <span className="absolute right-[1%] bottom-0 flex items-center gap-1 text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          <MapPin className="size-3" /> Customer phone
        </span>
      </div>

      <figcaption className="mt-6">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Demo story steps">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "h-full w-full rounded-2xl border px-3 py-2.5 text-left transition-colors",
                  i === index ? "border-tomato-400 bg-card shadow-sm" : "hover:bg-card/70",
                )}
              >
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[0.65rem]",
                      i === index ? "bg-primary text-primary-foreground" : "bg-secondary",
                    )}
                  >
                    {i + 1}
                  </span>
                  {s.title}
                </span>
                <span className="mt-1 hidden text-[0.72rem] leading-snug text-muted-foreground sm:block">
                  {s.body}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
