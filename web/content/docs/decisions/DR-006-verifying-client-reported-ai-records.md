# DR-006: Reserve AI calls before they happen and re-verify their records on the server

- **Decision:** the browser must get a short-lived signed reservation from the server before it calls an AI provider with the vendor's own key; the server logs a record only against that reservation, requires the prompt to be the app's fixed instructions plus a well-formed set of aggregate figures for that van, validates the output, recomputes the fact check itself and stores whether the figures matched its own. The AI use statement says plainly that records are reported by the browser.
- **Status:** accepted on 6 October 2026, after an independent review of the 2026 upgrade.
- **Supersedes:** nothing. It tightens the AI audit log introduced with the shift summary.

## Context

The shift summary is bring-your-own-key: the key stays in the vendor's browser and the request goes straight from the browser to Anthropic or OpenAI. That keeps the key off this server, and it also means the server never sees the call, only a record the browser posts afterwards.

The first version of the log accepted any record with the right shape and no key-like strings. The review showed what that left open:

- The fact check that compares the summary's numbers with the figures sent counted digits inside the date and the busiest-hour label as allowed numbers. With 7 orders placed, a reply saying "10 orders" on 2026-10-06 passed as "all 1 numbers appear in the figures sent".
- The fact check was computed in the browser and stored as sent, as was everything else. Because the demo vendor login is public, anyone could post an invented "AI call".
- The rate limit ran after the provider call, so a refused log still cost the visitor a call on their own key, and the output was then withheld. A failed call whose record could not be logged was dropped silently.

## Decision

- `reserveAiCallAction` checks the session and rate limits (per van and visitor, plus a looser cap per van) and returns a record id and a 15-minute signed token. Nothing is sent to the provider if it refuses.
- `logAiCallAction` accepts a record only with a valid token for the same van and record id. It parses the figures back out of the prompt and requires the prompt to be exactly what the app renders for them, checks the van, validates the output with the shift-summary schema, recomputes the fact check, and stores `input_matches_server`.
- The fact check uses numeric fields only; dates and clock times are checked in date or time form against the shift's date and busiest hour.
- Edits that look like API keys are refused. A failed call that could not be logged is reported to the vendor.

## Options considered

1. **Trust the browser** (the first version). Simple, and the key stays off the server, but the log proves very little.
2. **Proxy the call through the server.** The server would see the real response, but the visitor's key would pass through it, which breaks the bring-your-own-key promise.
3. **Reserve, then verify what can be verified** (chosen). The key still never reaches the server; the server controls when a call may happen and checks everything it can recompute.
4. **Provider-signed responses.** Would settle authenticity, but neither provider offers them for this use.

## Why

Option 3 removes every gap the server can close without seeing the key, and names the one it cannot: the reply, model, latency and token counts are still as the browser reported them. Saying that in the AI use statement is better than a log that looks more authoritative than it is.

## What happened

- The "10 orders" case and the other regressions the review found are now tests (`ai.test.ts`). A summary that names a time other than the busiest hour, or a date other than the shift's, is flagged too.
- A record with altered instructions, extra text around the figures, another van's figures, or an output in the wrong format is refused; the browser's own fact check is ignored.
- What remains: a visitor with the demo login can still post a well-formed invented output for a genuine prompt. It is labelled, fact-checked against the real figures and shown as reported, but the server cannot prove it is fake.
- On the public deployment the rate limits live in each serverless instance's memory, so they are approximate, and until Turso is connected the log itself is per instance ([DR-004](DR-004-turso-vs-tmp-fallback.md)).

## What I'd change

- For a real organisation, call the provider from the server with an organisation-held key under a usage policy, so the log records the actual response; keep bring-your-own-key for demos only.
- Move the rate limits into the shared database once one exists.
- Add a periodic human audit of a random sample of logged calls, so the review of AI output does not rest on the vendor's single decision.
