/**
 * Reference values were computed with statsmodels 0.15.0 / scipy 1.18.1
 * (`cd scripts && uv run python verify_stats.py`) and R 4.6.1 with survival
 * (`Rscript scripts/verify_km.R`). See "Verifying the statistics" in the
 * README.
 */
import { describe, expect, it } from "vitest";
import { bootstrap, bootstrapMedian, bootstrapQuantile, percentileInterval } from "./bootstrap";
import { mean, median, quantile, sd, variance } from "./descriptive";
import { formatInterval, formatP, formatPct, formatPctInterval, formatSigned } from "./format";
import { normalCdf, normalQuantile, normalSf, zCritical } from "./normal";
import {
  exactPermutationTwoProportions,
  hypergeometricPmf,
  permutationTestMeans,
} from "./permutation";
import {
  daysToEnrol,
  powerTwoProportions,
  sampleSizeTwoMeans,
  sampleSizeTwoProportions,
  sampleSizeTwoProportionsArcsine,
} from "./power";
import { cohensH, newcombeDifference, twoProportionZTest, wilson } from "./proportion";
import { kaplanMeier, kmQuantile, survivalAt } from "./survival";

describe("normal distribution", () => {
  it("matches scipy.stats.norm", () => {
    expect(normalCdf(1.2345)).toBeCloseTo(0.8914916766373298, 14);
    expect(normalQuantile(0.975)).toBeCloseTo(1.959963984540054, 12);
    expect(normalQuantile(0.8)).toBeCloseTo(0.8416212335729143, 12);
    expect(normalSf(3.5) / 0.00023262907903552502).toBeCloseTo(1, 12);
    expect(zCritical(0.99)).toBeCloseTo(2.5758293035489004, 12);
  });

  it("round-trips quantiles", () => {
    for (const p of [1e-8, 0.01, 0.3, 0.5, 0.77, 0.999999]) {
      expect(normalCdf(normalQuantile(p)) / p).toBeCloseTo(1, 10);
    }
  });
});

describe("descriptive statistics", () => {
  const a = [3.1, 0.2, 5.5, 2.2, 9.9, 4.4, 1.0];

  it("matches numpy (ddof = 1) and R type-7 quantiles", () => {
    expect(variance(a)).toBeCloseTo(10.716190476190476, 12);
    expect(sd(a)).toBeCloseTo(3.2735592977965857, 12);
    const expected = [0.32, 1.6, 3.1, 7.26, 9.24];
    [0.025, 0.25, 0.5, 0.9, 0.975].forEach((p, i) =>
      expect(quantile(a, p)).toBeCloseTo(expected[i], 12),
    );
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(mean([])).toBeNaN();
  });
});

describe("Wilson score interval", () => {
  // statsmodels proportion_confint(method="wilson")
  it.each([
    [144, 160, 0.8437374796961266, 0.9375055641666694],
    [0, 10, 0.0, 0.27753279986288926],
    [10, 10, 0.7224672001371106, 1.0],
    [7, 20, 0.18119182410108203, 0.5671457233147638],
    [37, 49, 0.6191368101239605, 0.8539765474166023],
    [3, 41, 0.025197830633909943, 0.19427448537719044],
  ])("%i / %i", (x, n, lo, hi) => {
    const ci = wilson(x, n);
    expect(ci.p).toBeCloseTo(x / n, 15);
    expect(ci.lower).toBeCloseTo(lo, 12);
    expect(ci.upper).toBeCloseTo(hi, 12);
  });

  it("rejects impossible counts and reports n = 0 as uninformative", () => {
    expect(() => wilson(5, 4)).toThrow(RangeError);
    expect(() => wilson(1.5, 4)).toThrow(RangeError);
    const empty = wilson(0, 0);
    expect(empty.p).toBeNaN();
    expect([empty.lower, empty.upper]).toEqual([0, 1]);
  });
});

