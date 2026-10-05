# DR-008: Apply pending migrations to the remote database on startup; refuse to seed it

- **Decision:** each server instance applies any pending Drizzle migrations to the Turso database on its first query, the same way local and `/tmp` databases always have, and `pnpm db:seed` refuses a remote `DATABASE_URL` unless `ALLOW_REMOTE_SEED=1` is set.
- **Status:** accepted on 6 October 2026.
- **Supersedes:** the manual-migration note in [DR-001](DR-001-mongodb-to-libsql-drizzle.md) ("Today `pnpm db:migrate` against Turso is a manual step") and DR-007's "Nothing in the code changes". DR-001's and DR-007's decisions stand.

## Context

Until [DR-007](DR-007-production-on-turso.md) production ran on a `/tmp` copy that migrated itself on every cold start. `src/db/client.ts` skipped migrations for remote databases on purpose, leaving `pnpm db:migrate` as a step to remember before each deploy that adds one. With production now on Turso, forgetting it would deploy code that queries columns the database does not have, and the first sign would be errors on the live site. The 2026 upgrade added four migrations within a few hours, so this was not hypothetical.

The other risk was the opposite one. The README told readers to run `pnpm db:migrate && pnpm db:seed` against a new Turso database, and `db:seed` starts by deleting every table, including visitors' orders and the append-only audit tables (it sets the `demo_reset_in_progress` flag, which the append-only triggers let through, for the duration of the reset).

## Decision

- `migrateIfBehind` in `src/db/connection.ts` reads the latest `created_at` in `__drizzle_migrations`, compares it with the committed journal using the migrator's own rule, and runs the migrator only when something is newer. When the schema is current it costs one query, which matters with the database in Tokyo and the functions in Sydney.
- `client.ts` calls it once per server instance for remote databases. A failure is logged, not thrown.
- `pnpm db:migrate` uses the same function and reports how many migrations it applied.
- `pnpm db:seed` exits with an error for any non-`file:` URL unless `ALLOW_REMOTE_SEED=1` is set. The README now says to create the database from the snapshot and never to seed it.

## Options considered

1. **Keep migrations manual and document the command.** No new code, but it relies on remembering, and the failure shows up on the live site.
2. **Migrate in the Vercel build step.** Runs once per deploy rather than once per instance, but the build would need the production token, preview builds would migrate the production database before anyone reviewed the change, and a migration would land even if the deploy was then abandoned.
3. **Migrate on startup, guarded by a cheap check** (chosen). It needs no extra secret in the build, follows the deployed code exactly, and is the approach the personal CRM revival already uses.
4. **Migrate on startup with the plain migrator.** Simpler, but three round trips to Tokyo on every cold start instead of one.

## Why

Startup migration ties the schema to the code that needs it: whichever deploy first serves a request brings the database up to date. Logging instead of throwing covers the one race this creates. If two cold starts try to apply the same migration, both run it as a single batch in one transaction; the second fails on an object that already exists, rolls back, and its instance then serves the schema the first one built. The seed guard turns a destructive command from "be careful" into "say so explicitly".

## What happened

- Against production on 6 October 2026, with a read-only token, `pnpm db:migrate` reported 0 pending migrations: `__drizzle_migrations` already held all five, matching the journal, so the new startup path is a single `SELECT` there today.
- Three new tests run the function against an in-memory database: a new database gets all five migrations, a current one gets none, and a database missing only the last migration gets exactly that one (and the replaced trigger comes back).
- The race above is reasoned from how libSQL runs a migration batch, not observed: no migration has been deployed to production since the switch.
- The same day, a test order placed while verifying DR-007 (`ZKW1920391`) was removed from production with a targeted delete of that order and its three items, rather than a reseed. Its `order.fulfilled` entry stays in `audit_log`, which is append-only, so the trail still records an order that no longer exists. That is the intended behaviour of an append-only log, but it means the audit trail and the orders table can disagree.

## What I'd change

- Record each startup migration in `audit_log` (which instance, which migration, how long it took), so a schema change on the live site leaves the same trail as a person's action.
- Add the write-then-read health check DR-004 and DR-007 asked for, and run it after a deploy that applied a migration.
- Give the seed command a dry-run mode that prints the row counts it would delete.
