/**
 * Permutation tests for a two-arm experiment.
 *
 * Under H0 (the treatment does nothing) the arm labels are exchangeable, so
 * the reference distribution of the test statistic comes from re-assigning
 * the labels. That is exactly what a randomised experiment justifies, with
 * no normal approximation.
 */
import { mulberry32, shuffleInPlace } from "@/lib/rng";

export interface PermutationResult {
  /** Observed statistic (mean of arm 1 minus mean of arm 2). */
  observed: number;
  /** Two-sided p-value. */
  p: number;
  /** Resamples drawn (Infinity for an exact enumeration). */
  reps: number;
  seed: number | null;
  method: "monte-carlo" | "exact";
}

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Monte Carlo permutation test for a difference in means (for 0/1 outcomes,
 * a difference in proportions), two-sided on |statistic|. The p-value is
 * (b + 1) / (B + 1), which never reports an impossible p = 0 (Phipson &
 * Smyth, 2010). Seeded, so a result can be reproduced exactly.
 */
export function permutationTestMeans(
  x: readonly number[],
  y: readonly number[],
  { reps = 5000, seed }: { reps?: number; seed: number },
): PermutationResult {
  const n1 = x.length;
  const n2 = y.length;
  if (n1 === 0 || n2 === 0) {
    return { observed: NaN, p: NaN, reps, seed, method: "monte-carlo" };
  }
  const pooled = [...x, ...y];
  const total = sumOf(pooled);
  const observed = sumOf(x) / n1 - sumOf(y) / n2;
  // Tolerance so ties with the observed value count as "as extreme".
  const threshold = Math.abs(observed) - 1e-12;
  const rng = mulberry32(seed);
  let extreme = 0;
  for (let b = 0; b < reps; b++) {
    shuffleInPlace(rng, pooled);
    let s1 = 0;
    for (let i = 0; i < n1; i++) s1 += pooled[i];
    const stat = s1 / n1 - (total - s1) / n2;
    if (Math.abs(stat) >= threshold) extreme++;
  }
  return { observed, p: (extreme + 1) / (reps + 1), reps, seed, method: "monte-carlo" };
}

function logChoose(n: number, k: number): number {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

const LOG_FACT: number[] = [0];
function logFactorial(n: number): number {
  for (let i = LOG_FACT.length; i <= n; i++) LOG_FACT[i] = LOG_FACT[i - 1] + Math.log(i);
  return LOG_FACT[n];
}

/** Hypergeometric pmf: k successes in a draw of `draws` from N items with K successes. */
export function hypergeometricPmf(k: number, N: number, K: number, draws: number): number {
  if (k < Math.max(0, draws - (N - K)) || k > Math.min(K, draws)) return 0;
  return Math.exp(logChoose(K, k) + logChoose(N - K, draws - k) - logChoose(N, draws));
}

/**
 * Exact permutation test for a difference in proportions. With binary
 * outcomes every relabelling is summarised by how many successes land in arm
 * 1, which is hypergeometric under H0, so all C(n1 + n2, n1) permutations
 * can be enumerated through that distribution. Two-sided on |p1 - p2|.
 */
export function exactPermutationTwoProportions(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
): PermutationResult {
  const N = n1 + n2;
  const K = x1 + x2;
  const observed = x1 / n1 - x2 / n2;
  const threshold = Math.abs(observed) - 1e-12;
  let p = 0;
  for (let k = Math.max(0, n1 - (N - K)); k <= Math.min(K, n1); k++) {
    const stat = k / n1 - (K - k) / n2;
    if (Math.abs(stat) >= threshold) p += hypergeometricPmf(k, N, K, n1);
  }
  return { observed, p: Math.min(1, p), reps: Infinity, seed: null, method: "exact" };
}