describe("difference of two proportions", () => {
  // statsmodels confint_proportions_2indep(method="newcomb", compare="diff")
  it.each([
    [56, 70, 48, 80, 0.05243147240236498, 0.33387265403690614],
    [9, 10, 3, 10, 0.1705227239345029, 0.809017973535488],
    [310, 600, 262, 600, 0.023482356289814238, 0.13579948039334777],
    [0, 20, 3, 20, -0.36041886474075696, 0.0383963331262675],
  ])("Newcombe %i/%i vs %i/%i", (x1, n1, x2, n2, lo, hi) => {
    const ci = newcombeDifference(x1, n1, x2, n2);
    expect(ci.estimate).toBeCloseTo(x1 / n1 - x2 / n2, 14);
    expect(ci.lower).toBeCloseTo(lo, 12);
    expect(ci.upper).toBeCloseTo(hi, 12);
  });

  // statsmodels proportions_ztest([x1, x2], [n1, n2])
  it.each([
    [56, 70, 48, 80, 2.6501719512585336, 0.008045081368196563],
    [310, 600, 262, 600, 2.774303847254161, 0.005531998328701043],
    [45, 120, 40, 118, 0.5797915074321077, 0.5620552253221283],
  ])("pooled z-test %i/%i vs %i/%i", (x1, n1, x2, n2, z, p) => {
    const res = twoProportionZTest(x1, n1, x2, n2);
    expect(res.z).toBeCloseTo(z, 12);
    expect(res.p).toBeCloseTo(p, 12);
  });

  it("computes Cohen's h (statsmodels proportion_effectsize)", () => {
    expect(cohensH(0.43, 0.35)).toBeCloseTo(0.16423123930554184, 12);
    expect(cohensH(0.5, 0.5)).toBe(0);
  });
});

describe("power and sample size", () => {
  // statsmodels samplesize_proportions_2indep_onetail and
  // NormalIndPower().solve_power(proportion_effectsize(p1, p2), ...)
  it.each([
    [0.35, 0.08, 0.05, 0.8, 1, 582.3348245070015, 582.0027895597051],
    [0.75, -0.1, 0.05, 0.8, 1, 328.47154263471646, 327.58257577140745],
    [0.2, 0.05, 0.01, 0.9, 1, 2073.20131223922, 2069.9496006092377],
    [0.5, 0.1, 0.05, 0.8, 2, 291.0521910311801, 290.37580962046985],
  ])("two proportions: baseline %f, mde %f", (baseline, mde, alpha, power, ratio, n, nArc) => {
    const design = { baseline, mde, alpha, power, ratio };
    expect(sampleSizeTwoProportions(design)).toBeCloseTo(n, 6);
    expect(sampleSizeTwoProportionsArcsine(design)).toBeCloseTo(nArc, 4);
  });

  // statsmodels power_proportions_2indep(diff, prop2, nobs1, ratio, alpha).power
  it.each([
    [0.35, 0.08, 0.05, 500, 1, 0.7374631856943865],
    [0.2, 0.05, 0.01, 1000, 1, 0.5405229000837939],
    [0.5, -0.1, 0.05, 300, 2, 0.8118411658861983],
  ])("power of the z-test: baseline %f, mde %f, n1 %i", (baseline, mde, alpha, n1, ratio, pw) => {
    expect(powerTwoProportions({ baseline, mde, alpha, ratio }, n1)).toBeCloseTo(pw, 12);
  });

  it("gives at least the requested power at the computed sample size", () => {
    const design = { baseline: 0.35, mde: 0.08, alpha: 0.05, power: 0.8 };
    const n = Math.ceil(sampleSizeTwoProportions(design));
    expect(powerTwoProportions(design, n)).toBeGreaterThanOrEqual(0.8);
    expect(powerTwoProportions(design, n - 5)).toBeLessThan(0.8);
  });

  // NormalIndPower / TTestIndPower().solve_power(effect_size=d, ...)
  it.each([
    [0.2, 0.05, 0.8, 1, 392.4430232577885, 393.4056930002527],
    [0.3, 0.05, 0.9, 1, 233.4982091044067, 234.46274235072315],
    [0.5, 0.01, 0.8, 1, 93.43174691371422, 95.10361789235006],
    [0.8, 0.05, 0.8, 1, 24.527689095731237, 25.524571854446116],
    [0.25, 0.05, 0.8, 2, 188.3726522539174, 189.0150290532667],
  ])("two means: d = %f", (d, alpha, power, ratio, nz, nt) => {
    const res = sampleSizeTwoMeans({ mde: d * 3, sd: 3, alpha, power, ratio });
    expect(res.d).toBeCloseTo(d, 14);
    expect(res.z).toBeCloseTo(nz, 5);
    // Guenther's correction stands in for the noncentral t: same whole number after rounding up.
    expect(Math.ceil(res.t)).toBe(Math.ceil(nt));
    expect(Math.abs(res.t - nt)).toBeLessThan(0.1);
  });

  it("validates inputs and converts enrolment to days", () => {
    expect(() =>
      sampleSizeTwoProportions({ baseline: 0.95, mde: 0.1, alpha: 0.05, power: 0.8 }),
    ).toThrow(RangeError);
    expect(() => sampleSizeTwoMeans({ mde: 1, sd: 0, alpha: 0.05, power: 0.8 })).toThrow();
    expect(sampleSizeTwoProportions({ baseline: 0.3, mde: 0, alpha: 0.05, power: 0.8 })).toBe(
      Infinity,
    );
    expect(daysToEnrol(1165, 40)).toBe(30);
    expect(daysToEnrol(10, 0)).toBe(Infinity);
  });
});

