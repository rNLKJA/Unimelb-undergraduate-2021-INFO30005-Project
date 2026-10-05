/**
 * The vendor "shift summary": an optional, bring-your-own-key AI feature that
 * turns today's AGGREGATED, non-personal figures for one van into a short
 * note for the crew.
 *
 * Data minimisation is enforced here, by construction: `computeShiftMetrics`
 * reads orders but returns only counts, rates, a median, totals, the top
 * items and the busiest hour. No customer ids, names, order ids or free-text
 * comments ever reach the prompt (the tests assert it).
 */
import { z } from "zod";
import { MELBOURNE_TZ } from "@/lib/legacy-time";
import { melbourneDayKey } from "@/lib/format";
import { OVERDUE_MINUTES, type OrderStatus } from "@/lib/order-rules";
import { median } from "@/lib/stats/descriptive";
import { wilson } from "@/lib/stats/proportion";
import type { FactCheck } from "./audit-record";
import type { StructuredRequest } from "./types";

export type ShiftOrder = {
  status: OrderStatus;
  price: number;
  startTime: number;
  fulfilledTime: number | null;
  discountTime: number;
  discountApplied: boolean;
  rating: number | null;
  items: readonly { food: string; quantity: number }[];
};

export type ShiftMetrics = {
  van: string;
  date: string;
  ordersPlaced: number;
  cancelled: number;
  collected: number;
  inProgress: number;
  salesAud: number;
  medianMinutesToReady: number | null;
  readyWithin15: {
    ready: number;
    served: number;
    percent: number | null;
    ci95Percent: [number, number] | null;
  };
  lateDiscounts: number;
  ratings: { count: number; average: number | null };
  topItems: { item: string; quantity: number }[];
  busiestHour: { hour: string; orders: number } | null;
};

const hourFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: MELBOURNE_TZ,
  hour: "numeric",
  hour12: false,
});

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Today's (Melbourne) aggregate figures for one van. */
export function computeShiftMetrics(
  van: string,
  orders: readonly ShiftOrder[],
  now: number,
): ShiftMetrics {
  const today = melbourneDayKey(now);
  const todays = orders.filter((o) => melbourneDayKey(o.startTime) === today);
  const live = todays.filter((o) => o.status !== "canceled");
  const served = live.filter((o) => o.fulfilledTime != null);
  const minutes = served.map((o) => ((o.fulfilledTime as number) - o.startTime) / 60_000);
  const onTime = served.filter((o) => (o.fulfilledTime as number) <= o.discountTime).length;
  const ci = served.length ? wilson(onTime, served.length) : null;
  const rated = live.filter((o) => o.rating != null).map((o) => o.rating as number);

  const items = new Map<string, number>();
  for (const o of live)
    for (const i of o.items) items.set(i.food, (items.get(i.food) ?? 0) + i.quantity);
  const topItems = [...items.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([item, quantity]) => ({ item, quantity }));

  const hours = new Map<number, number>();
  for (const o of live) {
    const h = Number(hourFmt.format(o.startTime)) % 24;
    hours.set(h, (hours.get(h) ?? 0) + 1);
  }
  const busiest = [...hours.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];

  return {
    van,
    date: today,
    ordersPlaced: live.length,
    cancelled: todays.length - live.length,
    collected: live.filter((o) => o.status === "collected").length,
    inProgress: live.filter((o) => o.status === "outstanding" || o.status === "fulfilled").length,
    salesAud: Math.round(live.reduce((s, o) => s + o.price, 0) * 100) / 100,
    medianMinutesToReady: minutes.length ? round1(median(minutes)) : null,
    readyWithin15: {
      ready: onTime,
      served: served.length,
      percent: ci ? Math.round(ci.p * 100) : null,
      ci95Percent: ci ? [Math.round(ci.lower * 100), Math.round(ci.upper * 100)] : null,
    },
    lateDiscounts: served.filter(
      (o) => o.discountApplied || (o.fulfilledTime as number) > o.discountTime,
    ).length,
    ratings: {
      count: rated.length,
      average: rated.length ? round1(rated.reduce((a, b) => a + b, 0) / rated.length) : null,
    },
    topItems,
    busiestHour: busiest
      ? {
          hour: `${String(busiest[0]).padStart(2, "0")}:00–${String((busiest[0] + 1) % 24).padStart(2, "0")}:00`,
          orders: busiest[1],
        }
      : null,
  };
}

