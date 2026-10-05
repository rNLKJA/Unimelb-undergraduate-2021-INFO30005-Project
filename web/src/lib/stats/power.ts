/**
 * Power and sample size for a two-arm experiment, two-sided tests.
 *
 * Conventions follow statsmodels so every number can be checked against it
 * (reference values in power.test.ts were computed with statsmodels 0.15 via
 * uv; see scripts/verify_stats.py):
 *
 *  - Arm 1 is the treatment, arm 2 the control (reference) arm.
 *  - `ratio` = n2 / n1 (1 = equal allocation). Sample sizes are for arm 1;
 *    arm 2 needs `ratio` times as many.
 *  - Results are returned unrounded; callers round up with `Math.ceil`.
 */
import { normalCdf, normalQuantile, normalSf } from "./normal";

export interface TwoProportionDesign {
  /** Control (baseline) rate p2. */
  baseline: number;
  /** Absolute minimum detectable effect p1 - p2 (can be negative). */
  mde: number;
  alpha: number;
  power: number;
  /** n2 / n1, default 1. */
  ratio?: number;
}

function check(design: { alpha: number; power: number; ratio?: number }) {
  const { alpha, power, ratio = 1 } = design;
  if (!(alpha > 0 && alpha < 1)) throw new RangeError("alpha must be in (0, 1)");
  if (!(power > 0 && power < 1)) throw new RangeError("power must be in (0, 1)");
  if (!(ratio > 0)) throw new RangeError("ratio must be positive");
}

/** Standard deviations (for n1 = 1) of p1 - p2 under H0 (pooled) and under H1. */
function proportionStds(p1: number, p2: number, ratio: number) {
  const pooled = (p1 + p2 * ratio) / (1 + ratio);
  const stdNull = Math.sqrt(pooled * (1 - pooled) * (1 + 1 / ratio));
  const stdAlt = Math.sqrt(p1 * (1 - p1) + (p2 * (1 - p2)) / ratio);
  return { pooled, stdNull, stdAlt };
}

/**
 * Sample size per arm (arm 1) for the pooled two-proportion z-test, ignoring
 * the far tail of the two-sided test: the textbook formula
 *
 *   n1 = ((z_{1-α/2} σ0 + z_{power} σ1) / δ)²
 *
 * with σ0 from the pooled proportion and σ1 from the two arms' own rates.
 * Matches statsmodels `samplesize_proportions_2indep_onetail`.
 */
export function sampleSizeTwoProportions(design: TwoProportionDesign): number {
  check(design);
  const { baseline, mde, alpha, power, ratio = 1 } = design;
  const p1 = baseline + mde;
  if (!(baseline > 0 && baseline < 1 && p1 > 0 && p1 < 1)) {
    throw new RangeError("baseline and baseline + mde must both be in (0, 1)");
  }
  if (mde === 0) return Infinity;
  const { stdNull, stdAlt } = proportionStds(p1, baseline, ratio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zPower = normalQuantile(power);
  return ((zAlpha * stdNull + zPower * stdAlt) / Math.abs(mde)) ** 2;
}

/**
 * Power of the pooled two-proportion z-test with n1 in arm 1 (both tails).
 * Matches statsmodels `power_proportions_2indep(...).power`.
 */
export function powerTwoProportions(
  design: Omit<TwoProportionDesign, "power">,
  n1: number,
): number {
  const { baseline, mde, alpha, ratio = 1 } = design;
  const p1 = baseline + mde;
  const { stdNull, stdAlt } = proportionStds(p1, baseline, ratio);
  const crit = normalQuantile(1 - alpha / 2);
  const shift = (mde * Math.sqrt(n1)) / stdAlt;
  const r = stdNull / stdAlt;
  return normalSf(crit * r - shift) + normalCdf(-crit * r - shift);
}

/** Power of a two-sample z-test for a standardised effect d (both tails). */
export function powerStandardised(d: number, n1: number, alpha: number, ratio = 1): number {
  const nEff = 1 / (1 / n1 + 1 / (n1 * ratio));
  const crit = normalQuantile(1 - alpha / 2);
  const shift = Math.abs(d) * Math.sqrt(nEff);
  return normalSf(crit - shift) + normalCdf(-crit - shift);
}

/**
 * Solve `powerStandardised(d, n1) = power` for n1 by bisection, like
 * statsmodels `NormalIndPower().solve_power`. Exact for the z-test, both
 * tails included.
 */
export function sampleSizeStandardised(d: number, alpha: number, power: number, ratio = 1): number {
  check({ alpha, power, ratio });
  if (d === 0) return Infinity;
  let lo = 1e-6;
  let hi = 2;
  while (powerStandardised(d, hi, alpha, ratio) < power) {
    hi *= 2;
    if (hi > 1e12) return Infinity;
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (powerStandardised(d, mid, alpha, ratio) < power) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-10 * hi) break;
  }
  return (lo + hi) / 2;
}

/**
 * Cross-check for proportions: the arcsine (Cohen's h) approximation, solved
 * like statsmodels `NormalIndPower().solve_power(proportion_effectsize(p1, p2))`.
 */
export function sampleSizeTwoProportionsArcsine(design: TwoProportionDesign): number {
  const { baseline, mde, alpha, power, ratio = 1 } = design;
  const p1 = baseline + mde;
  const h = 2 * Math.asin(Math.sqrt(p1)) - 2 * Math.asin(Math.sqrt(baseline));
  return sampleSizeStandardised(h, alpha, power, ratio);
}

export interface TwoMeanDesign {
  /** Absolute minimum detectable difference in means (same units as sd). */
  mde: number;
  /** Common standard deviation of the outcome. */
  sd: number;
  alpha: number;
  power: number;
  ratio?: number;
}

/**
 * Sample size per arm (arm 1) to detect a difference in means.
 *
 *  - `z`: the normal-theory answer, n1 solved exactly for the two-sided
 *    z-test with d = mde / sd (statsmodels `NormalIndPower`).
 *  - `t`: Guenther's (1981) correction for estimating the SD, n_z + z²/4
 *    scaled for the allocation ratio. It tracks statsmodels `TTestIndPower`
 *    (noncentral t) to within one participant per arm for the designs this
 *    page offers; the test file pins that.
 */
export function sampleSizeTwoMeans(design: TwoMeanDesign): { z: number; t: number; d: number } {
  check(design);
  const { mde, sd, alpha, power, ratio = 1 } = design;
  if (!(sd > 0)) throw new RangeError("sd must be positive");
  const d = mde / sd;
  const z = sampleSizeStandardised(d, alpha, power, ratio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  // Equal allocation: + z²/4 per arm. For unequal allocation the correction
  // scales with the effective sample size factor (1 + 1/ratio) / 2.
  const t = z + ((zAlpha * zAlpha) / 4) * ((1 + 1 / ratio) / 2);
  return { z, t, d };
}

/** Days needed to enrol `total` units at `perDay` new eligible units per day. */
export function daysToEnrol(total: number, perDay: number): number {
  if (!(perDay > 0) || !Number.isFinite(total)) return Infinity;
  return Math.ceil(total / perDay);
}