describe("permutation tests", () => {
  // scipy.stats.hypergeom.pmf
  it.each([
    [3, 20, 7, 12, 0.19865841073271417],
    [0, 50, 10, 5, 0.3105627820045687],
    [68, 115, 68, 60, 0],
  ])("hypergeometric pmf(%i; N=%i, K=%i, n=%i)", (k, N, K, n, p) => {
    expect(hypergeometricPmf(k, N, K, n)).toBeCloseTo(p, 13);
  });

  // Brute-force enumeration of every relabelling (small cases) and
  // scipy.stats.hypergeom (larger ones), two-sided on |p1 - p2|.
  it.each([
    [4, 6, 1, 5, 0.24242424242424238],
    [5, 8, 2, 7, 0.3146853146853147],
    [2, 9, 2, 9, 1],
    [40, 60, 28, 55, 0.09223025699979924],
    [310, 600, 262, 600, 0.006573314033215156],
  ])("exact test %i/%i vs %i/%i", (x1, n1, x2, n2, p) => {
    const res = exactPermutationTwoProportions(x1, n1, x2, n2);
    expect(res.p).toBeCloseTo(p, 12);
    expect(res.method).toBe("exact");
  });

  it("Monte Carlo agrees with the exact test within simulation error, and is seeded", () => {
    const x = [...Array(40).fill(1), ...Array(20).fill(0)];
    const y = [...Array(28).fill(1), ...Array(27).fill(0)];
    const mc = permutationTestMeans(x, y, { reps: 20000, seed: 7 });
    const exact = exactPermutationTwoProportions(40, 60, 28, 55).p;
    // 4 Monte Carlo standard errors.
    expect(Math.abs(mc.p - exact)).toBeLessThan(4 * Math.sqrt((exact * (1 - exact)) / 20000));
    expect(permutationTestMeans(x, y, { reps: 500, seed: 7 })).toEqual(
      permutationTestMeans(x, y, { reps: 500, seed: 7 }),
    );
    expect(mc.observed).toBeCloseTo(40 / 60 - 28 / 55, 14);
  });

  it("never reports p = 0", () => {
    const res = permutationTestMeans(Array(50).fill(1), Array(50).fill(0), { reps: 999, seed: 1 });
    expect(res.p).toBe(1 / 1000);
  });
});

describe("bootstrap", () => {
  const xs = [4.5, 6, 6, 7.2, 8, 9.5, 9.5, 11, 12, 12, 13.4, 15, 16.2, 18, 21];

  it("is reproducible from its seed and brackets the estimate", () => {
    const a = bootstrapMedian(xs, { seed: 4399, reps: 1000 });
    const b = bootstrapMedian(xs, { seed: 4399, reps: 1000 });
    expect(a).toEqual(b);
    expect(a.estimate).toBe(11);
    expect(a.lower).toBeLessThanOrEqual(a.estimate);
    expect(a.upper).toBeGreaterThanOrEqual(a.estimate);
    expect(a.n).toBe(xs.length);
    expect(bootstrapMedian(xs, { seed: 1, reps: 1000 })).not.toEqual(a);
  });

  it("takes type-7 percentiles of the replicates", () => {
    expect(percentileInterval([5, 1, 4, 2, 3], 0.5)).toEqual({ lower: 2, upper: 4 });
    expect(percentileInterval([], 0.95).lower).toBeNaN();
  });

  it("handles empty samples and other quantiles", () => {
    expect(bootstrap([], mean, { seed: 1 }).estimate).toBeNaN();
    const p90 = bootstrapQuantile(xs, 0.9, { seed: 2, reps: 500 });
    expect(p90.estimate).toBeCloseTo(quantile(xs, 0.9), 12);
    expect(p90.lower).toBeLessThanOrEqual(p90.upper);
  });
});

