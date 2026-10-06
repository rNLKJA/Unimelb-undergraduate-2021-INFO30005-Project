/**
 * Calibration of the experiment analysis against KNOWN truth: simulate many
 * experiments with a fixed injected effect and score the analysis. A correct
 * (1 − α) interval should cover the truth about (1 − α) of the time, the
 * test should reject about `power` of the time when the planned effect is
 * real, and about α of the time when there is no effect (A/A).
 *
 * Run by `pnpm calibrate` (scripts/calibrate-simulation.ts), which writes
 * docs/calibration.json; the published table is generated from that file.
 */
import { wilson, type ProportionCI } from "@/lib/stats/proportion";
import { analyseExperiment, simulateExperiment } from "./simulate";

export interface CalibrationInput {
  perArm: number;
  baseline: number;
  /** Injected true effect (absolute). */
  effect: number;
  alpha: number;
  treatmentWindow: number;
  /** Number of simulated experiments. */
  reps: number;
  /** Replicate r (0-based) uses simulation seed `firstSeed + r`. */
  firstSeed: number;
  pool: readonly number[];
}

export interface CalibrationRow {
  injectedEffect: number;
  reps: number;
  seeds: { first: number; last: number };
  /** Mean estimated difference, with its Monte Carlo standard error (SD / √reps). */
  meanDifference: number;
  meanDifferenceMcSe: number;
  /** Share of runs whose (1 − α) Newcombe interval covered the injected effect. */
  coverage: ProportionCI;
  /** Share of runs where the pooled z-test rejected H0 at α. */
  rejectZ: ProportionCI;
  /** Share of runs where the exact permutation test rejected H0 at α. */
  rejectExact: ProportionCI;
}

export function calibrate(input: CalibrationInput): CalibrationRow {
  const { reps, firstSeed, effect, alpha } = input;
  if (!Number.isInteger(reps) || reps < 2) throw new RangeError("reps must be an integer ≥ 2");
  let sum = 0;
  let sumSq = 0;
  let covered = 0;
  let rejectZ = 0;
  let rejectExact = 0;
  for (let r = 0; r < reps; r++) {
    const seed = firstSeed + r;
    const customers = simulateExperiment({
      perArm: input.perArm,
      baseline: input.baseline,
      trueEffect: effect,
      treatmentWindow: input.treatmentWindow,
      seed,
      fulfilmentPool: input.pool,
    });
    // The Monte Carlo permutation test is skipped (0 relabellings); the exact test stands in for it.
    const res = analyseExperiment(customers, {
      seed,
      permutationReps: 0,
      trueEffect: effect,
      level: 1 - alpha,
    });
    const d = res.difference.estimate;
    sum += d;
    sumSq += d * d;
    if (res.coversTruth) covered++;
    if (res.zTest.p < alpha) rejectZ++;
    if (res.exact.p < alpha) rejectExact++;
  }
  const mean = sum / reps;
  const variance = Math.max(0, (sumSq - reps * mean * mean) / (reps - 1));
  return {
    injectedEffect: effect,
    reps,
    seeds: { first: firstSeed, last: firstSeed + reps - 1 },
    meanDifference: mean,
    meanDifferenceMcSe: Math.sqrt(variance / reps),
    coverage: wilson(covered, reps),
    rejectZ: wilson(rejectZ, reps),
    rejectExact: wilson(rejectExact, reps),
  };
}
