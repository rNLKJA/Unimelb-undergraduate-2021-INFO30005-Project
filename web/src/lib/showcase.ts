/**
 * The guided tour: recorded walkthroughs and key-feature screenshots.
 *
 * One source of truth for the step captions. The Playwright tour
 * (e2e/showcase.spec.ts) shows them as on-screen captions and writes them to
 * WebVTT files, the /tour page lists them under each video, and the README's
 * "Workflow walkthrough" repeats them. The media are produced by
 * `pnpm showcase` (scripts/showcase.mjs).
 */

export type WalkthroughId = "customer-orders" | "vendor-fulfils" | "admin-experiments";

export interface Walkthrough {
  id: WalkthroughId;
  title: string;
  /** Route the walkthrough is about (linked as "Try it yourself"). */
  route: string;
  summary: string;
  /** Accounts, data and settings, so the recording can be reproduced by hand. */
  setup: string;
  /** On-screen captions, in order (step k is shown as "k/N"). */
  steps: readonly string[];
  /** Steps (1-based) shown with the time-lapse badge: the browser clock was moved, not the server's. */
  timeLapseSteps?: readonly number[];
}

/** Badge shown on screen (and noted in the captions) while the browser clock is fast-forwarded. */
export const TIME_LAPSE_LABEL = "Time-lapse: browser clock only";

/** The time-lapse stops this long before the 15-minute deadline (milliseconds). */
export const TIME_LAPSE_LEFT_MS = 10_000;

/** Where the tour's "Use my location" puts the visitor: by the Old Quad, University of Melbourne. */
export const TOUR_LOCATION = { latitude: -37.7975, longitude: 144.9613 } as const;

/** The demo van every walkthrough orders from (the one-click vendor account). */
export const TOUR_VAN = "Ardeth Lavon";

export const WALKTHROUGHS: readonly Walkthrough[] = [
  {
    id: "customer-orders",
    title: "Customer orders",
    route: "/customer",
    summary:
      "From the landing page to a live order: find the nearest open van, add to the cart, place the order and follow it on the tracker, including what happens when the 15-minute promise runs out.",
    setup:
      "One-click demo customer; the browser's location is set to the University of Melbourne; order 2 × Flat White and 1 × Fancy Biscuit from Ardeth Lavon.",
    steps: [
      "Start on the landing page and try the customer app with the one-click demo account",
      "Use my location: open vans are ranked by distance and the five nearest are listed",
      "Pick the nearest van, Ardeth Lavon at the University of Melbourne",
      "Its menu: add a flat white, make it two, and add a fancy biscuit",
      "Review the cart and place the order (the server recomputes the price)",
      "Confirm: the order goes straight to the van",
      "The live tracker: status timeline, the 15-minute ring and 10 minutes to change or cancel",
      "Time-lapse: the browser clock jumps to 10 s before the 15-minute deadline (the server is untouched)",
      "At 15:00 the ring turns red and the late-order discount applies; changes closed at 10 minutes",
    ],
    timeLapseSteps: [8, 9],
  },
  {
    id: "vendor-fulfils",
    title: "Vendor fulfils",
    route: "/vendor/orders",
    summary:
      "Behind the hatch: the demo vendor's live board receives a new order, marks it fulfilled and then collected, and the customer's tracker follows along without a reload.",
    setup:
      "One-click demo vendor (van Ardeth Lavon). During the recording the demo customer, signed in in the same browser, orders 2 × Cappuccino and 1 × Small Cake.",
    steps: [
      "Log in as the demo vendor, van Ardeth Lavon, with one click",
      "The live board refreshes every 3 s: outstanding, ready for pickup, recently collected",
      "Today's tiles: the on-time rate comes with its n and a Wilson 95% interval",
      "A new order arrives from the demo customer, with its 15-minute countdown",
      "Mark it fulfilled: the ticket moves to Ready for pickup",
      "The customer's tracker, in the same browser, now says Ready for pickup",
      "The van marks it collected, and the tracker updates by itself within seconds",
      "Back on the board, the order sits under Recently collected",
      "Optional AI shift summary: bring your own key, kept in this browser only",
    ],
  },
  {
    id: "admin-experiments",
    title: "Admin and experiments",
    route: "/admin/records",
    summary:
      "The records area: every table and the append-only audit trail, the operations analytics with their intervals, and the A/B-test designer with a power analysis, a seeded simulation and the cost of peeking.",
    setup:
      "One-click demo admin, on the committed demo data. Experiment: late-discount rule, baseline 35%, minimum detectable effect +8 points, α = 0.05, power 80%; simulation seeds 2021 (the default) and 4399; A/A peeking seed 30005 with 5 looks.",
    steps: [
      "Open the records area with the one-click demo admin",
      "Every table with record counts, search, pagination and CSV export; password hashes redacted",
      "The append-only audit log: sign-ins, order status changes, van updates",
      "Operations analytics: every figure comes with its uncertainty and its n",
      "Minutes to ready, and the Kaplan–Meier time-to-fulfil curve with its 95% band",
      "Late-discount rate by van, each with a Wilson 95% interval",
      "The A/B-test designer: hypothesis, one primary metric, randomised by customer",
      "Power analysis: 583 customers per arm to detect 35% → 43% at α = 0.05 and 80% power",
      "A smaller effect needs more customers: 6 points raises the sample size",
      "Simulate a known +8 point effect (seed 2021): the Newcombe 95% interval covers it, both tests reject",
      "Rerun with seed 4399: this run misses the truth, as about 1 run in 20 does by design",
      "Don't peek: 10,000 A/A tests show how stopping early inflates false positives",
    ],
  },
];

