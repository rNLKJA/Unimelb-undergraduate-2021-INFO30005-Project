# Showcase: the 2026 upgrade

These screenshots were taken on 6 October 2026 against a **local production build** (`pnpm build && pnpm start -p 3210`) using a local SQLite copy of the committed seed snapshot, with Playwright driving the system Chrome. They were not taken on the public deployment, because production still runs without a shared database and its writes do not survive between serverless instances ([DR-004](../decisions/DR-004-turso-vs-tmp-fallback.md)). All data is synthetic.

| Screenshot | What it shows |
| --- | --- |
| [analytics.webp](analytics.webp) | `/admin/analytics`: orders per day with the mean's bootstrap interval, minutes to ready with the median and its interval, the Kaplan–Meier time-to-fulfil curve with its 95% band, and the late-discount rate by van with Wilson intervals. Every figure states n. |
| [analytics-dark.webp](analytics-dark.webp) | The same page in dark mode (chart colours validated separately for the dark surface). |
| [analytics-mobile.webp](analytics-mobile.webp) | The same page at 375 px. |
| [experiments.webp](experiments.webp) | `/admin/experiments`: hypothesis, randomisation unit and primary metric; the required sample size (583 customers per arm for 35% → 43% at α = 0.05 and 80% power); a simulated run with a known +8 point effect analysed with Newcombe, z and permutation tests; and the peeking panel (10,000 A/A tests: 19.6% false positives when stopping at the first p < 0.05 over 10 looks, 5.0% with Pocock's boundary). |
| [ai-settings.webp](ai-settings.webp) | The bring-your-own-key AI settings: provider, model, key kept in this browser only, "remember on this device" off by default. |
| [shift-summary-review.webp](shift-summary-review.webp) | The optional shift summary after review. **The provider reply was mocked** in the smoke test (no real API call; the browser request to Anthropic was intercepted and answered with a canned reply). The canned text quotes figures that are not today's, so the automatic fact check flags 5 of 14 numbers and the reviewer rejects it: the human-in-the-loop path. |
| [ai-log.webp](ai-log.webp) | `/admin/ai-log`: that call's record (prompt and figures sent, reply, model, latency, tokens, fact check, decision), exportable as JSON or CSV. No key is ever stored. |
| [audit-log.webp](audit-log.webp) | The append-only `audit_log` table in the records area: demo housekeeping, sign-ins, and the AI review decision. |
| [decision-record.webp](decision-record.webp) | A decision record rendered under `/methods` (DR-004, including what went wrong). |
