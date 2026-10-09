# Original coursework submission (2021)

This folder preserves the **original** INFO30005 Web Information Technologies group
project, *Snacks in a Van* (Group 4399, tutorial T03, Semester 1 2021), exactly as it was
submitted, moved here with `git mv` so its history is intact. The revived app lives in
[`../web`](../web).

## What is inside

| Path | Contents |
| --- | --- |
| `app.js`, `Procfile` | Express 4 entry point and Heroku process file |
| `routes/` | `customerRouter.js`, `vendorRouter.js` |
| `controllers/` | `customerController.js` (orders, cart, map, blog, profile), `vendorController.js` (van status, order states, search) |
| `models/` | Mongoose schemas: customer, van, menu (product), order (+ order items), blog |
| `config/` | Passport local strategies (customer + vendor) and route guards |
| `views/` | 38 Handlebars files: 25 page templates, 12 partials and the layout |
| `public/`, `js/` | CSS, images, static HTML and browser-side helpers (cart, order update, utility) |
| `__tests__/` | Jest unit + Supertest integration tests for the vendor status flow |
| `Mockup 1` – `Mockup 4` | Milestone deliverables: design PDF and XD files, Postman collection, screenshots, notes |
| `Web Info Tech Report.pdf` | The team's final report (database design, page-flow diagrams) |
| `_archive/README.original.md` | The original course README with the contribution table |
| `package.json`, `package-lock.json`, `.prettierrc.json` | Original Node 14 toolchain |

## Running the original (for reference)

The original MongoDB Atlas cluster and Heroku deployment no longer exist, and the
database connector `models/db.js` and `.env` were never committed. To run it you need to
supply your own:

```bash
cd coursework
npm install                     # Node 14 era dependencies; newer Node may need --legacy-peer-deps
# create models/db.js that connects mongoose to your MongoDB and requires the five schemas
# export SESSION_SECRET=... and OPENCAGE_API_KEY=... (and a Google Maps key for views/map.hbs)
npm start                       # node app.js -> http://localhost:3000
npm test                        # jest (integration test needs a seeded database)
```

## Redactions made during the 2026 revival

To keep secrets out of the current tree (they remain in older git history and the
Google Maps key should be revoked by its owner):

- `views/map.hbs`, `views/orderMap.hbs`: hard-coded Google Maps API key replaced with
  `YOUR_GOOGLE_MAPS_API_KEY`.
- `app.js`: hard-coded session secret replaced with `process.env.SESSION_SECRET`.
- `__tests__/vendorStatusIntegration.js`: plaintext vendor password replaced with
  `process.env.VAN_TEST_PASSWORD`.
- `vendor login info.csv` (100 plaintext vendor passwords) is not part of this tree. Only
  the van *names* were reused to seed the revived app, with freshly hashed demo passwords.

No other file contents were changed.
