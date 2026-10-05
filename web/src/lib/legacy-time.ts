/**
 * Ports of the time helpers in `coursework/js/utility.js` and the order-detail
 * controller (`getdetialOfaOrder`).
 *
 * The 2021 app stored every timestamp as an unpadded "H:M:S" string plus a
 * "D-M-YYYY" date string, converting the Heroku server's UTC clock to Melbourne
 * time by hand. The revived app stores real timestamps (ms since epoch) and
 * renders them with `Intl` in the Australia/Melbourne time zone, but these
 * functions are kept — and parity-tested against the original file — so the
 * legacy string formats (still written to `orders.order_date`) and the original
 * quirks are documented exactly.
 */

export const MELBOURNE_TZ = "Australia/Melbourne";

/** Minutes after `start_time` at which the late-order discount kicks in. */
export const DISCOUNT_WINDOW_MINUTES = 15;

/**
 * The original "UTC -> Melbourne" hour conversion, bug-for-bug:
 * `0 < h < 14` adds 10, `14 < h < 24` *subtracts* 10 (it should add 10 and wrap),
 * and both 0 and 14 collapse to 0. It also ignores daylight saving.
 */
export function legacyMelbourneHour(utcHour: number): number {
  if (0 < utcHour && utcHour < 14) return utcHour + 10;
  if (14 < utcHour && utcHour < 24) return utcHour - 10;
  return 0;
}

/** Port of `utility.currentTime()` — unpadded "H:M:S" using the legacy hour. */
export function legacyCurrentTime(now: Date): string {
  const hour = legacyMelbourneHour(now.getUTCHours());
  return `${hour}:${now.getMinutes()}:${now.getSeconds()}`;
}

/**
 * Port of `utility.discountTime()` — the current legacy time plus 15 minutes.
 * Minutes overflow into the hour, but the hour itself is never wrapped, so
 * 23:50 becomes "24:5" exactly like the original.
 */
export function legacyDiscountTime(now: Date): string {
  let hours = legacyMelbourneHour(now.getUTCHours());
  let minutes = now.getMinutes() + DISCOUNT_WINDOW_MINUTES;
  if (minutes > 59) {
    minutes = minutes - 60;
    hours++;
  }
  return `${hours}:${minutes}:${now.getSeconds()}`;
}

/** Port of `utility.currentDate()` — "D-M-YYYY" in the process' local time. */
export function legacyCurrentDate(now: Date): string {
  return `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
}

/**
 * Port of the "Delivery Estimation" maths in `getdetialOfaOrder`:
 * start minute + 15, carrying into the hour (mod 24); minutes are not padded.
 */
export function legacyEstimateTime(startTime: string): string {
  const [h, m] = startTime.split(":");
  const estimate = parseInt(m, 10) + DISCOUNT_WINDOW_MINUTES;
  let estimateHour = parseInt(h, 10);
  if (estimate >= 60) {
    estimateHour = (parseInt(h, 10) + 1) % 24;
  }
  const estimateMin = estimate % 60;
  return `${estimateHour}:${estimateMin}`;
}

/** Calendar parts of `date` in Melbourne, independent of the server's zone. */
export function melbourneParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: MELBOURNE_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** The legacy "D-M-YYYY" order date, computed correctly in Melbourne time. */
export function orderDateString(date: Date): string {
  const p = melbourneParts(date);
  return `${p.day}-${p.month}-${p.year}`;
}

/** The legacy unpadded "H:M:S" clock string, computed correctly in Melbourne time. */
export function clockString(date: Date): string {
  const p = melbourneParts(date);
  return `${p.hour}:${p.minute}:${p.second}`;
}
