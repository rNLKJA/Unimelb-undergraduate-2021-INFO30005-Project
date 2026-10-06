/**
 * Seeded percentile bootstrap. Every interval records its seed and number of
 * resamples so a figure on the site can be reproduced exactly.
 */
import { mulberry32 } from "@/lib/rng";
import { mean, median, quantileSorted } from "./descriptive";

export interface BootstrapOptions {
  /** Number of resamples (default 2000). */
  reps?: number;
  /** Confidence level (default 0.95). */
  level?: number;
  /** Seed for the resampling RNG. */
  seed: number;
}

export interface BootstrapCI {
  /** The statistic on the original sample. */
  estimate: number;
  lower: number;
  upper: number;
  level: number;
  reps: number;
  seed: number;
  /** Sample size the statistic was computed on. */
  n: number;
}

/** Percentile interval of a bootstrap distribution (type-7 quantiles). */
export function percentileInterval(
  replicates: readonly number[],
  level: number,
): { lower: number; upper: number } {
  const finite = replicates.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) return { lower: NaN, upper: NaN };
  const alpha = (1 - level) / 2;
  return { lower: quantileSorted(finite, alpha), upper: quantileSorted(finite, 1 - alpha) };
}

/** Bootstrap a statistic of one sample by resampling its elements with replacement. */
export function bootstrap<T>(
  data: readonly T[],
  statistic: (sample: readonly T[]) => number,
  { reps = 2000, level = 0.95, seed }: BootstrapOptions,
): BootstrapCI {
  const n = data.length;
  const estimate = n ? statistic(data) : NaN;
  if (n === 0) return { estimate, lower: NaN, upper: NaN, level, reps, seed, n };
  const rng = mulberry32(seed);
  const sample = new Array<T>(n);
  const replicates = new Array<number>(reps);
  for (let b = 0; b < reps; b++) {
    for (let i = 0; i < n; i++) sample[i] = data[Math.floor(rng() * n)];
    replicates[b] = statistic(sample);
  }
  return { estimate, ...percentileInterval(replicates, level), level, reps, seed, n };
}

export const bootstrapMean = (xs: readonly number[], opts: BootstrapOptions) =>
  bootstrap(xs, mean, opts);

export const bootstrapMedian = (xs: readonly number[], opts: BootstrapOptions) =>
  bootstrap(xs, median, opts);

/** Bootstrap CI for any quantile, e.g. the 90th percentile of fulfilment time. */
export function bootstrapQuantile(xs: readonly number[], p: number, opts: BootstrapOptions) {
  return bootstrap(
    xs,
    (s) => {
      const sorted = [...s].sort((a, b) => a - b);
      return quantileSorted(sorted, p);
    },
    opts,
  );
}
