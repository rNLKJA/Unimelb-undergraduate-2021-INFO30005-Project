/**
 * The experiment-analysis calibration (docs/calibration.json, written by
 * `pnpm calibrate`). /methods renders its numbers straight from the file,
 * and the docs tests check that the model card and README quote the same
 * figures, so the published table cannot drift from the script's output.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { CalibrationRow } from "@/lib/experiments/calibrate";
import type { ProportionCI } from "@/lib/stats/proportion";
import { DOCS_DIR } from "./docs";

export interface Calibration {
  command: string;
  design: {
    perArm: number;
    baseline: number;
    plannedEffect: number;
    alpha: number;
    plannedPower: number;
    intervalLevel: number;
    treatmentWindowMinutes: number;
  };
  fulfilmentPool: { size: number; sha256: string; values: number[] };
  rows: CalibrationRow[];
  peeking: {
    reps: number;
    seed: number;
    looks: number;
    perArm: number;
    baseline: number;
    alpha: number;
    fixedHorizon: ProportionCI;
    stopAtFirstSignificantLook: ProportionCI;
    pocock: ProportionCI | null;
    pocockZ: number | null;
  };
}

export function readCalibration(dir: string = DOCS_DIR): Calibration {
  return JSON.parse(readFileSync(path.join(dir, "calibration.json"), "utf8")) as Calibration;
}

const pct1 = (x: number) => `${(100 * x).toFixed(1)}%`;

/** "95.7% (Wilson 95% CI 94.7% to 96.5%)" */
export const shareWithCi = (ci: ProportionCI, withMethod = true) =>
  `${pct1(ci.p)} (${withMethod ? "Wilson 95% CI " : ""}${pct1(ci.lower)} to ${pct1(ci.upper)})`;

/** "+7.97 points (Monte Carlo SE 0.06)" */
export const meanDifferenceText = (row: CalibrationRow) => {
  const points = 100 * row.meanDifference;
  const sign = points > 0.005 ? "+" : points < -0.005 ? "−" : "";
  return `${sign}${Math.abs(points).toFixed(2)} points (Monte Carlo SE ${(100 * row.meanDifferenceMcSe).toFixed(2)})`;
};

/** "seeds 1 to 2,000" */
export const seedRange = (row: CalibrationRow) =>
  `seeds ${row.seeds.first.toLocaleString("en-AU")} to ${row.seeds.last.toLocaleString("en-AU")}`;
