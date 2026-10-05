# DR-003: Port the 15-minute late-discount rule with three deliberate fixes

- **Decision:** port the 15-minute late-order discount rule as framework-free TypeScript with parity tests against the original JavaScript, and fix three things on purpose: the flag is set automatically on the server, the deadline is a real instant, and the customer's ring flips at 15:00 together with the discount badge.
- **Status:** accepted on 6 October 2026, during the revival (recorded on 6 October 2026, after the fact).
- **Supersedes:** nothing.

## Context

The rule is the business's promise: an order that is not ready within 15 minutes of being placed gets a late-order discount. In 2021 it was spread across four places:

- `utility.discountTime()` stored the deadline as an `"H:M:S"` string, start time plus 15 minutes, after a fixed +10 hour UTC to Melbourne shift that ignored daylight saving.
- The customer's order page counted up and switched to "Over Time, your discount apply" once the elapsed minutes exceeded 15, that is at 16:00.
- The vendor board showed "N Minutes Remaining" and then "This Order is Overdue".
- `markOrderAsDiscounted` existed in the vendor controller, but the browser code that called it was commented out, so nothing set `discount_applied` automatically. Nothing on the server checked the deadline at all.

The revival needed the rule to behave correctly, and the 2026 upgrade needed the flag to be trustworthy, because the analytics and the experiment designer are built on it.

## Decision

- Port the timers and messages into `web/src/lib/order-rules.ts`; the Vitest suite runs the original 2021 functions side by side to prove the ports match.
- Store `discount_time` as an instant (start + 15 minutes, epoch milliseconds).
- When a vendor marks an order ready after its deadline, set `discount_applied` in the same database update. An order still outstanding past its deadline is shown as discounted too.
- Flip the customer's ring to "over time" at 15:00, together with the discount badge, instead of the original 16:00.
- Keep the original wording of the messages.

## Options considered

1. **Port it literally**: string times, a 16:00 flip and no automatic flag. Most faithful, but the flag would never be set, so any analysis of late orders would read zero.
2. **Port with targeted fixes** (chosen). The rule stays the 2021 rule; the bugs that make it unusable are fixed, each one listed in the README.
3. **Redesign the rule**, for example a discount that grows with the delay. Possibly better for the business, but it is not what the team built, and changing it should be decided by evidence, which is what the experiment designer is for.

## Why

The flag is data: if it is not set reliably, every downstream number (late rate by van, the experiment's guardrail) is wrong. Setting it in the same update as the status change means it cannot drift from the timestamps. The one-minute gap between the ring and the badge was a visible inconsistency for customers. The literal behaviour is still documented and covered by the parity tests, so the changes are deliberate rather than accidental.

## What happened

- In the seed data 47 of 149 served orders were ready after the deadline: a late-discount rate of 31.5% (Wilson 95% CI 24.6% to 39.4%). That number describes the seed generator, which draws minutes-to-ready uniformly between 4 and 21 (so about 35% late by construction), not any real van. The analytics page says so.
- Per van, the samples are small (4 to 44 served orders), so the intervals are wide and overlap: the data cannot say one crew is slower than another.
- The rule is now the subject of the experiment designer. Testing a 10-minute promise against the 15-minute rule, with a 35% baseline repeat-order rate and 8 points as the smallest effect worth detecting, needs 583 customers per arm (pooled z-test, two-sided α = 0.05, 80% power), about 30 days at an assumed 40 new customers a day.
- The 2021 brief never defined the size of the discount, and neither did the team. The schema has a flag and no amount, so the cost side of the rule can only be measured as "share of orders discounted".

## What I'd change

- Record the discount amount (or rate) with the flag, so the guardrail can be measured in dollars.
- Decide explicitly whether "late" means late to be ready or late to be collected. The original measured ready, and so does the port; a customer standing at the window might disagree.