export const shiftSummarySchema = z.object({
  headline: z.string().min(1).max(200),
  highlights: z.array(z.string().min(1).max(240)).min(1).max(4),
  watchouts: z.array(z.string().min(1).max(240)).max(3),
  suggestion: z.string().min(1).max(280),
});
export type ShiftSummary = z.infer<typeof shiftSummarySchema>;

export const SHIFT_SUMMARY_SYSTEM = [
  "You write a short end-of-shift note for the crew of one coffee van.",
  "Use only the figures in the metrics JSON you are given. Do not invent numbers, causes, trends over time or comparisons with other days or vans: none were provided.",
  `Context: an order not ready within ${OVERDUE_MINUTES} minutes of being placed gets a late-order discount.`,
  "If a figure rests on fewer than ten orders, say it is based on only a few orders.",
  "Never mention or speculate about individual customers. Plain Australian English, no emoji, no markdown.",
].join(" ");

export function buildShiftSummaryRequest(metrics: ShiftMetrics): StructuredRequest<ShiftSummary> {
  return {
    feature: "shift-summary",
    system: SHIFT_SUMMARY_SYSTEM,
    user: [
      "Metrics for today's shift (aggregated; no personal data):",
      JSON.stringify(metrics, null, 2),
      "",
      "Return a one-sentence headline, 1 to 4 highlights, 0 to 3 watch-outs and one practical suggestion for the next shift.",
      "Quote numbers exactly as given (percentages may be rounded to whole numbers).",
    ].join("\n"),
    schema: shiftSummarySchema,
    schemaName: "shift_summary",
    maxTokens: 2048,
  };
}

/**
 * Every quantity in the metrics, in the forms a writer might quote it. Only
 * NUMERIC fields count: digits inside strings (the date, the busiest-hour
 * label, item and van names) are not quantities, and allowing them would let
 * small made-up counts through ("10 orders" on 2026-10-06). Dates and clock
 * times are checked separately, in date or time form only.
 */
export function allowedNumbers(metrics: ShiftMetrics): Set<number> {
  const out = new Set<number>([OVERDUE_MINUTES]);
  const add = (v: number) => {
    for (const x of [v, Math.round(v), round1(v), Math.round(v * 100) / 100]) out.add(x);
  };
  const visit = (node: unknown) => {
    if (typeof node === "number") add(node);
    else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === "object") Object.values(node).forEach(visit);
  };
  visit(metrics);
  // Derived figures a summary may reasonably state: the share late, the
  // shares of orders collected or cancelled, and orders including cancellations.
  const { readyWithin15: r, ordersPlaced, collected, cancelled } = metrics;
  if (r.served) add((100 * (r.served - r.ready)) / r.served);
  if (ordersPlaced) {
    add((100 * collected) / ordersPlaced);
    add((100 * metrics.lateDiscounts) / ordersPlaced);
  }
  if (ordersPlaced + cancelled) {
    add(ordersPlaced + cancelled);
    add((100 * cancelled) / (ordersPlaced + cancelled));
  }
  return out;
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTH_RE =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const monthIndex = (name: string) =>
  MONTHS.findIndex((m) => m.startsWith(name.toLowerCase().slice(0, 3)));

/** The hours (0-23) a summary may name: the start and end of the busiest hour. */
function allowedHours(metrics: ShiftMetrics): Set<number> {
  const m = metrics.busiestHour?.hour.match(/^(\d{1,2}):00\D+(\d{1,2}):00$/);
  return new Set(m ? [Number(m[1]) % 24, Number(m[2]) % 24] : []);
}

