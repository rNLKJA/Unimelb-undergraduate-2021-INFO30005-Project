# DR-005: Treat housekeeping close-outs as censored, not as observed ready times

- **Decision:** flag every order that demo housekeeping closes out before anyone marked it ready (`orders.fulfilment_imputed`, with `closed_out_at`), leave its invented ready time out of every fulfilment figure, treat it as right-censored at its age when it was closed out in the Kaplan–Meier curve, and say on `/admin/analytics` how many were excluded.
- **Status:** accepted on 6 October 2026, after an independent review of the 2026 upgrade.
- **Supersedes:** nothing. It changes how the 2026 analytics read the revival's demo housekeeping, which keeps working as before.

## Context

The revival added demo housekeeping: at a one-click demo login, any demo order still active after 90 minutes is closed out "as if served on time". To keep the order screens coherent it writes a ready time of start + 12 minutes and a collection time after that. Before the 2026 upgrade nothing read those times as data.

The 2026 analytics do. Minutes to ready, the late-discount rate by van, the Kaplan–Meier time-to-fulfil curve and the experiment simulation's resampling pool all treated every `fulfilled_time` as an observation. The /methods page meanwhile said open orders are "censored at their current age, not as finished". The two did not agree.

## Decision

- Migration 0003 adds `fulfilment_imputed` (boolean) and `closed_out_at` (timestamp) to `orders`. Housekeeping sets `closed_out_at` on every order it closes and `fulfilment_imputed` when it had to invent the ready time. The audit trail entry records the same flag.
- `fulfilmentMinutes`, `lateRateByVan` and the experiment's fulfilment pool skip imputed rows. The vendor's day tiles and the AI shift summary treat an imputed ready time as unknown.
- `timeToFulfil` counts an imputed order as censored at `closed_out_at − start`: all we know is that it was not ready by then.
- `/admin/analytics` and the model card state the number excluded.

## Options considered

1. **Leave it** and note the bias. Cheap, but every demo login on a persistent database adds fake observations, and the page gives no sign of it.
2. **Exclude imputed orders entirely**, like cancellations. Simple, but throws away a fact: the order was not ready for at least 90 minutes.
3. **Flag, exclude the invented time, censor at close-out** (chosen). Keeps the screens coherent and the statistics honest.
4. **Stop inventing times** and give abandoned orders their own status. Cleanest, but changes the ported order states and every screen that shows them.

## Why

An invented value presented as an observation is the kind of error that survives because the numbers still look plausible. Censoring is the standard treatment for "the event had not happened when we stopped watching", it is what the methods page already promised, and the flag makes the rule testable.

## What happened

- The review reproduced the problem in a temporary in-memory test: seed, then 20 demo logins 100 minutes apart. Afterwards 38 of 207 served orders had exactly 12.0 minutes to ready, the Kaplan–Meier curve had 38 events at t = 12, and the overall late-discount rate had fallen from 47/149 = 31.5% to 47/207 = 22.7%, with nothing on screen to explain it.
- The committed snapshot contains no closed-out orders, so the figures published so far (31.5%, Wilson 95% CI 24.6% to 39.4%, n = 149) were not affected. Any persistent database (a local `data/app.db`, or Turso later) would have drifted.
- After the fix, the same scenario adds no 12-minute observations and no events at 12 minutes; `integration.test.ts` keeps it that way.
- The honest version has a visible cost. Abandoned demo orders stay "at risk" for 90 minutes or more, so on a database with many of them the Kaplan–Meier share ready by 15 minutes falls. That is the correct reading (those orders were not ready), but in the demo it measures how often visitors leave orders behind, not how fast a van works.

## What I'd change

- Give abandoned orders their own state instead of a made-up ready time, so no screen ever shows a time that did not happen.
- Model abandonment and cancellation as competing risks (cumulative incidence) rather than censoring one and dropping the other.
- Keep simulated demo traffic in a separate flag from real orders, so analytics can be shown with and without it.