export interface Screenshot {
  /** File name without extension, e.g. "01-landing-light". */
  id: string;
  title: string;
  caption: string;
  viewport: "desktop" | "mobile";
}

export const SCREENSHOTS: readonly Screenshot[] = [
  {
    id: "01-landing-light",
    title: "Landing page",
    caption: "The story, the live customer/vendor demo and one-click demo accounts.",
    viewport: "desktop",
  },
  {
    id: "02-landing-dark",
    title: "Landing page, dark mode",
    caption: "The same page in dark mode.",
    viewport: "desktop",
  },
  {
    id: "03-van-finder",
    title: "Find a van",
    caption: "The five nearest open vans, ranked by the ported 2021 distance rule.",
    viewport: "desktop",
  },
  {
    id: "04-menu",
    title: "Menu and cart",
    caption: "A van's eight-item menu with the running order total.",
    viewport: "desktop",
  },
  {
    id: "05-order-tracker",
    title: "Order tracker",
    caption: "Live status timeline, the 15-minute ring and the 10-minute change window.",
    viewport: "desktop",
  },
  {
    id: "06-community",
    title: "Community board",
    caption: "Snackers' posts, recent ratings and the top-rated vans.",
    viewport: "desktop",
  },
  {
    id: "07-vendor-board",
    title: "Vendor order board",
    caption: "Outstanding, ready and collected, with per-order countdowns and today's tiles.",
    viewport: "desktop",
  },
  {
    id: "08-vendor-van",
    title: "Van status and location",
    caption: "Open or close the van, set its spot on the map, and the optional AI shift summary.",
    viewport: "desktop",
  },
  {
    id: "09-ai-settings",
    title: "Bring your own key",
    caption: "Optional AI settings: the key stays in this browser and goes only to the provider.",
    viewport: "desktop",
  },
  {
    id: "10-records-audit-log",
    title: "Records and audit log",
    caption: "Every table with counts and CSV export; the append-only audit log.",
    viewport: "desktop",
  },
  {
    id: "11-analytics",
    title: "Operations analytics",
    caption: "Orders per day, time to ready and Kaplan–Meier, each with its interval and n.",
    viewport: "desktop",
  },
  {
    id: "12-experiments",
    title: "A/B-test designer",
    caption: "Sample size from the minimum detectable effect, then a seeded simulation.",
    viewport: "desktop",
  },
  {
    id: "13-methods",
    title: "Methods and decisions",
    caption: "Provenance, evaluation design, limitations, decision records and AI use.",
    viewport: "desktop",
  },
  {
    id: "14-mobile-landing",
    title: "Mobile: landing",
    caption: "The landing page at 390 px.",
    viewport: "mobile",
  },
  {
    id: "15-mobile-van-finder",
    title: "Mobile: find a van",
    caption: "The map and the nearest vans on a phone.",
    viewport: "mobile",
  },
  {
    id: "16-mobile-order-tracker",
    title: "Mobile: order tracker",
    caption: "Tracking an order on a phone.",
    viewport: "mobile",
  },
];

/** Public paths of a walkthrough's media (files live in web/public/showcase/). */
export function walkthroughMedia(id: WalkthroughId) {
  return {
    mp4: `/showcase/${id}.mp4`,
    poster: `/showcase/${id}-poster.webp`,
    captions: `/showcase/${id}.vtt`,
  };
}

/** Public path of a screenshot's WebP copy used by /tour. */
export const screenshotSrc = (id: string) => `/showcase/screens/${id}.webp`;

/** Pixel size of the WebP copies (desktop 1440 × 900; mobile 390 × 844 at 1.5×). */
export const SCREENSHOT_SIZE = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 585, height: 1266 },
} as const;
