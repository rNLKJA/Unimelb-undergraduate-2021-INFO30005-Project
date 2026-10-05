/**
 * Simulate the late-discount experiment on seeded synthetic customers with
 * a KNOWN injected effect, then analyse it the way a real one would be
 * analysed. Because the truth is known, the page can show whether the
 * analysis recovers it, which a real experiment never can.
 *
 * Generative model (stated on /methods and in docs/model-card.md):
 *  1. 2n synthetic customers are randomised to two arms of exactly n each
 *     (complete randomisation by customer, seeded shuffle).
 *  2. Each customer's first order takes a fulfilment time drawn with
 *     replacement from the pool given (the demo's observed minutes-to-ready),
 *     the same distribution in both arms: the rule changes the promise, not
 *     how fast the van works.
 *  3. The order is discounted when it is ready after the arm's window
 *     (control 15 min, treatment as designed).
 *  4. The primary outcome is Bernoulli(baseline) in control and
 *     Bernoulli(baseline + injected effect) in treatment, independently of
 *     everything else. The injected effect is the true average effect.
 */
import { deriveSeed, mulberry32, shuffleInPlace, standardNormal } from "@/lib/rng";
import {
  exactPermutationTwoProportions,
  permutationTestMeans,
  type PermutationResult,
} from "@/lib/stats/permutation";
import {
  cohensH,
  newcombeDifference,
  twoProportionZTest,
  wilson,
  type DifferenceCI,
  type ProportionCI,
  type ZTestResult,
} from "@/lib/stats/proportion";
import { CONTROL_WINDOW_MINUTES } from "./design";

export type Arm = "control" | "treatment";

export interface SimulationInput {
  perArm: number;
  baseline: number;
  /** True effect injected into the treatment arm (absolute, e.g. 0.08). */
  trueEffect: number;
  treatmentWindow: number;
  seed: number;
  /** Observed fulfilment minutes to resample from; a log-normal stand-in when empty. */
  fulfilmentPool?: readonly number[];
}

export interface SimulatedCustomer {
  id: number;
  arm: Arm;
  fulfilmentMinutes: number;
  discounted: boolean;
  outcome: 0 | 1;
}

/** Stand-in fulfilment times when no observed data is passed: log-normal, median about 11 minutes. */
function syntheticMinutes(random: () => number): number {
  return Math.exp(Math.log(11) + 0.4 * standardNormal(random));
}

export function simulateExperiment(input: SimulationInput): SimulatedCustomer[] {
  const { perArm, baseline, trueEffect, treatmentWindow, seed } = input;
  const pTreatment = baseline + trueEffect;
  if (!(baseline >= 0 && baseline <= 1 && pTreatment >= 0 && pTreatment <= 1)) {
    throw new RangeError("baseline and baseline + effect must be in [0, 1]");
  }
  const pool = input.fulfilmentPool?.filter(Number.isFinite) ?? [];
  // Separate streams for assignment, service times and outcomes, so changing
  // one input does not reshuffle the others.
  const assignRng = mulberry32(deriveSeed(seed, 1));
  const timeRng = mulberry32(deriveSeed(seed, 2));
  const outcomeRng = mulberry32(deriveSeed(seed, 3));

  const arms: Arm[] = [
    ...Array<Arm>(perArm).fill("control"),
    ...Array<Arm>(perArm).fill("treatment"),
  ];
  shuffleInPlace(assignRng, arms);

  return arms.map((arm, id) => {
    const minutes = pool.length
      ? pool[Math.floor(timeRng() * pool.length)]
      : syntheticMinutes(timeRng);
    const window = arm === "control" ? CONTROL_WINDOW_MINUTES : treatmentWindow;
    const p = arm === "control" ? baseline : pTreatment;
    return {
      id,
      arm,
      fulfilmentMinutes: minutes,
      discounted: minutes > window,
      outcome: outcomeRng() < p ? 1 : 0,
    };
  });
}

export interface ArmSummary {
  n: number;
  outcome: ProportionCI;
  discounted: ProportionCI;
}

