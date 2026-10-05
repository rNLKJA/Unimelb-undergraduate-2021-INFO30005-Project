/**
 * Why peeking breaks a fixed-horizon test: simulate many A/A experiments
 * (no true effect), analyse each one at K equally spaced interim looks, and
 * count how often "stop as soon as p < alpha" declares a winner. Every such
 * declaration is a false positive.
 *
 * Also shown: Pocock's group-sequential boundary, a constant, stricter
 * critical value at every look chosen so the overall false-positive rate
 * stays at alpha. Constants for two-sided alpha = 0.05 and equally spaced
 * looks, from Jennison & Turnbull (2000), Table 2.1.
 */
import { deriveSeed, mulberry32 } from "@/lib/rng";
import { normalQuantile } from "@/lib/stats/normal";
import { wilson, type ProportionCI } from "@/lib/stats/proportion";

export const POCOCK_Z_ALPHA_05: Readonly<Record<number, number>> = {
  1: 1.96,
  2: 2.178,
  3: 2.289,
  4: 2.361,
  5: 2.413,
  6: 2.453,
  7: 2.485,
  8: 2.512,
  9: 2.535,
  10: 2.555,
};

/**
 * The designer caps the peeking simulation at this many customers per arm so
 * a tiny minimum detectable effect cannot stall the page; the axis label
 * says when the cap applies. The inflation of false positives depends on the
 * number of looks, not on n, so the lesson is the same.
 */
export const PEEKING_MAX_PER_ARM = 5000;

export interface PeekingInput {
  perArm: number;
  baseline: number;
  looks: number;
  reps: number;
  alpha: number;
  seed: number;
}

export interface PeekingResult {
  reps: number;
  looks: number;
  alpha: number;
  seed: number;
  perArm: number;
  /** Reject only at the planned end: should be close to alpha. */
  fixedHorizon: ProportionCI;
  /** Reject at the first look with p < alpha: inflated. */
  peeking: ProportionCI;
  /** Reject at the first look beyond Pocock's constant boundary (alpha = 0.05 only). */
  pocock: ProportionCI | null;
  pocockZ: number | null;
  /** Share of all false positives found at each look under naive peeking. */
  firstRejectionAtLook: number[];
}

function zStat(x1: number, n1: number, x2: number, n2: number): number {
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  return se === 0 ? 0 : (x1 / n1 - x2 / n2) / se;
}

export function simulatePeeking(input: PeekingInput): PeekingResult {
  const { perArm, baseline, looks, reps, alpha, seed } = input;
  if (looks < 1 || !Number.isInteger(looks))
    throw new RangeError("looks must be a positive integer");
  // An infinite or NaN sample size (e.g. from a zero effect) would never finish.
  if (!Number.isFinite(perArm) || perArm < 1)
    throw new RangeError("perArm must be a finite number of at least 1");
  if (!Number.isInteger(reps) || reps < 1) throw new RangeError("reps must be a positive integer");
  if (!(baseline >= 0 && baseline <= 1)) throw new RangeError("baseline must be in [0, 1]");
  if (!(alpha > 0 && alpha < 1)) throw new RangeError("alpha must be in (0, 1)");
  const zCrit = normalQuantile(1 - alpha / 2);
  const pocockZ = Math.abs(alpha - 0.05) < 1e-12 ? (POCOCK_Z_ALPHA_05[looks] ?? null) : null;
  // Look k analyses the first round(k * n / K) customers of each arm.
  const lookAt = Array.from({ length: looks }, (_, k) =>
    Math.max(1, Math.round(((k + 1) * perArm) / looks)),
  );
  let fixed = 0;
  let peek = 0;
  let pocock = 0;
  const firstAt = new Array<number>(looks).fill(0);
  for (let r = 0; r < reps; r++) {
    const rng = mulberry32(deriveSeed(seed, r));
    let x1 = 0;
    let x2 = 0;
    let n = 0;
    let peeked = false;
    let pocockHit = false;
    for (let k = 0; k < looks; k++) {
      while (n < lookAt[k]) {
        if (rng() < baseline) x1++;
        if (rng() < baseline) x2++;
        n++;
      }
      const z = Math.abs(zStat(x1, n, x2, n));
      if (!peeked && z > zCrit) {
        peeked = true;
        firstAt[k]++;
      }
      if (pocockZ != null && !pocockHit && z > pocockZ) pocockHit = true;
      if (k === looks - 1 && z > zCrit) fixed++;
    }
    if (peeked) peek++;
    if (pocockHit) pocock++;
  }
  return {
    reps,
    looks,
    alpha,
    seed,
    perArm,
    fixedHorizon: wilson(fixed, reps),
    peeking: wilson(peek, reps),
    pocock: pocockZ == null ? null : wilson(pocock, reps),
    pocockZ,
    firstRejectionAtLook: firstAt.map((c) => (peek ? c / peek : 0)),
  };
}
