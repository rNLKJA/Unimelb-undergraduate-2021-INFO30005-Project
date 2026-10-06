# Showcase

Two sets of media live here.

## The guided tour (`pnpm showcase`)

Made on 6 October 2026 by [`web/e2e/showcase.spec.ts`](../../web/e2e/showcase.spec.ts), a
Playwright script on the system Chrome, against a local production build on the committed
demo data (`cd web && pnpm build && BASE_URL=http://localhost:3000 pnpm showcase --fresh-db`).
The same script runs against production with `pnpm showcase`. It uses the one-click demo
accounts (no password is typed) and enters no AI key; the browser's location is fixed at the
University of Melbourne and the experiment uses fixed seeds. Every step is asserted, so a broken
feature fails the tour rather than producing a misleading recording. All data is synthetic.

| Files | What they are |
| --- | --- |
| `01-landing-light.png` … `13-methods.png` | Key features at 1440 × 900 (the landing page in light and dark mode). |
| `14-mobile-landing.png` … `16-mobile-order-tracker.png` | The same app on a 390 × 844 phone (captured at 2×, stored at 1.5×). |
| `customer-orders.gif` | Find the nearest van, order, and follow the tracker. Steps 8 and 9 are a labelled time-lapse: only the browser's clock is fast-forwarded (Playwright's clock) so the 15-minute ring can run out; the server's order is untouched. |
| `vendor-fulfils.gif` | The vendor's live board receives the order, marks it fulfilled and collected; the customer's tracker follows without a reload. Ends on the bring-your-own-key AI settings (opened and closed, no key). |
| `admin-experiments.gif` | Records and the append-only audit log, the operations analytics with intervals, and the A/B-test designer: sample size, a simulated run that covers the injected effect (seed 2021), one that misses it (seed 4399), and the peeking simulation. |

The GIFs are 960 px wide at 10 fps, sped up 1.25× with waits and scripted scrolls cut. The full
captioned videos (H.264 MP4 with WebVTT captions) are in
[`web/public/showcase`](../../web/public/showcase) and play on the site's
[guided tour](https://snacks-in-a-van.vercel.app/tour). The step captions are defined once in
[`web/src/lib/showcase.ts`](../../web/src/lib/showcase.ts).

## Earlier screenshots: the 2026 upgrade

These screenshots were taken on 6 October 2026 (and retaken after the review fixes the same day) against a **local production build** (`pnpm build && pnpm start`) using a local SQLite copy of the committed seed snapshot, with Playwright driving the system Chrome. They were not taken on the public deployment, because at the time production ran without a shared database and its writes did not survive between serverless instances ([DR-004](../decisions/DR-004-turso-vs-tmp-fallback.md); connected later that day, [DR-007](../decisions/DR-007-production-on-turso.md)). All data is synthetic.

| Screenshot | What it shows |
| --- | --- |
| [analytics.webp](analytics.webp) | `/admin/analytics`: orders per day with the mean's bootstrap interval, minutes to ready with the median and its interval, the Kaplan–Meier time-to-fulfil curve with its 95% band, and the late-discount rate by van with Wilson intervals. Every figure states n, and the intro states how many housekeeping close-outs were excluded (none here; [DR-005](../decisions/DR-005-censor-housekeeping-close-outs.md)). |
| [analytics-dark.webp](analytics-dark.webp) | The same page in dark mode (chart colours validated separately for the dark surface). |
| [analytics-mobile.webp](analytics-mobile.webp) | The same page at 375 px. |
| [experiments.webp](experiments.webp) | `/admin/experiments`: hypothesis, randomisation unit and primary metric; the required sample size (583 customers per arm for 35% → 43% at α = 0.05 and 80% power); a simulated run with a known +8 point effect analysed with Newcombe, z and permutation tests; and the peeking panel (10,000 A/A tests: 19.6% false positives when stopping at the first p < 0.05 over 10 looks, 5.0% with Pocock's boundary). |
| [ai-settings.webp](ai-settings.webp) | The bring-your-own-key AI settings: provider, model, key kept in this browser only, "remember on this device" off by default (and cleared on logout unless remembered). The key shown is a local placeholder. |
| [shift-summary-review.webp](shift-summary-review.webp) | The optional shift summary after review. **The provider reply was mocked** (no real API call; the browser request to Anthropic was intercepted and answered with a canned reply built from today's figures plus one made-up count). The fact check flags the made-up "10 orders were ready", the vendor deletes that line, and the card is relabelled "AI draft, edited by the vendor" with the original one click away: the human-in-the-loop path. |
| [ai-log.webp](ai-log.webp) | `/admin/ai-log`: that call's record (prompt and figures sent, reply, the vendor's edit, provider and model, latency, tokens, the server's fact check, decision) and totals over the whole log, exportable as JSON or CSV. The intro says plainly that records are reported by the browser. No key is ever stored. |
| [audit-log.webp](audit-log.webp) | The append-only `audit_log` table in the records area: demo housekeeping, sign-ins, and the AI review decision. |
| [decision-record.webp](decision-record.webp) | A decision record rendered under `/methods` (DR-004, including what went wrong). |
