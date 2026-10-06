import { MELBOURNE_TZ } from "./legacy-time";

const timeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: MELBOURNE_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dateFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: MELBOURNE_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: MELBOURNE_TZ,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: MELBOURNE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const toDate = (value: number | Date) => (value instanceof Date ? value : new Date(value));

export const formatTime = (value: number | Date) => timeFmt.format(toDate(value));
export const formatDate = (value: number | Date) => dateFmt.format(toDate(value));
export const formatDateTime = (value: number | Date) => dateTimeFmt.format(toDate(value));
/** YYYY-MM-DD in Melbourne — handy for "today" comparisons. */
export const melbourneDayKey = (value: number | Date) => dayKeyFmt.format(toDate(value));

/** Time only for today (Melbourne), otherwise date and time, e.g. on order tickets. */
export function formatWhen(value: number | Date, now: number | Date): string {
  return melbourneDayKey(value) === melbourneDayKey(now)
    ? formatTime(value)
    : formatDateTime(value);
}

/** "4:07" style minutes:seconds for countdowns (negative values clamp to 0). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function relativeMinutes(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function initials(first: string, last?: string): string {
  return `${first.charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase();
}
