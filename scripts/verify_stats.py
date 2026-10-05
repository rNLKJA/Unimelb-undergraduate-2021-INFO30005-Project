"""
Reference values for web/src/lib/stats (Wilson and Newcombe intervals, the
pooled two-proportion z-test, power and sample size, the exact permutation
test). The Vitest suite pins these numbers; rerun this script to check them:

    cd scripts && uv run python verify_stats.py

Kaplan-Meier references come from R instead (verify_km.R).
"""

import itertools
import json
import math

import numpy as np
from scipy import stats
from statsmodels.stats.power import NormalIndPower, TTestIndPower
from statsmodels.stats.proportion import (
    confint_proportions_2indep,
    power_proportions_2indep,
    proportion_confint,
    proportion_effectsize,
    proportions_ztest,
    samplesize_proportions_2indep_onetail,
)

out: dict[str, list] = {}

out["wilson"] = [
    [x, n, *proportion_confint(x, n, alpha=0.05, method="wilson")]
    for x, n in [(144, 160), (0, 10), (10, 10), (7, 20), (37, 49), (3, 41)]
]

out["newcombe"] = []
for x1, n1, x2, n2 in [(56, 70, 48, 80), (9, 10, 3, 10), (310, 600, 262, 600), (0, 20, 3, 20)]:
    lo, hi = confint_proportions_2indep(x1, n1, x2, n2, method="newcomb", compare="diff")
    out["newcombe"].append([x1, n1, x2, n2, lo, hi])

out["ztest"] = []
for x1, n1, x2, n2 in [(56, 70, 48, 80), (310, 600, 262, 600), (45, 120, 40, 118)]:
    z, p = proportions_ztest([x1, x2], [n1, n2])
    out["ztest"].append([x1, n1, x2, n2, float(z), float(p)])

# (baseline p2, diff p1 - p2, alpha, power, ratio n2/n1)
designs = [
    (0.35, 0.08, 0.05, 0.8, 1),
    (0.75, -0.10, 0.05, 0.8, 1),
    (0.20, 0.05, 0.01, 0.9, 1),
    (0.50, 0.10, 0.05, 0.8, 2),
]
out["samplesize_prop"] = []
for p2, diff, alpha, power, ratio in designs:
    n_onetail = samplesize_proportions_2indep_onetail(diff, p2, power, ratio=ratio, alpha=alpha)
    h = proportion_effectsize(p2 + diff, p2)
    n_arcsine = NormalIndPower().solve_power(effect_size=h, alpha=alpha, power=power, ratio=ratio)
    out["samplesize_prop"].append([p2, diff, alpha, power, ratio, float(n_onetail), float(n_arcsine)])

out["power_prop"] = []
for p2, diff, alpha, nobs1, ratio in [(0.35, 0.08, 0.05, 500, 1), (0.2, 0.05, 0.01, 1000, 1), (0.5, -0.1, 0.05, 300, 2)]:
    res = power_proportions_2indep(diff, p2, nobs1, ratio=ratio, alpha=alpha)
    out["power_prop"].append([p2, diff, alpha, nobs1, ratio, float(res.power)])

out["samplesize_means"] = []
for d, alpha, power, ratio in [(0.2, 0.05, 0.8, 1), (0.3, 0.05, 0.9, 1), (0.5, 0.01, 0.8, 1), (0.8, 0.05, 0.8, 1), (0.25, 0.05, 0.8, 2)]:
    nz = NormalIndPower().solve_power(effect_size=d, alpha=alpha, power=power, ratio=ratio)
    nt = TTestIndPower().solve_power(effect_size=d, alpha=alpha, power=power, ratio=ratio)
    out["samplesize_means"].append([d, alpha, power, ratio, float(nz), float(nt)])

# Exact permutation p-value for a difference in proportions, two-sided on |p1 - p2|.
def brute_force(x1, n1, x2, n2):
    labels = [1] * x1 + [0] * (n1 - x1) + [1] * x2 + [0] * (n2 - x2)
    obs = abs(x1 / n1 - x2 / n2)
    extreme = total = 0
    for idx in itertools.combinations(range(n1 + n2), n1):
        s1 = sum(labels[i] for i in idx)
        stat = abs(s1 / n1 - (x1 + x2 - s1) / n2)
        total += 1
        extreme += stat >= obs - 1e-12
    return extreme / total

def via_hypergeom(x1, n1, x2, n2):
    N, K = n1 + n2, x1 + x2
    obs = abs(x1 / n1 - x2 / n2)
    ks = np.arange(max(0, n1 - (N - K)), min(K, n1) + 1)
    stat = np.abs(ks / n1 - (K - ks) / n2)
    return float(stats.hypergeom.pmf(ks[stat >= obs - 1e-12], N, K, n1).sum())

out["exact_permutation"] = []
for case in [(4, 6, 1, 5), (5, 8, 2, 7), (2, 9, 2, 9)]:
    bf, hg = brute_force(*case), via_hypergeom(*case)
    assert math.isclose(bf, hg, rel_tol=1e-12), (case, bf, hg)
    out["exact_permutation"].append([*case, hg])
for case in [(40, 60, 28, 55), (310, 600, 262, 600)]:
    out["exact_permutation"].append([*case, via_hypergeom(*case)])

out["cohens_h"] = [[0.43, 0.35, float(proportion_effectsize(0.43, 0.35))]]

out["hypergeom_pmf"] = [[k, N, K, n, float(stats.hypergeom.pmf(k, N, K, n))] for k, N, K, n in [(3, 20, 7, 12), (0, 50, 10, 5), (68, 115, 68, 60)]]

print(json.dumps(out, indent=1))
