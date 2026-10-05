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
login closes out demo orders left active for more than 90 minutes (as if served on time),
and simulated orders only ever come from the seeded synthetic customers.

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

## Repository structure

```
.
├── README.md
├── .github/workflows/ci.yml   # lint, typecheck, test, build (web/)
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
        ├── lib/               # framework-free domain logic (the TypeScript ports) + tests
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
| `/admin/records`, `/admin/login` | Read-only records of every table, CSV export |
| `/api/vans`, `/api/customer/orders[/id]`, `/api/vendor/board`, `/api/geocode/*`, `/api/admin/export/[table]` | Route Handlers used by the UI |

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

### Deployment notes

The Vercel project `snacks-in-a-van` deploys from `web/` (Root Directory `web` when
connected to Git; `cd web && vercel deploy --prod` from the CLI).

- Set `SESSION_SECRET` (32+ random bytes) on Vercel. This is done for production.
- For persistent, shared records set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` to a Turso
  database, then run `pnpm db:migrate && pnpm db:seed` against it once (or create the
  database from the snapshot: `turso db create snacks-in-a-van --from-file web/data/seed.db`).
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
- Functions run in Sydney (`syd1`, set in `web/vercel.json`), next to the Melbourne
  visitors and to a Turso database created from Australia.
- Place search autocompletes through Photon. If Photon is slow or down, it is skipped for a
  minute and typing only matches the bundled suburb list; pressing Enter then runs one
  explicit Nominatim search (allowed by its usage policy, unlike autocomplete).

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
