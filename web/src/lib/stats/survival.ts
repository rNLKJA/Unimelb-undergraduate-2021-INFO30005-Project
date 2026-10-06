/**
 * Kaplan–Meier estimator with Greenwood standard errors and log-log
 * confidence intervals, matching R `survival::survfit(Surv(time, event) ~ 1,
 * conf.type = "log-log")` (reference values in survival.test.ts; see
 * scripts/verify_km.R).
 *
 * Used for "time to fulfil": an order's clock starts when it is placed, the
 * event is "ready for pickup", and an order still being prepared is
 * right-censored at the time we look. Ignoring those open orders, or
 * treating them as finished now, would both bias the curve.
 */
import { zCritical } from "./normal";

export interface KmStep {
  /** Distinct observed time (event or censoring). */
  time: number;
  nRisk: number;
  nEvent: number;
  nCensor: number;
  /** S(time): probability of no event yet just after `time`. */
  survival: number;
  /** Greenwood standard error of log S(time) (R's `std.err`). */
  stdErrLog: number;
  /** Pointwise CI for S(time): [1, 1] while S = 1, NaN where R reports NA (S = 0). */
  lower: number;
  upper: number;
}

export interface KaplanMeier {
  steps: KmStep[];
  n: number;
  events: number;
  censored: number;
  level: number;
}

export function kaplanMeier(
  times: readonly number[],
  events: readonly boolean[],
  level = 0.95,
): KaplanMeier {
  if (times.length !== events.length) throw new RangeError("times and events differ in length");
  const z = zCritical(level);
  const order = times
    .map((t, i) => ({ t, e: events[i] }))
    .filter((o) => Number.isFinite(o.t))
    .sort((a, b) => a.t - b.t);
  const n = order.length;
  let atRisk = n;
  let surv = 1;
  let varLog = 0;
  const steps: KmStep[] = [];
  let i = 0;
  while (i < n) {
    const time = order[i].t;
    let d = 0;
    let c = 0;
    while (i < n && order[i].t === time) {
      if (order[i].e) d++;
      else c++;
      i++;
    }
    if (d > 0) {
      surv *= 1 - d / atRisk;
      varLog += atRisk > d ? d / (atRisk * (atRisk - d)) : Infinity;
    }
    const se = Math.sqrt(varLog);
    let lower: number;
    let upper: number;
    if (surv === 0) {
      lower = NaN;
      upper = NaN;
    } else if (surv === 1) {
      lower = 1;
      upper = 1;
    } else {
      // CI on log(-log S), mapped back. log S < 0, so `w` is negative and
      // adding it raises S: that end is the upper limit.
      const ll = Math.log(-Math.log(surv));
      const w = (z * se) / Math.log(surv);
      upper = Math.min(1, Math.exp(-Math.exp(ll + w)));
      lower = Math.exp(-Math.exp(ll - w));
    }
    steps.push({
      time,
      nRisk: atRisk,
      nEvent: d,
      nCensor: c,
      survival: surv,
      stdErrLog: se,
      lower,
      upper,
    });
    atRisk -= d + c;
  }
  const eventCount = order.filter((o) => o.e).length;
  return { steps, n, events: eventCount, censored: n - eventCount, level };
}

/** The step in force at time t (S(t) for a right-continuous step function), or null before the first step. */
export function kmStepAt(km: KaplanMeier, t: number): KmStep | null {
  let found: KmStep | null = null;
  for (const s of km.steps) {
    if (s.time <= t) found = s;
    else break;
  }
  return found;
}

/** S(t) with its CI; S = 1 (and the CI [1, 1]) before the first observed time. */
export function survivalAt(km: KaplanMeier, t: number) {
  const s = kmStepAt(km, t);
  if (!s) return { survival: 1, lower: 1, upper: 1 };
  return { survival: s.survival, lower: s.lower, upper: s.upper };
}

/**
 * Median (q = 0.5) or other quantile of the event time: the first time the
 * curve drops to 1 - q or below. When the curve sits exactly at 1 - q over
 * an interval, R reports the midpoint to the next event time; so does this.
 * Returns NaN when the curve never gets there (too much censoring).
 */
export function kmQuantile(km: KaplanMeier, q = 0.5): number {
  const target = 1 - q;
  const eventSteps = km.steps.filter((s) => s.nEvent > 0);
  for (let k = 0; k < eventSteps.length; k++) {
    const s = eventSteps[k];
    if (Math.abs(s.survival - target) < 1e-12) {
      const next = eventSteps[k + 1];
      return next ? (s.time + next.time) / 2 : s.time;
    }
    if (s.survival < target) return s.time;
  }
  return NaN;
}
