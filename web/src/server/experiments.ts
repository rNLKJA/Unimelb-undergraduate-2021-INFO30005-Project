import "server-only";
import {
  DEFAULT_PEEK_RUN,
  DEFAULT_SIM_RUN,
  runPeeking,
  runSimulation,
} from "@/lib/experiments/runs";
import type { PeekingResult } from "@/lib/experiments/peeking";
import type { ExperimentAnalysis } from "@/lib/experiments/simulate";

/*
 * The experiment designer's default results are deterministic (fixed seeds),
 * so they are computed once per server instance and rendered with the page,
 * instead of during every render and again during hydration in the browser.
 * The simulation depends on the fulfilment pool (live data), so it is cached
 * per pool; the peeking simulation depends on nothing live.
 */
let peekCache: PeekingResult | null = null;
let simCache: { key: string; result: ExperimentAnalysis } | null = null;

export function defaultExperimentResults(pool: readonly number[]): {
  sim: ExperimentAnalysis;
  peek: PeekingResult;
} {
  peekCache ??= runPeeking(DEFAULT_PEEK_RUN);
  const key = pool.join(",");
  if (simCache?.key !== key) simCache = { key, result: runSimulation(DEFAULT_SIM_RUN, pool) };
  return { sim: simCache.result, peek: peekCache };
}