describe("Kaplan–Meier", () => {
  // R: survfit(Surv(time, event) ~ 1, conf.type = "log-log")
  const time = [4.5, 6, 6, 7.2, 8, 9.5, 9.5, 11, 12, 12, 13.4, 15, 16.2, 18, 21, 3, 9.5, 14, 25];
  const event = [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0].map(Boolean);
  const R = [
    // time, n.risk, n.event, n.censor, surv, std.err, lower, upper
    [3, 19, 0, 1, 1, 0, 1, 1],
    [4.5, 18, 1, 0, 0.944444444444444, 0.057166195047503, 0.66639016833533, 0.991982923674006],
    [6, 17, 2, 0, 0.833333333333333, 0.105409255338946, 0.56768551868069, 0.942979741578936],
    [7.2, 15, 1, 0, 0.777777777777778, 0.125988157669742, 0.511026052868332, 0.910210250680365],
    [8, 14, 0, 1, 0.777777777777778, 0.125988157669742, 0.511026052868332, 0.910210250680365],
    [9.5, 13, 2, 1, 0.658119658119658, 0.1727976558262, 0.390627250838016, 0.83010408279141],
    [11, 10, 1, 0, 0.592307692307692, 0.202410822265364, 0.327238312165085, 0.78227669423545],
    [12, 9, 1, 1, 0.526495726495726, 0.234220045809555, 0.269240304095712, 0.730785015790966],
    [13.4, 7, 1, 0, 0.451282051282051, 0.280479150149443, 0.204381942648855, 0.671176223406971],
    [14, 6, 0, 1, 0.451282051282051, 0.280479150149443, 0.204381942648855, 0.671176223406971],
    [15, 5, 1, 0, 0.361025641025641, 0.358703991709813, 0.13115825650116, 0.599911301045631],
    [16.2, 4, 1, 0, 0.270769230769231, 0.460436626477398, 0.073778694977807, 0.519535131384512],
    [18, 3, 1, 0, 0.18051282051282, 0.615360507075774, 0.031334794571016, 0.428996116222274],
    [21, 2, 1, 0, 0.09025641025641, 0.937373220050879, 0.005725745274212, 0.326141248717956],
    [25, 1, 0, 1, 0.09025641025641, 0.937373220050879, 0.005725745274212, 0.326141248717956],
  ];

  it("matches survival::survfit step by step", () => {
    const km = kaplanMeier(time, event);
    expect(km.n).toBe(19);
    expect(km.events).toBe(13);
    expect(km.censored).toBe(6);
    expect(km.steps).toHaveLength(R.length);
    km.steps.forEach((s, i) => {
      const [t, risk, ev, cens, surv, se, lo, hi] = R[i];
      expect([s.time, s.nRisk, s.nEvent, s.nCensor]).toEqual([t, risk, ev, cens]);
      expect(s.survival).toBeCloseTo(surv, 13);
      expect(s.stdErrLog).toBeCloseTo(se, 13);
      expect(s.lower).toBeCloseTo(lo, 12);
      expect(s.upper).toBeCloseTo(hi, 12);
    });
    expect(kmQuantile(km)).toBe(13.4);
  });

  it("matches the aml (maintained) example and its median", () => {
    const t = [9, 13, 13, 18, 23, 28, 31, 34, 45, 48, 161];
    const e = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0].map(Boolean);
    const km = kaplanMeier(t, e);
    expect(km.steps.map((s) => s.survival)).toEqual(
      [
        0.909090909090909, 0.818181818181818, 0.715909090909091, 0.613636363636364,
        0.613636363636364, 0.490909090909091, 0.368181818181818, 0.368181818181818,
        0.184090909090909, 0.184090909090909,
      ].map((v) => expect.closeTo(v, 13)),
    );
    expect(km.steps[8].lower).toBeCloseTo(0.01173848012319, 12);
    expect(km.steps[8].upper).toBeCloseTo(0.525014842726641, 12);
    expect(kmQuantile(km)).toBe(31);
  });

  it("reads the curve at a time, and handles edge cases", () => {
    const km = kaplanMeier(time, event);
    expect(survivalAt(km, 2)).toEqual({ survival: 1, lower: 1, upper: 1 });
    expect(survivalAt(km, 15.5).survival).toBeCloseTo(0.361025641025641, 13);
    // Curve sits exactly at 0.5 between 2 and 3: R reports the midpoint.
    expect(kmQuantile(kaplanMeier([1, 2, 3, 4], [true, true, true, true]))).toBe(2.5);
    const all = kaplanMeier([1, 2], [true, true]);
    expect(all.steps[1].survival).toBe(0);
    expect(all.steps[1].lower).toBeNaN();
    expect(kmQuantile(kaplanMeier([5, 6], [false, false]))).toBeNaN();
    expect(() => kaplanMeier([1], [])).toThrow(RangeError);
  });
});

describe("formatting", () => {
  it("formats estimates, intervals and p-values", () => {
    expect(formatPct(0.4567)).toBe("45.7%");
    expect(formatPctInterval(0.1, 0.25, 0)).toBe("[10%, 25%]");
    expect(formatSigned(-2.5)).toBe("−2.5");
    expect(formatSigned(3)).toBe("+3.0");
    expect(formatInterval(-1.25, 4.5)).toBe("[−1.3, 4.5]");
    expect(formatP(0.0004)).toBe("< 0.001");
    expect(formatP(0.0412)).toBe("0.041");
  });
});