/** 24-hour value of "5 pm", "12 am", "17" (no suffix: either reading may match). */
function hourReadings(hour: number, suffix: string | undefined): number[] {
  const s = suffix?.toLowerCase().replace(/\./g, "");
  if (s === "am") return [hour % 12];
  if (s === "pm") return [(hour % 12) + 12];
  return hour <= 12 ? [hour % 24, (hour + 12) % 24] : [hour % 24];
}

/**
 * Pull dates and clock times out of the text, checking each against the
 * date and busiest hour that were sent; returns the remaining text and what
 * was found. "6 October", "2026-10-06" and "10:00" are checked in that form,
 * so their digits are never mistaken for (or excused as) counts.
 */
function extractDatesAndTimes(text: string, metrics: ShiftMetrics) {
  const [year, month, day] = metrics.date.split("-").map(Number);
  const hours = allowedHours(metrics);
  const found: { raw: string; ok: boolean }[] = [];
  const take = (re: RegExp, ok: (m: RegExpExecArray) => boolean) => {
    text = text.replace(re, (...args) => {
      const match = args.slice(0, -2) as unknown as RegExpExecArray;
      found.push({ raw: match[0].trim(), ok: ok(match) });
      return " ";
    });
  };
  const yearOk = (y: string | undefined) => y == null || Number(y) === year;
  take(
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (m) => Number(m[1]) === year && Number(m[2]) === month && Number(m[3]) === day,
  );
  take(
    new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\b(?:,?\\s+(\\d{4}))?`,
      "gi",
    ),
    (m) => Number(m[1]) === day && monthIndex(m[2]) + 1 === month && yearOk(m[3]),
  );
  take(
    new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`, "gi"),
    (m) => Number(m[2]) === day && monthIndex(m[1]) + 1 === month && yearOk(m[3]),
  );
  take(
    /\b(\d{1,2}):(\d{2})(?:\s*([ap]\.?m\.?))?(?![\w])/gi,
    (m) => m[2] === "00" && hourReadings(Number(m[1]), m[3]).some((h) => hours.has(h)),
  );
  take(/\b(\d{1,2})\s*([ap]\.?m\.?)(?![\w])/gi, (m) =>
    hourReadings(Number(m[1]), m[2]).some((h) => hours.has(h)),
  );
  return { rest: text, found };
}

/**
 * Automatic check: every number the model wrote must be one of the numbers
 * it was given (or a plain rounding of one); a date must be the shift's date
 * and a clock time the busiest hour's start or end. Anything else is listed
 * for the human reviewer. A guard, not a guarantee: wording can still mislead.
 */
export function factCheckSummary(summary: ShiftSummary, metrics: ShiftMetrics): FactCheck {
  const allowed = [...allowedNumbers(metrics)];
  const text = [
    summary.headline,
    ...summary.highlights,
    ...summary.watchouts,
    summary.suggestion,
  ].join(" ");
  const { rest, found: datesAndTimes } = extractDatesAndTimes(text, metrics);
  // Ignore digits glued to letters (e.g. "4.5-star" is fine, "A1" is not a figure).
  const found = rest.match(/(?<![A-Za-z])\d+(?:[.,]\d+)?(?![A-Za-z])/g) ?? [];
  const unsupported = new Set<string>();
  for (const d of datesAndTimes) if (!d.ok) unsupported.add(d.raw);
  for (const raw of found) {
    const v = Number(raw.replace(/,/g, ""));
    if (!allowed.some((a) => Math.abs(a - v) < 1e-9)) unsupported.add(raw);
  }
  return { checked: datesAndTimes.length + found.length, unsupported: [...unsupported] };
}

/** The summary as plain text, for the "edit" decision and the audit log. */
export function summaryToText(s: ShiftSummary): string {
  return [
    s.headline,
    "",
    ...s.highlights.map((h) => `+ ${h}`),
    ...(s.watchouts.length ? ["", ...s.watchouts.map((w) => `! ${w}`)] : []),
    "",
    `Next shift: ${s.suggestion}`,
  ].join("\n");
}
