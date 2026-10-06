# DR-007: Run production on the shared Turso database; keep /tmp for deployments without one

- **Decision:** the public deployment reads and writes the Turso (libSQL) database `snacks-in-a-van` through `DATABASE_URL` and `DATABASE_AUTH_TOKEN`, set for Production on Vercel. The `/tmp` copy from [DR-004](DR-004-turso-vs-tmp-fallback.md) stays only as the fallback for deployments without those variables, and still shows its "Demo mode" notice there.
- **Status:** accepted on 6 October 2026, when the database was connected (recorded the same day, after the fact).
- **Supersedes:** DR-004's status ("the fallback is what production runs on today") and its findings about production writes. DR-004's decision itself, Turso as the target with a fallback, stands.

## Context

DR-004 chose Turso for production but shipped on the fallback, because the database could not be created from the deploy session. On the fallback every serverless instance had its own copy of the seed, so a just-placed order could show "not found", orders did not reach the vendor board, and the 2026 governance features were weakest exactly where they are shown: `audit_log` and `ai_audit_log` rows disappeared when an instance recycled. The methods page, the AI use statement and the privacy note all had to say so.

## Decision

- Production uses the `snacks-in-a-van` database in the account's default Turso group, located in `aws-ap-northeast-1` (Tokyo).
- The schema is the app's own: the five Drizzle migrations are applied (`__drizzle_migrations` has 5 rows), including the triggers that keep `audit_log` append-only and each `ai_audit_log` record immutable apart from one decision.
- Nothing in the code changes. `src/db/client.ts` already picks the remote mode when `DATABASE_URL` is set, and the notice only renders in the ephemeral mode.

## Options considered

1. **Stay on the fallback.** Free, but the audit trail is not durable in production, which undercuts the governance features.
2. **Turso in the account's existing location, Tokyo** (chosen). One database technology from laptop to production, no code change, available immediately.
3. **Turso next to the functions.** The functions run in `syd1`; a database location near Sydney would avoid a cross-region round trip on every query.
4. **Move the functions next to the database.** Shorter database hops, but further from the Melbourne visitors the demo is built for.

## Why

The governance claims (append-only audit trail, every AI call logged, a person's decision recorded) only mean something if the records survive between requests. A shared database is the only fix DR-004 found; Turso keeps the same driver and migrations as local development ([DR-001](DR-001-mongodb-to-libsql-drizzle.md)).

## What happened

Checked on the live site on 6 October 2026, after redeploying with the variables in place:

- The "Demo mode" notice no longer renders on any portal.
- Writes are shared. An order placed as the demo customer in one browser session appeared on the vendor board in a separate session, and the vendor's "Fulfilled" click, each demo sign-in and the AI-log exports all appeared in `audit_log` (22 rows from about 13 minutes of testing) and were still there on later requests.
- Latency, measured from Adelaide with 20 sequential requests each: `/api/vans` median 276 ms (IQR 268 to 295 ms), `/customer` median 281 ms (IQR 275 to 310 ms), with occasional cold starts of 0.65 to 1.2 s. No fallback baseline was measured on the same day, so the cost of the Sydney-to-Tokyo hop is not separated out; it is a known cost, not a measured one.
- Two consequences of a persistent database that the fallback hid:
  - The demo history is no longer re-dated. `rebaseHistory` only runs on a fresh `/tmp` copy, so the seeded three weeks now age in place. The vendor's "today" tiles depend on the activity the demo login tops up, and from about 27 October 2026 the 21-day orders-per-day chart will show only visitor activity.
  - What visitors write now stays: accounts, posts, ratings, orders, audit entries and AI log records, until a full demo reset. Because the demo vendor login is public, a well-formed but invented AI log record ([DR-006](DR-006-verifying-client-reported-ai-records.md)) now persists too.
- Unchanged: the AI rate limits still live in each instance's memory, so they remain approximate.

## What I'd change

- Put the database and the functions in the same region and measure the difference, instead of accepting a cross-region hop on every query.
- Add the health check DR-004 asked for: write on one request, read it back on another, and fail the deploy if it does not match.
- Re-date or reset the demo data on a schedule, so the analytics window never empties, and record each reset in a log that the reset itself does not wipe.
- Set an explicit retention period for visitor-written rows now that they persist.
