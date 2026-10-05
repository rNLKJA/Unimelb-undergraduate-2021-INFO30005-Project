<div align="center">

# Snacks in a Van

### Find the nearest coffee van, order ahead, and run the van from a live order board

[![University of Melbourne](https://img.shields.io/badge/University-of%20Melbourne-002145)](https://www.unimelb.edu.au)
[![Subject](https://img.shields.io/badge/INFO30005-Web%20Information%20Technologies-00529B)](https://handbook.unimelb.edu.au/2021/subjects/info30005)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=fff)](https://nextjs.org)
[![SQLite](https://img.shields.io/badge/libSQL%20%2F%20SQLite-Drizzle-003B57?logo=sqlite&logoColor=fff)](https://orm.drizzle.team)
[![MapLibre](https://img.shields.io/badge/MapLibre-OpenFreeMap-396CB2)](https://maplibre.org)

**Live demo:** [snacks-in-a-van.vercel.app](https://snacks-in-a-van.vercel.app)

</div>

> INFO30005 Web Information Technologies, University of Melbourne, Semester 1 2021.
> Group 4399 (tutorial T03). Revived in 2026 by **Sunchuangyu (Rin) Huang**.

## Overview

Snacks in a Van is a two-portal food-ordering web app for a business of roving snack vans.
It was our team's 2021 group project, originally built with Express, Handlebars and
MongoDB Atlas. The database and Heroku deployment are long gone, so the app has been
rebuilt as a single full-stack **Next.js** application with a local-first SQLite database,
a key-less map and one-click demo accounts.

- **Customers** find the five nearest open vans on a map (browser location, a searched
  place or a dropped pin; Melbourne Uni by default), browse the eight-item menu, check out,
  then track the order live: a status timeline, a 15-minute countdown ring, a 10-minute
  window to change or cancel, and a one-off rating (allowed at any stage, as in 2021). A
  community board shows snackers' posts, recent ratings and the top-rated vans.
- **Vendors** sign in with their van's name, set the van's location (GPS or a click on the
  map, reverse-geocoded to an address), open or close the van, and work through a live
  board of orders (outstanding → ready for pickup → collected) with per-order countdowns,
  automatic late-order discount flags and a searchable history.
- **Records** (admin): every database table with record counts, search, pagination and CSV
  export. Password hashes are never shown.

Open the customer and vendor demos in two tabs and you can watch an order travel between
them; both portals poll the server every few seconds.

**2026 upgrade (statistics and governance)**, all in the records area unless noted:

- **Operations analytics** (`/admin/analytics`): orders per day, minutes from order to ready,
  a Kaplan–Meier time-to-fulfil curve and the late-discount rate by van, every figure with
  its uncertainty (Wilson or bootstrap 95% intervals, seeds shown) and its n.
- **A/B-test designer** for the 15-minute late-discount rule (`/admin/experiments`):
  hypothesis, randomisation by customer, one primary metric, sample size from the minimum
  detectable effect, a seeded simulation with a known injected effect analysed with Newcombe
  intervals at 1 − α, z and permutation tests, and a peeking warning backed by 10,000 A/A
  runs. The analysis is calibrated against known truth by a committed script (`pnpm calibrate`).
- **Audit trail**: an append-only `audit_log` table (database triggers block updates and
  deletes) for order status changes, van open/close and location, sign-ins, exports and AI
  review decisions.
- **Optional AI shift summary, bring your own key** (vendor van page): never needed, never
  sees personal data, labelled, fact-checked, reviewed by the vendor and logged in an
  `ai_audit_log` table (`/admin/ai-log`) after the server re-checks each record.
- **Methods and decision records** (`/methods`): data provenance, methods, evaluation design,
  assumptions, limitations, the AI use statement, privacy and retention, a model and data
  card and six decision records. Screenshots: [`docs/showcase`](docs/showcase).

### Ported business rules (with parity tests)

The rules are ported from the original controllers and views into framework-free
TypeScript in [`web/src/lib`](web/src/lib), and the Vitest suite runs the **original 2021
JavaScript** side by side to prove they match:

| Rule | Original source | Port |
| --- | --- | --- |
| Five nearest vans by the legacy (degree-space) euclidean distance, ties in DB order | `customerController.locate_van`, `js/utility.euclidean_distance` | `lib/nearest-vans.ts`, `lib/distance.ts` |
| Order states outstanding → fulfilled → collected (or canceled) and their messages | `vendorController.stateOrderAsFulfilled` / `markOrderAsCollected` | `lib/order-rules.ts` |
| 10-minute change/cancel window (`timeAllow()`), 15-minute customer timer, vendor "N Minutes Remaining" | `OneofCustomerOrder.hbs`, `vendor-outstanding-orders.hbs` | `lib/order-rules.ts` |
| Server-side cart pricing (`toFixed(2)`) and the browser cart behaviour | `customerController.addToCart`, `js/cartController.js` | `lib/pricing.ts`, `lib/cart.ts` |
| Order IDs, legacy time strings (including the original UTC → Melbourne bug) | `js/utility.js` | `lib/order-id.ts`, `lib/legacy-time.ts` |
| Sign-up and change-password rules and messages | `updateNewAccountToDB`, `changePassword`, `login_error*.hbs` | `lib/validation.ts` |

Deliberate, documented differences: the change/cancel window is enforced on the server
too (the original only checked it in the browser), the late-order discount flag is set
automatically when an order is fulfilled after its 15-minute deadline (the original had
this written but commented out), order history is scoped to the signed-in van, timestamps
are real instants rendered in Melbourne time, and passwords are bcrypt for every account.
The countdown ring turns "over time" at 15:00, together with the late-order discount badge
(the original label only flipped at 16:00). To keep the public demo tidy, a one-click demo
login closes out demo orders left active for more than 90 minutes (as if served on time;
the order is flagged so the analytics leave its invented ready time out, see
[DR-005](docs/decisions/DR-005-censor-housekeeping-close-outs.md)), and simulated orders only
ever come from the seeded synthetic customers.

## Tech stack

| Layer | 2021 original | 2026 revival |
| --- | --- | --- |
| Framework | Express 4 + Handlebars | Next.js 16 App Router (Server Components, Server Actions, Route Handlers), React 19, TypeScript (strict) |
| Data | MongoDB Atlas + Mongoose | SQLite / libSQL via Drizzle ORM; Turso in production, committed seed snapshot |
| Auth | Passport-local + express-session | bcryptjs + signed httpOnly session cookies (jose), one per portal |
| Maps | Google Maps JS API + OpenCage | MapLibre GL + OpenFreeMap tiles, Photon geocoding (Nominatim fallback), bundled offline basemap |
| UI | Hand-written CSS | Tailwind CSS v4, shadcn/ui (Radix), lucide-react, motion, next-themes |
| Live updates | Page reload every 60 s | SWR polling (3–4 s) of Route Handlers |
| Tests | Jest + Supertest | Vitest: unit, parity (against the original JS) and in-memory database integration tests |
| Hosting | Heroku | Vercel |
| Statistics (2026) | – | Framework-free helpers in `web/src/lib/stats` (Wilson, Newcombe, power and sample size, permutation tests, bootstrap, Kaplan–Meier), verified against statsmodels, scipy and R |
| AI (2026, optional) | – | Bring-your-own-key Anthropic (official SDK, called from the browser) or OpenAI; zod-validated structured output; server-side audit log |

## Repository structure

```
.
├── README.md
├── .github/workflows/ci.yml   # lint, typecheck, test, build (web/)
├── docs/                      # model and data card, AI use statement, privacy, decision records, showcase
├── scripts/                   # uv project + R script that produce the statistics' reference values
├── coursework/                # the original 2021 submission, moved with git mv (see its README)
│   ├── app.js, routes/, controllers/, models/, config/, views/, public/, js/, __tests__/
│   ├── Mockup 1 … Mockup 4/   # milestone deliverables
│   └── Web Info Tech Report.pdf
└── web/                       # the deployable Next.js app (Vercel root)
    ├── data/seed.db           # committed SQLite snapshot (demo data)
    ├── drizzle/               # generated SQL migrations
    ├── public/images/snacks/  # illustrated snack SVGs drawn for the revival
    └── src/
        ├── app/               # routes: /, /customer/*, /vendor/*, /admin/*, /api/*
        ├── components/        # ui/ (shadcn), layout/, brand/, customer/, vendor/, admin/, map/, shared/
        ├── db/                # schema.ts, client.ts, seed.ts, rebase.ts, cli.ts
        ├── hooks/             # use-now, use-geolocation
        ├── lib/               # framework-free domain logic (the TypeScript ports) + tests;
        │                      # stats/, analytics/, experiments/, ai/ added in 2026
        └── server/            # "server-only" repositories, session, geocoding, integration tests
```

### Routes

| Route | What it is |
| --- | --- |
| `/` | Landing page: the story, a live customer/vendor demo, credits |
| `/customer` | Map of the five nearest open vans |
| `/customer/van/[slug]/menu` | A van's menu |
| `/customer/cart` | Cart and checkout |
| `/customer/orders`, `/customer/orders/[orderId]` | Order list and live order tracker |
| `/customer/community` | Snackers' board, recent ratings, top-rated vans |
| `/customer/profile`, `/customer/login`, `/customer/signup` | Account pages |
| `/vendor`, `/vendor/orders`, `/vendor/history`, `/vendor/login` | Van status & location, live board, history search |
| `/admin/records`, `/admin/login` | Read-only records of every table (including `audit_log` and `ai_audit_log`), CSV export |
| `/admin/analytics` | Operations analytics with intervals (2026) |
| `/admin/experiments` | A/B-test designer and simulation for the late-discount rule (2026) |
| `/admin/ai-log` | AI audit log with JSON / CSV export (2026) |
| `/methods`, `/methods/model-card`, `/methods/decisions/[slug]` | Methods, AI use statement, privacy, model and data card, decision records (2026) |
| `/api/vans`, `/api/customer/orders[/id]`, `/api/vendor/board`, `/api/geocode/*`, `/api/admin/export/[table]`, `/api/admin/ai-log/export` | Route Handlers used by the UI |

## Local development

Requirements: Node 20+ (tested on Node 26) and pnpm 10.

```bash
cd web
pnpm install
pnpm dev            # http://localhost:3000
```

No environment variables are needed locally: on first run the app copies
`data/seed.db` to `data/app.db` (git-ignored), applies migrations and moves the demo
history up to "now". Copy `.env.example` to `.env.local` to override anything.

| Command | Purpose |
| --- | --- |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | Quality gates (also run in CI) |
| `pnpm db:reset` | Delete, migrate and seed `data/app.db` |
| `pnpm db:snapshot` | Regenerate the committed `data/seed.db` |
| `pnpm db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `pnpm db:migrate` / `pnpm db:seed` | Migrate / seed `DATABASE_URL` (e.g. a Turso database) |
| `pnpm db:studio` | Browse the database with Drizzle Studio |
| `pnpm sync-docs` | Copy `../docs` into `content/docs` for the `/methods` pages (tests fail if they drift) |
| `pnpm calibrate` | Recompute `../docs/calibration.json`, the experiment analysis checked against known truth (`--check` fails if it is stale) |

### Demo accounts

Shown on each login page, with one-click buttons (the landing page has them too):

| Portal | Login | Password |
| --- | --- | --- |
| Customer | `snacker@demo.test` | `snack-2021` |
| Vendor | `Ardeth Lavon` (any van works) | `vanpass2021` |
| Records (admin) | `admin` | `admin-2021` |

These are throwaway demo values stored as bcrypt hashes, not secrets.

### Viewing the records

- **On the live site**: open [/admin/records](https://snacks-in-a-van.vercel.app/admin/records)
  and use the one-click demo admin (or `admin` / `admin-2021`). Every table is listed with
  record counts, search, pagination and a CSV export; password hashes are always redacted.
- **Locally**: `web/data/seed.db` is a plain SQLite file, so any SQLite browser can open it,
  or run `sqlite3 web/data/seed.db ".tables" "select count(*) from orders;"`. Your own local
  changes live in `web/data/app.db`; `pnpm db:studio` opens Drizzle Studio on it.
- **Production with Turso** (once connected):
  `turso db shell snacks-in-a-van "select count(*) from orders"`.
- **The audit trail**: the `audit_log` table in the records area (or
  `sqlite3 web/data/app.db "select at, actor_role, actor_id, action, entity_id from audit_log order by id desc limit 20;"`).
  It is append-only: `UPDATE` and `DELETE` fail with "audit_log is append-only".
- **The AI audit log**: [/admin/ai-log](https://snacks-in-a-van.vercel.app/admin/ai-log), with
  JSON and CSV export, or the `ai_audit_log` table in the records area.

### Deployment notes

The Vercel project `snacks-in-a-van` deploys from `web/` (Root Directory `web` when
connected to Git; `cd web && vercel deploy --prod` from the CLI).

- Set `SESSION_SECRET` (32+ random bytes) on Vercel. This is done for production.
- For persistent, shared records set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` to a Turso
  database, then run `pnpm db:migrate && pnpm db:seed` against it once (or create the
  database from the snapshot: `turso db create snacks-in-a-van --from-file web/data/seed.db`).
  Remote databases do not migrate themselves: run `pnpm db:migrate` after pulling new
  migrations (2026 added `0001_governance_tables`, `0002_append_only_triggers`,
  `0003_analytics_imputation_ai_verification` and `0004_ai_log_trigger_covers_verification`).
- Without those variables the app copies `data/seed.db` to `/tmp` on each cold start
  (writable but ephemeral) and shows a "Demo mode" notice. Every function instance then
  has its own copy, and there are many: Vercel serves the App Router pages, the Route
  Handlers and the static landing page from separate functions, and runs several instances
  of each at once (a page load's parallel link prefetches are enough to start them). So
  writes are not reliable: a new account may not be able to log in on the next request, a
  just-placed order can show "not found", and orders do not reach the vendor board.
  Browsing (map, menus, community, records, the seeded vendor board) works. Moving the
  polling into the pages' function was tried and does not help, because those instances
  don't share `/tmp` either; only a shared database does.
  **The current production deployment runs in this mode until a Turso database is
  connected**; locally both portals share `data/app.db` and the full cross-portal flow works.
  The 2026 audit tables share the limitation: on production their rows are per instance and
  temporary, so the audit trail is only durable locally or once Turso is connected
  ([DR-004](docs/decisions/DR-004-turso-vs-tmp-fallback.md)). The showcase screenshots were
  therefore taken against a local production build.
- Functions run in Sydney (`syd1`, set in `web/vercel.json`), next to the Melbourne
  visitors and to a Turso database created from Australia.
- Place search autocompletes through Photon. If Photon is slow or down, it is skipped for a
  minute and typing only matches the bundled suburb list; pressing Enter then runs one
  explicit Nominatim search (allowed by its usage policy, unlike autocomplete).

## 2026 upgrade: statistics, experiments and governance

The upgrade adds analysis around the original app; the ported 2021 rules, their parity tests
and the demo data are unchanged.

### Bring-your-own-key AI (optional)

The only AI feature is the vendor's **shift summary** on `/vendor`. Nothing else needs or
uses AI, and without a key the app makes no AI calls.

- Click the key icon in the vendor header, pick Anthropic (default, Claude Haiku 4.5; Claude
  Sonnet 5.5 optional) or OpenAI (type any model id), and paste **your own** key.
- The key is kept in this browser only: session storage by default, local storage only if you
  switch on "remember on this device", and "Forget key" removes it. It is never sent to this
  app's server, never logged and never committed.
- The request goes **directly from your browser** to the provider (Anthropic's Messages API
  with the `anthropic-dangerous-direct-browser-access` header, or OpenAI's Chat Completions
  API) and carries only today's aggregate figures for the van, shown in full under "Exactly
  what is sent to the provider". No customer names, emails, order ids or comments.
- Before contacting the provider the browser asks the server for a short-lived signed
  reservation, so the session and rate limits are checked before anything is billed to your
  key.
- The output is validated with zod, labelled **AI-generated** with the provider and model
  ("AI draft, edited by the vendor" once edited), checked number by number against the
  figures sent (dates and times only in date or time form), and waits for the vendor to
  accept, edit or reject it.
- Each call made through the app (successful or not) is posted afterwards, **without the
  key**, against its reservation. The server checks the prompt is the app's own with valid
  figures for that van, validates the output, recomputes the fact check, refuses anything
  shaped like a key, and writes it to the `ai_audit_log` table. The records are still
  reported by the browser, and the server cannot prove they match a real provider response
  ([DR-006](docs/decisions/DR-006-verifying-client-reported-ai-records.md)). View the log at
  **`/admin/ai-log`** (one-click demo admin) with JSON and CSV export, or as a table in
  `/admin/records`. Policy: [AI use statement](docs/ai-use-statement.md).

### Methods, cards and decision records

- [`/methods`](https://snacks-in-a-van.vercel.app/methods): data provenance, the analytics
  and experiment methods, evaluation design, assumptions, limitations, what I'd change, the
  AI use statement and the privacy note.
- [`docs/model-card.md`](docs/model-card.md) (rendered at `/methods/model-card`): the
  generator, the estimators and the simulation, with evaluation and failure modes.
- Decision records in [`docs/decisions`](docs/decisions), rendered under `/methods`:
  DR-001 MongoDB to libSQL/Drizzle, DR-002 MapLibre/OpenFreeMap/Photon instead of Google
  Maps, DR-003 porting the discount-window rule, DR-004 Turso versus the `/tmp` fallback
  (including what went wrong), DR-005 censoring housekeeping close-outs instead of counting
  invented ready times, DR-006 reserving and re-verifying AI calls. Past records are never
  edited; new ones supersede them.
- [`docs/privacy-and-retention.md`](docs/privacy-and-retention.md): demo data only, what each
  table holds, retention.

### Verifying the statistics

Every helper in `web/src/lib/stats` is pinned in `stats.test.ts` to reference values computed
outside the app:

```bash
cd scripts && uv run python verify_stats.py   # statsmodels / scipy: Wilson, Newcombe, z-test,
                                              # power and sample size, exact permutation test
Rscript scripts/verify_km.R                    # R survival: Kaplan–Meier, Greenwood, log-log CIs
```

The experiment analysis is also calibrated against known truth by a committed script with
fixed seeds:

```bash
cd web && pnpm calibrate           # writes docs/calibration.json (2,000 runs per row)
cd web && pnpm calibrate --check   # fails if the committed file is not reproduced exactly
```

With 583 customers per arm, a baseline of 35% and an injected effect of +8 points (seeds 1 to
2,000), the 95% interval covered the truth in 95.7% of runs (Wilson 95% CI 94.7% to 96.5%)
and the z-test rejected in 79.8% (78.0% to 81.5%) where 80% power was planned; with no effect
(seeds 2,001 to 4,000) it rejected in 4.6% (3.8% to 5.6%). The test suite re-runs both rows
from the seeds and resampling pool stored in the file. Details in the
[model and data card](docs/model-card.md).

## How the data was produced

The original MongoDB data no longer exists, so the demo database is generated by a
deterministic seed ([`web/src/db/seed.ts`](web/src/db/seed.ts), PRNG seed 4399):

- **Menu**: the eight products and prices recovered from the page the 2021 app rendered,
  saved in `coursework/Mockup 2/Customer Task 1 output.html`. Descriptions and the snack
  illustrations are new.
- **Vans**: 15 van names taken from the team's original vendor list (names only; its
  plaintext passwords were never reused), parked at public landmarks around the CBD,
  Carlton and Parkville. Every van gets a fresh hashed demo password.
- **Customers, orders, ratings and blog posts**: synthetic, using reserved example
  domains. Three weeks of order history are generated with the same pricing and
  order-ID code the app uses.

## Credits

Group 4399, INFO30005 Semester 1 2021:

- **Sunchuangyu (Rin) Huang**: vendor app design, customer ordering, outstanding-orders list,
  customer and vendor login, the map (nearest van) and blog bonus features, vendor CSS; the
  2026 revival.
- **Bin Liang**: database schema design, snack details, marking orders fulfilled, order
  details, completed orders, the rating bonus feature.
- **Declan Gannon**: customer app foundations, menu styling, customer profile, vendor order
  search, project report and tests.
- **Khin Liew**: customer app foundations and mock-up annotations, starting an order, vendor
  outstanding orders, history and order details.
- **Wei (Eric) Zhao**: customer design polish, van status, multi-snack orders, cart features,
  password hashing, Passport strategies and route guards.

Map data © OpenStreetMap contributors; tiles by [OpenFreeMap](https://openfreemap.org);
geocoding by [Photon](https://photon.komoot.io) and Nominatim.

## Academic integrity

The original 2021 submission is preserved in [`coursework/`](coursework) for reference,
moved with `git mv` so its history is intact. Its contents are unchanged except for
redacted secrets (see [`coursework/README.md`](coursework/README.md)). The university's
assignment specification and course materials are not reproduced in this repository or on
the website; descriptions of the brief are paraphrased. If you are a current INFO30005
student, please do your own work.
