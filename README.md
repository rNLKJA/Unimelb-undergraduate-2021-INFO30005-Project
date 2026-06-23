<div align="center">

# Snacks in a Van

### A dual-portal food ordering web application for a roving snack van

[![University of Melbourne](https://img.shields.io/badge/University-of%20Melbourne-002145)](https://www.unimelb.edu.au)
[![Subject](https://img.shields.io/badge/INFO30005-Web%20Information%20Technologies-00529B)](https://handbook.unimelb.edu.au/2021/subjects/info30005)
[![Node.js](https://img.shields.io/badge/Node.js-14-339933?logo=node.js&logoColor=fff)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=fff)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=fff)](https://www.mongodb.com)
[![Handlebars](https://img.shields.io/badge/Handlebars-Templates-f0772b?logo=handlebarsdotjs&logoColor=fff)](https://handlebarsjs.com)
[![Passport](https://img.shields.io/badge/Passport.js-Auth-34E27A?logo=passport&logoColor=fff)](https://www.passportjs.org)

</div>

> University of Melbourne, INFO30005 Web Information Technologies, Semester 1 2021.
> Group 4399 (T03) team project. Contributor: **Sunchuangyu (Rin) Huang**.

## Overview

**Snacks in a Van** is a web application for a mobile snack van business. It serves two
distinct audiences from a single Express server, each with its own login and interface:

- **Customers** browse the snack menu, add items to a cart, place orders, track their
  outstanding and completed orders, locate the van on a live map, leave ratings, and
  post to a shared blog.
- **Vendors** (the van operators) log in to manage incoming orders — viewing
  outstanding, fulfilled, collected, cancelled and completed orders — set the van's
  status (open or closed) and broadcast its current location, which is reverse-geocoded
  into a street address for customers to see.

A core piece of business logic is **time-based discounting**: orders carry a discount
window so the van can clear stock as closing time approaches. The app was built and
delivered across four mockup milestones during the semester and deployed to Heroku.

This project was completed for **INFO30005 Web Information Technologies** and is retained
as a portfolio record of early full-stack web development work.

## Features

- **Two authenticated portals** — separate customer and vendor login flows, handled by a
  single Passport setup with two local strategies and a custom session serialiser.
- **Menu and cart** — snack catalogue with images, prices and detail pages; per-customer
  cart with multi-item ordering.
- **Order lifecycle** — orders move through outstanding → fulfilled → collected, with
  cancellation, ratings and a time-based discount window.
- **Vendor dashboard** — filter and search orders by van and status; toggle van
  availability; mark orders as fulfilled, collected or discounted.
- **Live van location** — vendors push GPS coordinates that are reverse-geocoded via the
  OpenCage API; customers see the van plotted on a map.
- **Customer blog** — authenticated customers can post and read short blog entries.
- **Secure passwords** — customer credentials hashed with bcrypt; route-level
  authentication guards protect per-user resources.

## Tech Stack

| Layer            | Technology                                                   |
| ---------------- | ------------------------------------------------------------ |
| Runtime          | Node.js 14                                                   |
| Web framework    | Express 4                                                    |
| Templating       | express-handlebars (HBS)                                     |
| Database         | MongoDB Atlas via Mongoose                                   |
| Authentication   | Passport.js (passport-local), express-session, connect-flash |
| Password hashing | bcrypt (customers), MD5 (vans)                               |
| Geocoding        | OpenCage API client                                          |
| Testing          | Jest, Supertest, Taiko                                       |
| Deployment       | Heroku (`Procfile`, `web: node app.js`)                      |

## Project Structure

| Path                  | Contents                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `app.js`              | Application entry point — middleware, Handlebars engine, route mounting.                    |
| `routes/`             | `customerRouter.js` and `vendorRouter.js` — URL routing for each portal.                    |
| `controllers/`        | `customerController.js` and `vendorController.js` — request handlers and business logic.    |
| `models/`             | Mongoose schemas: `customerSchema`, `vanSchema`, `menuSchema`, `orderSchema`, `blogSchema`. |
| `config/`             | `passport.js` (auth strategies) and `checkAuthentication.js` (route guards).                |
| `views/`              | Handlebars templates, partials and layouts for both portals.                                |
| `public/`             | Static assets — CSS, images and standalone HTML pages.                                      |
| `js/`                 | Client-side helpers — cart, order updates, Handlebars helpers, utilities.                   |
| `__tests__/`          | Jest unit and integration tests for vendor status flows.                                    |
| `Mockup 1`–`Mockup 4` | Design mockups, annotations and deliverable notes per milestone.                            |

## Getting Started

**Prerequisites:** Node.js 14, npm, and access to a MongoDB instance (the project used
MongoDB Atlas). An OpenCage API key is required for the van-location geocoding feature.

**Environment:** the application reads configuration from a `.env` file (not committed)
and a `models/db.js` module (gitignored) that holds the MongoDB connection. You will need
to provide your own MongoDB connection URI and OpenCage API key, and may set `PORT`
(defaults to `3000`).

```bash
# Clone
git clone https://github.com/rNLKJA/Unimelb-undergraduate-2021-INFO30005-Project.git
cd Unimelb-undergraduate-2021-INFO30005-Project

# Install dependencies
npm install

# Provide your own models/db.js (MongoDB connection) and .env, then run
npm start          # node app.js
```

The app starts on <http://localhost:3000> and redirects to the customer login. The two
portals live at `/customer` and `/vendor`.

```bash
# Run the test suite
npm test           # jest
```

## Notes

- This is a **group project**; the README above describes the application as a whole.
  Rin's contributions spanned the vendor app design, customer ordering and
  outstanding-order views, customer and vendor login, and the bonus map and blog features.
- The original deployment was hosted on Heroku at `snacks-in-a-van-4399.herokuapp.com`;
  that free-tier instance is no longer live.
- `models/db.js` and `.env` are intentionally excluded from version control. The app will
  not connect to a database until you supply your own credentials.
- The original course README, including the full team-member contribution table and
  deliverable links, is preserved at [`_archive/README.original.md`](_archive/README.original.md).

---

<sub>Coursework completed for INFO30005 Web Information Technologies. Retained as a portfolio
record of early full-stack web development.</sub>