export interface ExperimentAnalysis {
  control: ArmSummary;
  treatment: ArmSummary;
  /** Treatment minus control, Newcombe interval. */
  difference: DifferenceCI;
  relativeLift: number;
  cohensH: number;
  zTest: ZTestResult;
  permutation: PermutationResult;
  exact: PermutationResult;
  /** Guardrail: change in the share of first orders discounted (cost). */
  discountDifference: DifferenceCI;
  /** Did the 95% interval cover the injected effect? */
  coversTruth: boolean | null;
  trueEffect: number | null;
}

export function analyseExperiment(
  customers: readonly SimulatedCustomer[],
  options: { permutationReps?: number; seed: number; trueEffect?: number },
): ExperimentAnalysis {
  const byArm = (arm: Arm) => customers.filter((c) => c.arm === arm);
  const summarise = (group: readonly SimulatedCustomer[]): ArmSummary => ({
    n: group.length,
    outcome: wilson(
      group.reduce((s, c) => s + c.outcome, 0),
      group.length,
    ),
    discounted: wilson(group.filter((c) => c.discounted).length, group.length),
  });
  const t = byArm("treatment");
  const c = byArm("control");
  const treatment = summarise(t);
  const control = summarise(c);
  const difference = newcombeDifference(
    treatment.outcome.successes,
    treatment.n,
    control.outcome.successes,
    control.n,
  );
  const trueEffect = options.trueEffect ?? null;
  return {
    control,
    treatment,
    difference,
    relativeLift: control.outcome.p > 0 ? difference.estimate / control.outcome.p : NaN,
    cohensH: cohensH(treatment.outcome.p, control.outcome.p),
    zTest: twoProportionZTest(
      treatment.outcome.successes,
      treatment.n,
      control.outcome.successes,
      control.n,
    ),
    permutation: permutationTestMeans(
      t.map((x) => x.outcome),
      c.map((x) => x.outcome),
      { reps: options.permutationReps ?? 5000, seed: options.seed },
    ),
    exact: exactPermutationTwoProportions(
      treatment.outcome.successes,
      treatment.n,
      control.outcome.successes,
      control.n,
    ),
    discountDifference: newcombeDifference(
      treatment.discounted.successes,
      treatment.n,
      control.discounted.successes,
      control.n,
    ),
    coversTruth:
      trueEffect == null ? null : difference.lower <= trueEffect && trueEffect <= difference.upper,
    trueEffect,
  };
}

/** Flat rows for the CSV / JSON export of a simulated experiment's results. */
export function analysisRows(
  analysis: ExperimentAnalysis,
): Record<string, string | number | boolean | null>[] {
  const arm = (name: Arm, s: ArmSummary) => ({
    row: `arm:${name}`,
    n: s.n,
    successes: s.outcome.successes,
    estimate: s.outcome.p,
    ci_lower: s.outcome.lower,
    ci_upper: s.outcome.upper,
    method: "Wilson 95%",
    p_value: null,
  });
  return [
    arm("control", analysis.control),
    arm("treatment", analysis.treatment),
    {
      row: "difference (treatment - control)",
      n: analysis.control.n + analysis.treatment.n,
      successes: null,
      estimate: analysis.difference.estimate,
      ci_lower: analysis.difference.lower,
      ci_upper: analysis.difference.upper,
      method: "Newcombe hybrid score 95%",
      p_value: analysis.zTest.p,
    },
    {
      row: "permutation test",
      n: analysis.control.n + analysis.treatment.n,
      successes: null,
      estimate: analysis.permutation.observed,
      ci_lower: null,
      ci_upper: null,
      method: `Monte Carlo, ${analysis.permutation.reps} relabellings, seed ${analysis.permutation.seed}`,
      p_value: analysis.permutation.p,
    },
    {
      row: "exact permutation test",
      n: analysis.control.n + analysis.treatment.n,
      successes: null,
      estimate: analysis.exact.observed,
      ci_lower: null,
      ci_upper: null,
      method: "hypergeometric enumeration",
      p_value: analysis.exact.p,
    },
    {
      row: "guardrail: discounted share (treatment - control)",
      n: analysis.control.n + analysis.treatment.n,
      successes: null,
      estimate: analysis.discountDifference.estimate,
      ci_lower: analysis.discountDifference.lower,
      ci_upper: analysis.discountDifference.upper,
      method: "Newcombe hybrid score 95%",
      p_value: null,
    },
  ];
}
