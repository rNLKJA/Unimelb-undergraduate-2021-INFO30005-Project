/**
 * Designing an A/B test of the late-order discount rule.
 *
 * The 2021 rule: an order not ready within 15 minutes of being placed gets
 * the late-order discount. The experiment asks whether a stronger promise
 * (a shorter window, so more orders qualify) changes customer behaviour
 * enough to be worth the extra discounts. Customers, not orders, are
 * randomised: a customer sees one rule throughout, and the analysis is per
 * customer, so repeat orders from one person are never counted as
 * independent evidence.
 */
import {
  daysToEnrol,
  sampleSizeTwoMeans,
  sampleSizeTwoProportions,
  sampleSizeTwoProportionsArcsine,
} from "@/lib/stats/power";

export const CONTROL_WINDOW_MINUTES = 15;

export const PRIMARY_METRICS = {
  "repeat-14d": {
    label: "Repeat order within 14 days",
    short: "repeat within 14 days",
    description:
      "Share of customers who place another order within 14 days of their first order in the experiment.",
  },
  "rating-4plus": {
    label: "Rates the first order 4 or 5 stars",
    short: "rating 4+",
    description:
      "Share of customers whose first order in the experiment is rated 4 or 5 stars (a customer who does not rate it counts as 'no', so the metric is defined for everyone randomised).",
  },
} as const;

export type PrimaryMetric = keyof typeof PRIMARY_METRICS;

export interface ExperimentDesign {
  hypothesis: string;
  metric: PrimaryMetric;
  /** Expected control rate of the primary metric. */
  baseline: number;
  /** Smallest absolute change worth detecting (proportion points, e.g. 0.08). */
  mde: number;
  alpha: number;
  power: number;
  /** Late-discount window in the treatment arm, minutes (control stays 15). */
  treatmentWindow: number;
  /** New eligible customers per day, to turn a sample size into a duration. */
  customersPerDay: number;
}

export const DEFAULT_DESIGN: ExperimentDesign = {
  hypothesis:
    "Promising a discount when an order is not ready within 10 minutes (instead of 15) raises the share of customers who order again within 14 days by at least 8 percentage points.",
  metric: "repeat-14d",
  baseline: 0.35,
  mde: 0.08,
  alpha: 0.05,
  power: 0.8,
  treatmentWindow: 10,
  customersPerDay: 40,
};

export interface SampleSizePlan {
  /** Customers per arm (rounded up), pooled-variance z-test formula. */
  perArm: number;
  total: number;
  /** Cross-check: the arcsine (Cohen's h) formula, rounded up. */
  perArmArcsine: number;
  days: number;
  /** The expected treatment rate under the MDE. */
  treatmentRate: number;
}

/**
 * Sample size for a design, or null when the design cannot be planned (see
 * `designErrors`): there is no finite sample size for a zero effect, a rate
 * outside (0, 1) or no customers arriving.
 */
export function planSampleSize(design: ExperimentDesign): SampleSizePlan | null {
  if (designErrors(design).length) return null;
  const base = {
    baseline: design.baseline,
    mde: design.mde,
    alpha: design.alpha,
    power: design.power,
  };
  const perArm = Math.ceil(sampleSizeTwoProportions(base));
  const total = 2 * perArm;
  return {
    perArm,
    total,
    perArmArcsine: Math.ceil(sampleSizeTwoProportionsArcsine(base)),
    days: daysToEnrol(total, design.customersPerDay),
    treatmentRate: design.baseline + design.mde,
  };
}

export interface MeanPlan {
  d: number;
  perArmZ: number;
  perArmT: number;
}

/** Secondary metric (a mean, e.g. rating out of 5): the two-mean formula. */
export function planMeanSampleSize(input: {
  mde: number;
  sd: number;
  alpha: number;
  power: number;
}): MeanPlan {
  const res = sampleSizeTwoMeans(input);
  return { d: res.d, perArmZ: Math.ceil(res.z), perArmT: Math.ceil(res.t) };
}

export type DesignField = "baseline" | "mde" | "per-day" | "window";

export interface DesignError {
  /** Id of the input to highlight. */
  field: DesignField;
  message: string;
}

/** Problems that make a sample size impossible; each names the input to fix. */
export function designErrors(design: ExperimentDesign): DesignError[] {
  const errors: DesignError[] = [];
  const { baseline, mde, customersPerDay, treatmentWindow } = design;
  const baselineOk = Number.isFinite(baseline) && baseline > 0 && baseline < 1;
  if (!baselineOk) {
    errors.push({
      field: "baseline",
      message: "The baseline rate must be between 0% and 100% (exclusive).",
    });
  }
  if (!Number.isFinite(mde) || mde === 0) {
    errors.push({
      field: "mde",
      message:
        "A minimum detectable effect of 0 means there is no effect to detect: no finite sample size can find it.",
    });
  } else if (baselineOk && !(baseline + mde > 0 && baseline + mde < 1)) {
    errors.push({
      field: "mde",
      message: "Baseline plus the minimum detectable effect must stay between 0% and 100%.",
    });
  }
  if (!Number.isFinite(customersPerDay) || customersPerDay <= 0) {
    errors.push({
      field: "per-day",
      message: "New customers per day must be above 0 to turn a sample size into a duration.",
    });
  }
  if (!Number.isFinite(treatmentWindow) || treatmentWindow <= 0) {
    errors.push({
      field: "window",
      message: "The treatment window must be a positive number of minutes.",
    });
  }
  return errors;
}

/** Plain-language concerns about a design that can still be planned, shown next to the inputs. */
export function designWarnings(design: ExperimentDesign): string[] {
  const warnings: string[] = [];
  if (design.treatmentWindow === CONTROL_WINDOW_MINUTES) {
    warnings.push("The treatment window equals the control window: both arms get the same rule.");
  }
  if (design.alpha > 0.1) warnings.push("A significance level above 10% is unusually lenient.");
  if (design.power < 0.8)
    warnings.push("Power below 80% risks missing a real effect of this size.");
  if (design.mde !== 0 && Math.abs(design.mde) < 0.02) {
    warnings.push("Effects under 2 points need very large samples; check the MDE is worth it.");
  }
  return warnings;
}
