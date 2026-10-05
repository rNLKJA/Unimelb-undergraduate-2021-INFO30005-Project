# AI use statement

Snacks in a Van has one optional AI feature: a **shift summary** on the vendor's van page. Everything else in the app, including all analytics and the experiment designer, is ordinary code and statistics. The app works fully without any AI key, and makes no AI calls unless a vendor adds their own key and presses the button.

This statement and the controls it describes are informed by the Australian Government's policy for the responsible use of AI in government (Digital Transformation Agency), the transparency principles of the EU AI Act and the NIST AI Risk Management Framework. It is a portfolio demo and makes no claim of formal compliance with any of them.

## What the AI does

- Turns today's aggregate figures for one van (orders, cancellations, sales, median minutes to ready, the share ready within 15 minutes with its interval, late discounts, the number and average of ratings, the top three items and the busiest hour) into a short note for the crew: a headline, a few highlights, watch-outs and one suggestion for the next shift.
- Runs only when the vendor presses "Write a summary", using the vendor's own Anthropic or OpenAI key.
- Default model: Claude Haiku 4.5 (lowest cost); Claude Sonnet 5.5 is offered for a stronger answer; for OpenAI the vendor types the model id.

## What it never does

- It never changes an order, a van, a price, the discount rule or any statistic. Its output is text for a person to read.
- It never sees personal data: no customer names, emails, order ids or written comments. The figures are computed on the server from the orders and only the aggregates are put in the prompt (`computeShiftMetrics`, with a test that the prompt holds none of those fields).
- It never runs without a key and an explicit click.
- It never sends the key to this app's server. The call goes directly from the vendor's browser to the provider.

## Data sent to the provider

Only the prompt shown under "Exactly what is sent to the provider" on the van page: fixed instructions plus the figures as JSON. The key travels in the request header to the chosen provider (Anthropic's Messages API, with the `anthropic-dangerous-direct-browser-access` header that browser calls require, or OpenAI's Chat Completions API), which processes the request under its own terms and bills the key's owner.

## Where the key lives

In the vendor's browser only: session storage by default (gone when the tab closes), local storage only if "remember on this device" is switched on, and removed by "Forget key". It is never written to the audit log, never logged by the server and never committed to the repository.

## Human in the loop and transparency

- Every output is labelled **AI-generated** with the provider and model.
- An automatic check compares every number in the output with the figures that were sent and lists any that do not match, next to the text.
- The vendor records a decision: accept, edit (the edit is stored next to the original) or reject. Each output can be decided once.
- Every call, successful or not, is recorded in the `ai_audit_log` table: id, time, feature, provider, model, the exact input, the output (and the raw reply when it failed validation, was cut off or was refused), latency, token usage when the provider reports it, the fact check and the human decision. The browser posts this record to a server action after the call; the server validates it, refuses anything shaped like an API key, and takes the vendor's identity from the signed session. Decisions are also written to the append-only `audit_log`.
- The log is viewable at `/admin/ai-log` (and as the `ai_audit_log` table in `/admin/records`) and can be exported as JSON or CSV. Exports are themselves recorded in `audit_log`.
- Database triggers keep each call record immutable apart from the single decision.

## Known limitations

- The number check is a guard, not a guarantee: a summary can quote correct numbers and still mislead through emphasis or implied causes. That is why a person decides.
- On the public deployment, until a shared database is connected, the AI audit log has the same weakness as every other write: rows live on one serverless instance and are lost when it recycles ([DR-004](decisions/DR-004-turso-vs-tmp-fallback.md)). Locally, the log is durable.
- Model outputs vary between runs and model versions; the log records which model produced which text.
