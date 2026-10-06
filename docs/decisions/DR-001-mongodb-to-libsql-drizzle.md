# DR-001: Rebuild the data layer on libSQL and Drizzle instead of MongoDB

- **Decision:** port the five Mongoose models to a relational libSQL (SQLite) schema managed by Drizzle ORM, with a committed seed snapshot for local use and Turso (hosted libSQL) as the shared production database.
- **Status:** accepted on 6 October 2026, at the start of the revival (recorded on 6 October 2026, after the fact).
- **Supersedes:** nothing.

## Context

The 2021 app stored everything in a MongoDB Atlas cluster through Mongoose. By 2026 the cluster was gone, and the connector (`models/db.js`) and `.env` had never been committed, so not a single record survived. The schema in `coursework/models/` was all that remained: five collections, with order items embedded in each order, times stored as `"H:M:S"` strings (built with a hand-rolled UTC to Melbourne conversion) and van passwords as unsalted MD5.

The revival had to run three ways: locally with no setup, in CI with fast deterministic tests, and on Vercel's serverless functions for a public demo. It also had to keep the original business rules intact, and they are expressed in terms of these fields (`discount_time`, `discount_applied`, `status`).

## Decision

- One relational schema in `web/src/db/schema.ts`: `customers`, `vans`, `products`, `orders`, `order_items` (the embedded array, now a child table), `blogs`, plus `admins` and `app_meta` for the revival.
- Keep the natural keys the original joined on (`customer_id`, `van_id`, `order_id`, `product`) as unique text columns with foreign keys; integer surrogate primary keys underneath.
- Store times as epoch milliseconds; keep `order_date` as the original `"D-M-YYYY"` Melbourne string.
- bcrypt for every account.
- Drizzle ORM and drizzle-kit migrations; libSQL as the driver in every environment: a local file (`data/app.db`, copied from the committed `data/seed.db`), an in-memory database in tests, and Turso in production.

## Options considered

1. **MongoDB Atlas free tier with the original Mongoose models.** The most faithful, but it needs a cloud account before anyone can run the app locally, and the string times and embedded arrays would have had to be fixed anyway.
2. **Postgres (Neon or Supabase) with Drizzle.** A strong production choice, but local development then needs Docker or a cloud branch, and tests need either a container or mocks.
3. **libSQL with Drizzle** (chosen). A file is a database, so local development and CI need nothing installed, tests run against a real in-memory database with the real migrations, and Turso speaks the same protocol for production.
4. **JSON files on disk.** Simple, but no constraints, no concurrent writes and nothing to grow into.

## Why

The constraint that mattered most was "runs with zero setup and tests against the real thing". SQLite meets it: `pnpm dev` copies a committed snapshot and applies the migrations, and every integration test builds a fresh in-memory database from the same migrations. Relational constraints also catch mistakes the 2021 schema allowed, such as an order that references a van that does not exist. SQL makes the later analytics simple (every figure on `/admin/analytics` is a small aggregate), and SQLite triggers made the 2026 append-only audit log enforceable at the database rather than only in application code.

## What happened

- The schema port and a deterministic seed (PRNG seed 4399) produce 15 vans, 10 customers, 174 orders over three weeks and the recovered eight-item menu. Integration tests exercise placing, changing, cancelling, fulfilling, collecting and rating orders against an in-memory database.
- The epoch-millisecond change removed the original's time bugs (a fixed +10 hour offset that ignored daylight saving and mishandled the 0 and 14 hour edges). The legacy formatter is kept only to prove parity in tests.
- A copied snapshot's history has to be shifted to "now" on first use (`rebase.ts`), otherwise the demo would age a day every day. It works, but it is an extra moving part.
- The production half of the decision is not realised: Turso was never provisioned, so production runs on a per-instance copy in `/tmp` (see [DR-004](DR-004-turso-vs-tmp-fallback.md)).
- In the 2026 upgrade the triggers in migration `0002_append_only_triggers.sql` made `audit_log` append-only and `ai_audit_log` immutable apart from one review decision. They are a guard against application bugs, not a security boundary: anyone with the database file can drop them.

## What I'd change

- Provision the shared database before writing any feature that writes, not after.
- Run remote migrations from the deploy pipeline. Today `pnpm db:migrate` against Turso is a manual step, and a forgotten migration would only show up as a runtime error.
