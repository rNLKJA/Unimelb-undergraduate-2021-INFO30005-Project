# Model and data card

Snacks in a Van trains no machine-learning model. What it does contain are three things a reader should be able to judge the same way: a synthetic data generator, a set of statistical estimators shown on the analytics page, and a simulation model behind the experiment designer. It also calls an optional third-party language model (covered in the [AI use statement](ai-use-statement.md)). This card describes each of them.

## Intended use

- **Demo data generator** (`web/src/db/seed.ts`, PRNG seed 4399): to give the public demo a believable three-week history, so the portals, the records area and the analytics have something to show.
- **Operations analytics** (`/admin/analytics`): to demonstrate how a van operator should read their own numbers, with uncertainty: orders per day, minutes from order to ready, the late-discount rate by van and a Kaplan–Meier time-to-fulfil curve.
- **Experiment designer and simulation** (`/admin/experiments`): to plan an A/B test of the 15-minute late-discount rule and rehearse its analysis on synthetic customers with a known effect.

## Not intended for

- Any conclusion about real vans, crews or customers. Every customer, van and order in the demo is synthetic.
- Ranking crews or vans for performance management. The per-van samples are small and the data is generated.
- Deciding the discount rule. The designer plans a test; it does not run one on real people.

## Data provenance

| Data | Source | Notes |
| --- | --- | --- |
| Menu (8 items, prices) | Recovered from a page the 2021 app rendered (`coursework/Mockup 2/Customer Task 1 output.html`) | Descriptions and illustrations are new |
| Van names (15) | The team's 2021 vendor list, names only | Locations are public landmarks; passwords are fresh bcrypt demo values |
| Customers (10) | Synthetic, reserved example domains | No real person |
| Orders (174), ratings (87), posts | Generated with seed 4399 over 21 days, using the app's own pricing and order-id code | Minutes to ready drawn uniformly from 4 to 21; each order cancelled with probability 0.12 (25 of 174 in the snapshot); ratings drawn from {5, 5, 5, 4, 4, 4, 3, 2} for 60% of collected orders |
| Live rows | Whatever visitors do on a given server | Locally they persist in `data/app.db`; in production they are lost when an instance recycles ([DR-004](decisions/DR-004-turso-vs-tmp-fallback.md)) |

Because the generator draws minutes to ready uniformly between 4 and 21, about 35% of served orders are late by construction. The analytics recover that (31.5%, Wilson 95% CI 24.6% to 39.4%, n = 149 in the committed snapshot), which checks the pipeline but says nothing about real vans.

## Methods and evaluation

Every statistical helper lives in `web/src/lib/stats/` and is unit-tested against reference values computed outside the app (`scripts/verify_stats.py` with statsmodels 0.15.0 and scipy 1.18.1 via uv; `scripts/verify_km.R` with R 4.6.1 and survival).

| Estimator | Used for | Verified against | Agreement |
| --- | --- | --- | --- |
| Wilson score interval | every rate | statsmodels `proportion_confint(method="wilson")` | 12 decimal places |
| Newcombe hybrid score interval | difference of two rates | statsmodels `confint_proportions_2indep(method="newcomb")` | 12 decimal places |
| Pooled two-proportion z-test | experiment analysis | statsmodels `proportions_ztest` | 12 decimal places |
| Sample size, two proportions | experiment design | statsmodels `samplesize_proportions_2indep_onetail`, and `NormalIndPower` with Cohen's h as a cross-check | 6 and 4 decimal places |
| Power, two proportions | experiment design | statsmodels `power_proportions_2indep` | 12 decimal places |
| Sample size, two means | secondary metric | statsmodels `NormalIndPower` (exact) and `TTestIndPower` (Guenther's correction, same whole number) | 5 decimal places; same rounded-up n |
| Exact permutation test (binary outcome) | experiment analysis | brute-force enumeration in Python and scipy `hypergeom` | 12 decimal places |
| Monte Carlo permutation test | experiment analysis | the exact test | within 4 Monte Carlo standard errors |
| Kaplan–Meier, Greenwood SE, log-log CI | time to fulfil | R `survfit(..., conf.type = "log-log")` | 12 decimal places, every step |
| Percentile bootstrap | medians, 90th percentile, mean per day | determinism and bracketing tests | seeded (4399), 2,000 resamples |

The experiment simulation was checked by running it many times with known truth (2,000 simulated experiments per row, 583 customers per arm, baseline 35%):

| Injected effect | Mean estimated difference | 95% interval covers the truth | Rejects H0 at α = 0.05 |
| --- | --- | --- | --- |
| +8 points | +7.95 points (± 0.13) | 94.9% (Wilson 95% CI 93.8% to 95.7%) | 79.8% (77.9% to 81.5%); planned power 80% |
| 0 (A/A) | −0.05 points (± 0.12) | 94.9% (93.8% to 95.8%) | 5.1% (4.2% to 6.2%); nominal 5% |

The peeking panel's simulation (10,000 A/A experiments, seed 30005) gives the textbook pattern: looking once keeps the false-positive rate at 4.7% (4.3% to 5.1%), stopping at the first p < 0.05 over 10 looks raises it to 19.6% (18.8% to 20.4%), and Pocock's boundary brings it back to 5.0% (4.6% to 5.5%).

## Simulation model assumptions

1. Customers are randomised one to one, by customer, with a seeded shuffle.
2. Minutes to ready are resampled from the demo's served orders and are the same in both arms: the rule changes the promise, not the crew's speed.
3. The primary outcome is Bernoulli with probability `baseline` in control and `baseline + effect` in treatment, independent of everything else. Real customers are not independent coin flips: the same weather, events and word of mouth affect both arms, and returning behaviour depends on what happened on the visit.
4. Each customer contributes one first order; there is no interference between customers and no novelty effect.

## Known failure modes

- **Small samples.** Per-van rates rest on 4 to 44 orders; Wilson intervals are wide and the forest plot is there to show that, not to rank vans.
- **Synthetic history.** Patterns in the demo data are properties of the generator (for example the uniform 4 to 21 minute service time), not findings.
- **Censoring and competing outcomes.** The Kaplan–Meier curve treats open orders as censored and leaves cancelled orders out. If cancellations happen because an order is slow, the curve looks better than the customer's experience.
- **Baselines.** The repeat-order baseline is an assumption: 10 synthetic customers cannot estimate it. A wrong baseline gives a wrong sample size.
- **The percentile bootstrap on small samples** (for example the mean orders per day over 20 days) tends to give intervals that are slightly too narrow.
- **Production storage.** Until Turso is connected, live rows on the public site are per instance and temporary, so the live analytics there mostly reflect the seed.

## Ethical considerations

- No real personal data is used anywhere; demo accounts use reserved example domains and every form warns visitors not to enter real details.
- A real version of this experiment would randomise people into different promises. That needs a clear notice to customers, a cap on how long a worse arm can run, and a guardrail on cost and complaints, decided before launch.
- Per-van analytics could be misused to judge individual workers. The page states the sample sizes and intervals precisely so that differences inside the noise are not treated as performance.
