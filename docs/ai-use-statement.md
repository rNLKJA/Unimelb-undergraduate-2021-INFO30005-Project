# AI use statement

Snacks in a Van has one optional AI feature: a **shift summary** on the vendor's van page. Everything else in the app, including all analytics and the experiment designer, is ordinary code and statistics. The app works fully without any AI key, and makes no AI calls unless a vendor adds their own key and presses the button.

This statement and the controls it describes are informed by the Australian Government's policy for the responsible use of AI in government (Digital Transformation Agency), the transparency principles of the EU AI Act and the NIST AI Risk Management Framework. It is a portfolio demo and makes no claim of formal compliance with any of them.

## What the AI does

- Turns today's aggregate figures for one van (orders, cancellations, sales, median minutes to ready, the share ready within 15 minutes with its interval, late discounts, the number and average of ratings, the top three items and the busiest hour) into a short note for the crew: a headline, a few highlights, watch-outs and one suggestion for the next shift.
- Runs only when the vendor presses "Write a summary", using the vendor's own Anthropic or OpenAI key.
- Default model: Claude Haiku 4.5 (lowest cost); Claude Sonnet 5.5 is offered for a stronger answer; for OpenAI the vendor types the model id.

## What it never does

- It never changes an order, a van, a price, the discount rule or any statistic. Its output is text for a person to read.
- It never sees personal data: no customer names, emails, order ids or written comments. The figures are computed on the server from the orders and only the aggregates are put in the prompt (`computeShiftMetrics`, with a test that the prompt holds none of those fields). The server also refuses to log any record whose prompt is not exactly the app's instructions plus a well-formed set of those aggregates, so a modified browser cannot slip other data into a logged call.
- It never runs without a key and an explicit click.
- It never sends the key to this app's server. The call goes directly from the vendor's browser to the provider.

## Data sent to the provider

Only the prompt shown under "Exactly what is sent to the provider" on the van page: fixed instructions plus the figures as JSON. The key travels in the request header to the chosen provider (Anthropic's Messages API, with the `anthropic-dangerous-direct-browser-access` header that browser calls require, or OpenAI's Chat Completions API), which processes the request under its own terms and bills the key's owner.

## Where the key lives

In the vendor's browser only: session storage by default (gone when the tab closes, and cleared when the vendor logs out, because the demo vendor login is shared), local storage only if "remember on this device" is switched on (it then survives logging out), and removed by "Forget key". The key only moves between the two when the vendor flips that switch. It is never written to the audit log, never logged by the server and never committed to the repository.

## Human in the loop and transparency

- Every output is labelled **AI-generated** with the provider and model. Text the vendor edited is labelled "AI draft, edited by the vendor", with the original draft one click away. Failed calls, which produced no output, are listed without the label.
- An automatic check compares every number in the output with the numeric figures that were sent and lists any that do not match, next to the text. Dates and clock times are accepted only in date or time form and only when they are the shift's date or the busiest hour; digits inside the date or a label never excuse a count. The server recomputes this check itself when the record arrives; the browser's own result is not trusted.
- The vendor records a decision: accept, edit (the edit is stored next to the original) or reject. Each output can be decided once. An edit that looks like an API key is refused, never stored.
- Before the browser contacts the provider, it asks the server for a short-lived, signed reservation; the server checks the vendor's session and the rate limits at that point, so a refused call never costs the vendor anything on their own key. After the call, every call made through the app, successful or not, is posted to the `ai_audit_log` table against that reservation: id, time, feature, provider, model, the input, the output (and the raw reply when it failed validation, was cut off or was refused), latency, token usage when the provider reports it, the fact check, whether the figures sent still matched the server's own, and the human decision. If the record of a successful call cannot be logged, the output is withheld; if the record of a failed call cannot be logged, the vendor is told. The server refuses anything shaped like an API key and takes the vendor's identity from the signed session. Decisions are also written to the append-only `audit_log`.
- The log is viewable at `/admin/ai-log` (and as the `ai_audit_log` table in `/admin/records`) and can be exported as JSON or CSV. Exports are themselves recorded in `audit_log`.
- Database triggers keep each call record immutable apart from the single decision.

## Known limitations

- **Records are reported by the vendor's browser.** The provider call happens in the browser (that is what keeps the key off this server), so the server receives a record of the call, not the call. It checks what it can (the reservation, the prompt, the output's format, the fact check) but cannot prove that a record matches a real provider response: the model name, latency, token counts and the reply itself are as the browser reported them. Because the demo vendor login is public, anyone could post a well-formed but invented record. The log shows what the app reported, attested by the signed-in vendor session ([DR-006](decisions/DR-006-verifying-client-reported-ai-records.md)).
- The number check is a guard, not a guarantee: a summary can quote correct numbers and still mislead through emphasis or implied causes. That is why a person decides.
- Rate limits are kept in memory per server instance, so on a serverless deployment they are approximate.
- Since 6 October 2026 the public deployment writes the AI audit log to a shared Turso database, so records persist between requests and instances ([DR-007](decisions/DR-007-production-on-turso.md)). That cuts both ways: an invented record posted through the public demo vendor login persists too, until a full demo reset.
- Model outputs vary between runs and model versions; the log records which model produced which text.
