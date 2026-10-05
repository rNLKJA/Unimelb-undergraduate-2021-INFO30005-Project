# DR-004: Use Turso in production, with a /tmp copy as a read-mostly fallback

- **Decision:** production should use a shared Turso (libSQL) database via `DATABASE_URL` and `DATABASE_AUTH_TOKEN`; when those are missing on Vercel, the app copies the committed seed snapshot to `/tmp` on each cold start and shows a "Demo mode" notice rather than failing.
- **Status:** accepted on 6 October 2026, at the first deployment (recorded on 6 October 2026, after the fact). The fallback is what production runs on today.
- **Supersedes:** nothing.

## Context

Vercel functions have a read-only filesystem apart from `/tmp`, and each function instance has its own `/tmp`. The app writes on almost every interaction: sign-ups, orders, status changes, ratings, and since the 2026 upgrade the audit log and the AI audit log. Those writes must be visible to the next request, which may reach a different instance, and to the other portal: the vendor board has to see the customer's order.

At the first deployment the owner's Turso CLI was not logged in, so the database could not be created from the deploy session. Logging in is an interactive step for the owner.

## Decision

- Target: Turso, created from the committed snapshot (`turso db create snacks-in-a-van --from-file web/data/seed.db`), with the two variables set for Production on Vercel. Same libSQL driver and the same migrations as local development.
- Fallback when the variables are absent on Vercel: copy `data/seed.db` to `/tmp` on cold start, apply migrations, shift the demo history to "now", and show a notice that new accounts and orders may not appear on the next page.
- Functions run in `syd1`, close to Melbourne visitors and to a Turso database created from Australia.

## Options considered

1. **Turso** (chosen as the target). Hosted libSQL; no dialect change.
2. **Vercel Postgres or Neon.** Solid, but a second SQL dialect and a different driver for production only.
3. **The /tmp copy alone.** Free and instant, but writes are per instance and vanish on recycle.
4. **Refuse to start without a database.** Honest, but the public demo would be down until the owner provisions it.

## Why

Turso keeps one database technology from laptop to production (see [DR-001](DR-001-mongodb-to-libsql-drizzle.md)). The fallback was meant to keep the public demo browsable in the gap before provisioning, and it does that: the map, menus, community board, records and the seeded vendor board all work.

## What happened

- As of 6 October 2026, Turso is not provisioned: `turso auth whoami` reports "not logged in", and the only Production variable on Vercel is `SESSION_SECRET`. Production runs on the fallback.
- Verified on the live site: Vercel serves App Router pages, Route Handlers and the static landing page from separate functions, and runs several instances of each (16 parallel requests reached about 7 instances; a page's link prefetches are enough to start them). Each instance has its own copy, so writes are unreliable: a new account may not be able to log in on the next request, a just-placed order can show "not found", and orders do not reach the vendor board.
- Moving the polling into the pages' function was tried (commit `acd45bc`) and reverted (`66c637b`), because instances of the same function do not share `/tmp` either. Only a shared database fixes it.
- The baseline pull request was not merged, because its end-to-end check (a demo order appearing on the vendor board and in the records) cannot pass on production.
- The 2026 governance features inherit the problem. On production, `audit_log` and `ai_audit_log` rows are written to whichever instance served the request and disappear when it recycles, so **the audit trail is not durable in production until Turso is connected**. Locally, with one shared `data/app.db`, everything works end to end, which is why the 2026 showcase screenshots were taken against a local production build (`pnpm build && pnpm start`).

## What I'd change

- Provision the database before the first deploy, and treat "writes are shared" as a release criterion.
- Make production refuse writes (or fail the deploy) when `DATABASE_URL` is missing, instead of a fallback that looks like it works. A fallback that silently loses audit records is worse than a clear "read-only demo" mode.
- Add a health check that writes on one request and reads back on another.
