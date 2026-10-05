import { describe, expect, it } from "vitest";
import { sampleSizeTwoProportions } from "@/lib/stats/power";
import { DEFAULT_DESIGN, designWarnings, planMeanSampleSize, planSampleSize } from "./design";
import { simulatePeeking } from "./peeking";
import { analyseExperiment, analysisRows, simulateExperiment } from "./simulate";

const POOL = [4.2, 5.5, 6.1, 7, 8.4, 9, 9.9, 10.5, 11.2, 12, 12.8, 13.5, 14.4, 16, 17.5, 19, 21];

describe("experiment design", () => {
  it("plans the default design with the pooled formula and the arcsine cross-check", () => {
    const plan = planSampleSize(DEFAULT_DESIGN);
    // statsmodels: 582.33 (one-tail pooled) and 582.00 (arcsine) customers per arm.
    expect(plan.perArm).toBe(583);
    expect(plan.perArmArcsine).toBe(583);
    expect(plan.total).toBe(1166);
    expect(plan.days).toBe(30);
    expect(plan.treatmentRate).toBeCloseTo(0.43, 12);
    expect(plan.perArm).toBe(Math.ceil(sampleSizeTwoProportions(DEFAULT_DESIGN)));
  });

  it("plans a secondary mean metric with the two-mean formula", () => {
    // d = 0.2 / 1.0: statsmodels NormalIndPower 392.44, TTestIndPower 393.41.
    expect(planMeanSampleSize({ mde: 0.2, sd: 1, alpha: 0.05, power: 0.8 })).toEqual({
      d: 0.2,
      perArmZ: 393,
      perArmT: 394,
    });
  });

  it("warns about designs that cannot answer the question", () => {
    expect(designWarnings(DEFAULT_DESIGN)).toEqual([]);
    const bad = designWarnings({
      ...DEFAULT_DESIGN,
      baseline: 0.95,
      mde: 0.1,
      treatmentWindow: 15,
      power: 0.5,
    });
    expect(bad).toHaveLength(3);
  });
});

describe("simulated experiment", () => {
  const input = {
    perArm: 400,
    baseline: 0.35,
    trueEffect: 0.08,
    treatmentWindow: 10,
    seed: 2021,
    fulfilmentPool: POOL,
  };

  it("randomises exactly n customers per arm and is reproducible from its seed", () => {
    const a = simulateExperiment(input);
    expect(a).toHaveLength(800);
    expect(a.filter((c) => c.arm === "treatment")).toHaveLength(400);
    expect(simulateExperiment(input)).toEqual(a);
    expect(simulateExperiment({ ...input, seed: 2022 })).not.toEqual(a);
    expect(a.every((c) => POOL.includes(c.fulfilmentMinutes))).toBe(true);
  });

  it("discounts by each arm's window", () => {
    const sim = simulateExperiment(input);
    for (const c of sim) {
      expect(c.discounted).toBe(c.fulfilmentMinutes > (c.arm === "control" ? 15 : 10));
    }
    const res = analyseExperiment(sim, { seed: 1, permutationReps: 200 });
    // Guardrail: the shorter window discounts more first orders.
    expect(res.discountDifference.estimate).toBeGreaterThan(0.2);
  });

  it("analyses with Newcombe, z, permutation and exact tests that agree", () => {
    const sim = simulateExperiment(input);
    const res = analyseExperiment(sim, { seed: 7, permutationReps: 4000, trueEffect: 0.08 });
    expect(res.difference.estimate).toBeCloseTo(
      res.treatment.outcome.p - res.control.outcome.p,
      14,
    );
    expect(res.difference.lower).toBeLessThan(res.difference.estimate);
    expect(Math.abs(res.permutation.p - res.exact.p)).toBeLessThan(0.02);
    expect(Math.abs(res.zTest.p - res.exact.p)).toBeLessThan(0.02);
    expect(res.trueEffect).toBe(0.08);
    expect(typeof res.coversTruth).toBe("boolean");
    const rows = analysisRows(res);
    expect(rows.map((r) => r.row)).toContain("difference (treatment - control)");
    expect(rows).toHaveLength(6);
  });

  it("recovers the injected effect: unbiased, about 95% coverage and the planned power", () => {
    const perArm = Math.ceil(sampleSizeTwoProportions(DEFAULT_DESIGN));
    const reps = 300;
    let sumDiff = 0;
    let covered = 0;
    let rejected = 0;
    for (let r = 0; r < reps; r++) {
      const sim = simulateExperiment({ ...input, perArm, seed: 10_000 + r });
      const res = analyseExperiment(sim, { seed: r, permutationReps: 1, trueEffect: 0.08 });
      sumDiff += res.difference.estimate;
      if (res.coversTruth) covered++;
      if (res.zTest.p < 0.05) rejected++;
    }
    expect(sumDiff / reps).toBeCloseTo(0.08, 2);
    expect(covered / reps).toBeGreaterThan(0.91);
    expect(covered / reps).toBeLessThan(0.99);
    // Planned for 80% power: allow simulation error (SE about 2.3 points at 300 runs).
    expect(rejected / reps).toBeGreaterThan(0.72);
    expect(rejected / reps).toBeLessThan(0.88);
  });

  it("rejects impossible rates", () => {
    expect(() => simulateExperiment({ ...input, baseline: 0.95, trueEffect: 0.1 })).toThrow(
      RangeError,
    );
  });
});

describe("peeking", () => {
  it("inflates false positives under repeated looks; Pocock's boundary restores alpha", () => {
    const res = simulatePeeking({
      perArm: 500,
      baseline: 0.35,
      looks: 10,
      reps: 3000,
      alpha: 0.05,
      seed: 99,
    });
    expect(res.fixedHorizon.lower).toBeLessThan(0.05);
    expect(res.fixedHorizon.upper).toBeGreaterThan(0.05);
    // Ten looks at alpha = 0.05 give roughly a 19% false-positive rate (Armitage et al., 1969).
    expect(res.peeking.p).toBeGreaterThan(0.14);
    expect(res.peeking.p).toBeLessThan(0.24);
    expect(res.pocockZ).toBe(2.555);
    expect(Math.abs((res.pocock?.p ?? 0) - 0.05)).toBeLessThan(0.015);
    expect(res.firstRejectionAtLook.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(
      simulatePeeking({ perArm: 50, baseline: 0.3, looks: 3, reps: 50, alpha: 0.05, seed: 1 }),
    ).toEqual(
      simulatePeeking({ perArm: 50, baseline: 0.3, looks: 3, reps: 50, alpha: 0.05, seed: 1 }),
    );
  });

  it("has no Pocock constant for other alphas", () => {
    const res = simulatePeeking({
      perArm: 20,
      baseline: 0.3,
      looks: 2,
      reps: 10,
      alpha: 0.01,
      seed: 1,
    });
    expect(res.pocock).toBeNull();
    expect(() =>
      simulatePeeking({ perArm: 20, baseline: 0.3, looks: 0, reps: 10, alpha: 0.05, seed: 1 }),
    ).toThrow();
  });
});
