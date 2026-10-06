/**
 * The two simulations behind /admin/experiments, as plain functions of their
 * inputs, so the same code runs on the server (the default results are
 * rendered there, once), in a Web Worker (reruns, so the page never freezes)
 * and in the calibration script. Every input that changes a result is part
 * of the run, including the seed.
 */
import { DEFAULT_DESIGN, planSampleSize, type ExperimentDesign } from "./design";
import { PEEKING_MAX_PER_ARM, simulatePeeking, type PeekingResult } from "./peeking";
import { analyseExperiment, simulateExperiment, type ExperimentAnalysis } from "./simulate";

export const DEFAULT_SIM_SEED = 2021;
export const PERMUTATION_REPS = 5000;
export const PEEKING_REPS = 10_000;
export const PEEKING_SEED = 30005;
/** Pocock's constants are tabulated for two-sided α = 0.05 only. */
export const PEEKING_ALPHA = 0.05;
/** Largest simulated experiment the designer will run, customers per arm. */
export const SIM_MAX_PER_ARM = 20_000;

export interface SimRun {
  design: ExperimentDesign;
  /** Injected true effect (absolute). */
  effect: number;
  perArm: number;
  seed: number;
}

export interface PeekRun {
  looks: number;
  /** Planned customers per arm; capped at PEEKING_MAX_PER_ARM when simulated. */
  perArm: number;
  baseline: number;
}

export const DEFAULT_SIM_RUN: SimRun = {
  design: DEFAULT_DESIGN,
  effect: DEFAULT_DESIGN.mde,
  perArm: planSampleSize(DEFAULT_DESIGN)?.perArm ?? 583,
  seed: DEFAULT_SIM_SEED,
};

export const DEFAULT_PEEK_RUN: PeekRun = {
  looks: 10,
  perArm: DEFAULT_SIM_RUN.perArm,
  baseline: DEFAULT_DESIGN.baseline,
};

/** Simulate one experiment with a known effect and analyse it at level 1 − α. */
export function runSimulation(run: SimRun, pool: readonly number[]): ExperimentAnalysis {
  const customers = simulateExperiment({
    perArm: run.perArm,
    baseline: run.design.baseline,
    trueEffect: run.effect,
    treatmentWindow: run.design.treatmentWindow,
    seed: run.seed,
    fulfilmentPool: pool,
  });
  return analyseExperiment(customers, {
    seed: run.seed,
    permutationReps: PERMUTATION_REPS,
    trueEffect: run.effect,
    level: 1 - run.design.alpha,
  });
}

/** The customers per arm the peeking simulation actually uses. */
export const peekingPerArm = (run: PeekRun) => Math.min(run.perArm, PEEKING_MAX_PER_ARM);

/** Many A/A experiments analysed at `looks` interim looks (seeded, α = 0.05). */
export function runPeeking(run: PeekRun): PeekingResult {
  return simulatePeeking({
    perArm: peekingPerArm(run),
    baseline: run.baseline,
    looks: run.looks,
    reps: PEEKING_REPS,
    alpha: PEEKING_ALPHA,
    seed: PEEKING_SEED,
  });
}

/** Messages to and from the experiments Web Worker. */
export type WorkerRequest =
  | { id: number; kind: "sim"; run: SimRun; pool: readonly number[] }
  | { id: number; kind: "peek"; run: PeekRun };

export type WorkerResponse =
  | { id: number; ok: true; kind: "sim"; result: ExperimentAnalysis }
  | { id: number; ok: true; kind: "peek"; result: PeekingResult }
  | { id: number; ok: false; message: string };

/** What the worker does with a request (also the fallback when Workers are unavailable). */
export function handleWorkerRequest(req: WorkerRequest): WorkerResponse {
  try {
    return req.kind === "sim"
      ? { id: req.id, ok: true, kind: "sim", result: runSimulation(req.run, req.pool) }
      : { id: req.id, ok: true, kind: "peek", result: runPeeking(req.run) };
  } catch (error) {
    return {
      id: req.id,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
