/**
 * The guided tour, as an end-to-end test.
 *
 *   pnpm showcase                                              # production, records media
 *   BASE_URL=http://localhost:3000 pnpm showcase --fresh-db    # local build, fresh demo data
 *   SHOWCASE_FAST=1 pnpm showcase:test                         # journeys only: no pauses, no video
 *
 * Each journey checks what it shows (the nearest van, the cart total, the
 * order reaching the vendor's board, the tracker following the vendor, the
 * power analysis and the seeded simulation), so a broken feature fails the
 * tour instead of producing a misleading video. Accounts are the one-click
 * demo accounts (no password is typed), the browser's location is fixed at
 * the University of Melbourne and the experiment uses fixed seeds. No AI key
 * is entered: the AI settings dialog is only opened and closed.
 *
 * Against production the tour places real demo orders on the shared demo
 * database (as any visitor can) and closes them out again as the vendor.
 */
import path from "node:path";

import { type Browser, type Locator, type Page, expect, test } from "@playwright/test";

import {
  SCREENSHOTS,
  TIME_LAPSE_LEFT_MS,
  TOUR_VAN,
  WALKTHROUGHS,
  type WalkthroughId,
} from "../src/lib/showcase";
import {
  BASE_CONTEXT,
  FAST,
  SHOT_DIR,
  Tour,
  ensureDirs,
  finishRecording,
  recordingContext,
} from "./showcase-helpers";

const walkthrough = (id: WalkthroughId) => WALKTHROUGHS.find((w) => w.id === id)!;

const VAN_SLUG = "ardeth-lavon";
const DEADLINE_MS = 15 * 60_000;
const DESKTOP = { width: 1440, height: 900 } as const;

/** The two demo orders: the customer journey's, and the one the vendor journey receives. */
const CUSTOMER_ORDER = [
  ["Flat White", 2],
  ["Fancy Biscuit", 1],
] as const;
const VENDOR_ORDER = [
  ["Cappuccino", 2],
  ["Small Cake", 1],
] as const;

type Lines = readonly (readonly [string, number])[];

const h1 = (page: Page) => page.getByRole("heading", { level: 1 });

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // The app polls every few seconds, so the network is never idle for long.
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
}

/** Wait for a MapLibre map to draw (tiles from OpenFreeMap, or the bundled fallback). */
async function mapReady(page: Page) {
  await expect(page.locator("canvas.maplibregl-canvas").first()).toBeVisible();
  await page.waitForTimeout(FAST ? 300 : 2500);
}

/**
 * Viewport screenshot to .showcase/screens/<id>.png, optionally with `align`
 * scrolled to `offset` px from the top (applied twice, after layout settles).
 */
async function shot(page: Page, id: string, align?: { target: Locator; offset: number }) {
  if (!SCREENSHOTS.some((s) => s.id === id)) throw new Error(`Unknown screenshot ${id}`);
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  for (let i = 0; i < 2; i++) {
    if (align) {
      await align.target.evaluate((el, offset) => {
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "instant" });
      }, align.offset);
    }
    await page.waitForTimeout(450);
  }
  await page.screenshot({ path: path.join(SHOT_DIR, `${id}.png`) });
}

/** One-click demo sign-in from the portal's login page (no password is typed). */
async function demoLogin(page: Page, role: "customer" | "vendor" | "admin") {
  await page.goto(`/${role}/login`);
  await page.getByRole("button", { name: `Try as demo ${role} (one click)` }).click();
  const landing = {
    customer: /\/customer$/,
    vendor: /\/vendor\/orders$/,
    admin: /\/admin\/records/,
  };
  await page.waitForURL(landing[role]);
}

/** Fill the cart from the demo van's menu (desktop layout: the steppers sit on the menu cards). */
async function fillCart(page: Page, lines: Lines) {
  await page.goto(`/customer/van/${VAN_SLUG}/menu`);
  for (const [food, quantity] of lines) {
    await page.getByRole("button", { name: `Add ${food} to cart` }).click();
    for (let i = 1; i < quantity; i++) {
      await page
        .getByRole("button", { name: `One more ${food}` })
        .first()
        .click();
    }
  }
  await page.goto("/customer/cart");
  await expect(page.getByRole("button", { name: /^Place order/ })).toBeEnabled();
}

/** Place the cart's order (cart page open) and return its id from the tracker's URL. */
async function placeCartOrder(page: Page): Promise<string> {
  await page.getByRole("button", { name: /^Place order/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/customer\/orders\/[^/]+$/);
  return decodeURIComponent(new URL(page.url()).pathname.split("/").pop()!);
}

const ticket = (page: Page, orderId: string) =>
  page.locator(`article[aria-label^="Order ${orderId} for"]`);
const column = (page: Page, title: string) => page.locator(`section[aria-label^="${title}:"]`);

test.beforeAll(() => ensureDirs());

test.describe("journeys (recorded)", () => {
  test("1. customer orders: nearest van, menu, cart, order, tracker", async ({ browser }) => {
    const context = await recordingContext(browser);
    const page = await context.newPage();
    const tour = new Tour(page, walkthrough("customer-orders"));

    await page.goto("/");
    await expect(h1(page)).toContainText("Coffee from the van");
    await settle(page);
    tour.markStart();

    // 1. Landing page, one-click demo customer.
    await tour.caption(1);
    await tour.pause(1200);
    await tour.hover(h1(page), 900);
    await tour.pause(900);
    await tour.click(page.getByRole("button", { name: "Try as customer" }).first());
    await tour.idleWhile(() => page.waitForURL(/\/customer$/));
    await expect(h1(page)).toHaveText("Find a van near you");
    await tour.idleWhile(() => mapReady(page));

    // 2. Use my location: rank the open vans by distance.
    await tour.caption(2);
    await tour.pause(900);
    await tour.click(page.getByRole("button", { name: "Use my location" }));
    await expect(
      page.getByRole("complementary").getByText("Your location", { exact: true }),
    ).toBeVisible();
    const nearest = page.getByRole("region", { name: /nearest open vans/i });
    await expect(nearest.getByRole("heading")).toHaveText(/5 nearest open vans/i);
    await tour.animating(2200); // the map fits the five nearest vans
    await tour.pause(1000);
    await tour.hover(nearest.getByRole("listitem").nth(2), 700);
    await tour.pause(700);

    // 3. Pick the nearest van and open its menu.
    await tour.caption(3);
    const first = nearest.getByRole("listitem").first().getByRole("button");
    await expect(first).toContainText(TOUR_VAN);
    await tour.click(first);
    await expect(page.getByText("Selected van")).toBeVisible();
    await tour.animating(1600); // the map centres on the van
    await tour.pause(900);
    await tour.click(page.getByRole("button", { name: "Order from this van" }));
    await tour.idleWhile(() => page.waitForURL(`**/customer/van/${VAN_SLUG}/menu`));
    await expect(page.getByRole("heading", { name: "Coffee", exact: true })).toBeVisible();
    await settle(page);

    // 4. Add to the cart.
    await tour.caption(4);
    await tour.pause(1000);
    for (const [food, quantity] of CUSTOMER_ORDER) {
      await tour.click(page.getByRole("button", { name: `Add ${food} to cart` }), { after: 600 });
      for (let i = 1; i < quantity; i++) {
        await tour.click(page.getByRole("button", { name: `One more ${food}` }).first(), {
          after: 600,
        });
      }
    }
    const summary = page.getByRole("complementary").filter({ hasText: "Your order" });
    await expect(summary).toContainText("2× Flat White");
    await tour.hover(summary.getByText("Total"), 700);
    await tour.pause(1200);

    // 5. Review the cart.
    await tour.caption(5);
    await tour.click(page.getByRole("link", { name: /Review & pay/ }));
    await tour.idleWhile(() => page.waitForURL("**/customer/cart"));
    const place = page.getByRole("button", { name: /^Place order/ });
    await expect(place).toBeEnabled();
    await tour.pause(900);
    await tour.hover(page.getByText("Pick up from"), 700);
    await tour.pause(1200);
    await tour.click(place);

    // 6. Confirm.
    await tour.caption(6);
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(TOUR_VAN);
    await tour.pause(1300);
    await tour.click(dialog.getByRole("button", { name: "Place order" }));
    const placedAt = Date.now();
    await tour.idleWhile(() => page.waitForURL(/\/customer\/orders\/[^/]+$/));
    await expect(page.getByRole("heading", { name: "Your order is being prepared" })).toBeVisible();
    await tour.idleWhile(() => mapReady(page));

    // 7. The tracker.
    await tour.caption(7);
    const ring = page.getByRole("timer");
    await tour.hover(ring, 800);
    await tour.pause(2600);
    await tour.hover(page.getByRole("heading", { name: "Order details" }), 800);
    await tour.pause(1000);
    await tour.hover(page.getByText(/left to change/), 800);
    await tour.pause(1800);

    // 8. Time-lapse: move the browser clock only, to 10 s before the deadline.
    await tour.caption(8);
    await tour.hover(ring, 600);
    await tour.pause(1200);
    await page.clock.install();
    await page.clock.fastForward(DEADLINE_MS - TIME_LAPSE_LEFT_MS - (Date.now() - placedAt));
    await expect(ring).toContainText(/0:\d\d/);
    await tour.pause(1500);

    // 9. Over time: the ring turns red and the discount applies.
    await tour.caption(9);
    await expect(ring).toContainText("Over time", { timeout: 20_000 });
    const discount = page.getByText("Late-order discount applies", { exact: true });
    await expect(discount).toBeVisible();
    await tour.pause(600);
    await tour.hover(discount, 700);
    await tour.pause(2800);

    await finishRecording(context, page, tour);
  });

  test("2. vendor fulfils: new order, fulfilled, collected, tracker follows", async ({
    browser,
  }) => {
    const context = await recordingContext(browser);
    // The customer works in a second tab of the same browser; only the vendor's tab is kept.
    const customer = await context.newPage();
    await demoLogin(customer, "customer");
    await fillCart(customer, VENDOR_ORDER);

    const page = await context.newPage();
    const tour = new Tour(page, walkthrough("vendor-fulfils"));
    await page.goto("/vendor/login");
    await expect(h1(page)).toHaveText("Vendor log in");
    await settle(page);
    tour.markStart();

    // 1. One-click demo vendor.
    await tour.caption(1);
    await tour.pause(1200);
    await tour.click(page.getByRole("button", { name: "Try as demo vendor (one click)" }));
    await tour.idleWhile(() => page.waitForURL(/\/vendor\/orders$/));
    await expect(h1(page)).toHaveText("Order board");
    await settle(page);

    // 2. The live board.
    await tour.caption(2);
    await tour.pause(800);
    await tour.hover(column(page, "Outstanding").getByRole("heading"), 700);
    await tour.pause(900);
    await tour.hover(column(page, "Ready for pickup").getByRole("heading"), 700);
    await tour.pause(900);
    await tour.hover(column(page, "Recently collected").getByRole("heading"), 700);
    await tour.pause(900);

    // 3. Today's tiles.
    await tour.caption(3);
    const onTime = page.locator("dl > div").filter({ hasText: "On time" });
    await tour.hover(onTime, 700);
    await tour.pause(2600);

    // 4. A new order arrives from the customer's tab.
    await tour.caption(4);
    await tour.glide(640, 420, 500);
    const orderId = await tour.idleWhile(() => placeCartOrder(customer));
    const fresh = ticket(page, orderId);
    await tour.idleWhile(() => expect(fresh).toBeVisible({ timeout: 20_000 }));
    await expect(column(page, "Outstanding").locator(fresh)).toHaveCount(1);
    await expect(fresh).toContainText("2×");
    await tour.pause(900);
    await tour.hover(fresh, 800);
    await tour.pause(1800);

    // 5. Fulfilled.
    await tour.caption(5);
    await tour.click(fresh.getByRole("button", { name: "Fulfilled" }));
    await expect(column(page, "Ready for pickup").locator(fresh)).toHaveCount(1);
    await expect(fresh).toHaveCount(1); // the exit animation has finished
    await tour.pause(900);
    await tour.hover(fresh, 700);
    await tour.pause(1600);

    // 6. The customer's tracker says ready.
    await tour.caption(6);
    await tour.pause(600);
    // The second tab moves to the vendor board meanwhile, ready for step 7.
    await Promise.all([
      page.goto(`/customer/orders/${encodeURIComponent(orderId)}`),
      customer.goto("/vendor/orders"),
    ]);
    await expect(page.getByRole("heading", { name: "Ready for pickup!" })).toBeVisible();
    await tour.idleWhile(() => mapReady(page));
    await tour.hover(page.getByRole("heading", { name: "Ready for pickup!" }), 700);
    await tour.pause(1800);

    // 7. Collected at the van; the tracker updates itself.
    await tour.caption(7);
    await tour.pause(1200);
    await ticket(customer, orderId).getByRole("button", { name: "Collected" }).click();
    await expect(page.getByRole("heading", { name: "Collected. Enjoy!" })).toBeVisible({
      timeout: 20_000,
    });
    await tour.pause(800);
    await tour.hover(page.getByRole("heading", { name: "Collected. Enjoy!" }), 700);
    await tour.pause(2200);

    // 8. Back on the board.
    await tour.caption(8);
    await page.goto("/vendor/orders");
    await expect(column(page, "Recently collected").locator(ticket(page, orderId))).toHaveCount(1);
    await settle(page);
    await tour.hover(ticket(page, orderId), 800);
    await tour.pause(2000);

    // 9. The optional AI shift summary: open the bring-your-own-key settings, enter nothing.
    await tour.caption(9);
    await tour.click(page.getByRole("button", { name: /^AI settings/ }));
    const settings = page.getByRole("dialog");
    await expect(settings).toBeVisible();
    await tour.pause(1200);
    await tour.hover(settings.locator("#ai-key"), 700);
    await tour.pause(1500);
    await tour.hover(settings.getByText("Remember on this device"), 700);
    await tour.pause(2000);
    await tour.click(settings.getByRole("button", { name: "Close" }));
    await expect(settings).toBeHidden();
    await tour.pause(800);

    await finishRecording(context, page, tour);
  });

  test("3. admin and experiments: records, analytics, A/B-test designer", async ({ browser }) => {
    const context = await recordingContext(browser);
    const page = await context.newPage();
    const tour = new Tour(page, walkthrough("admin-experiments"));

    await page.goto("/admin/login");
    await expect(h1(page)).toBeVisible();
    await settle(page);
    tour.markStart();

    // 1. One-click demo admin.
    await tour.caption(1);
    await tour.pause(1200);
    await tour.click(page.getByRole("button", { name: "Try as demo admin (one click)" }));
    await tour.idleWhile(() => page.waitForURL(/\/admin\/records/));
    await expect(h1(page)).toContainText("Orders");

    // 2. Every table.
    await tour.caption(2);
    const tables = page.getByRole("navigation", { name: "Tables" });
    await tour.hover(tables.getByRole("link").first(), 600);
    await tour.pause(700);
    await tour.hover(tables.getByRole("link", { name: /^Customers/ }), 600);
    await tour.pause(700);
    await tour.hover(page.getByRole("link", { name: /CSV/ }), 700);
    await tour.pause(1500);

    // 3. The audit log.
    await tour.caption(3);
    await tour.click(tables.getByRole("link", { name: /^Audit log/ }));
    await tour.idleWhile(() => page.waitForURL(/table=audit_log/));
    await expect(h1(page)).toContainText("Audit log");
    await tour.pause(900);
    await tour.hover(page.getByRole("table").getByRole("row").nth(1), 800);
    await tour.pause(2200);

    // 4. Operations analytics.
    await tour.caption(4);
    const adminNav = page.getByRole("navigation", { name: "Admin" }).first();
    await tour.click(adminNav.getByRole("link", { name: "Analytics" }));
    await tour.idleWhile(() => page.waitForURL("**/admin/analytics"));
    await expect(h1(page)).toHaveText("Operations analytics");
    await settle(page);
    await tour.pause(1200);
    await tour.scrollTo(page.getByText("Orders per day", { exact: true }).first(), {
      offset: 90,
    });
    await tour.pause(2200);

    // 5. Minutes to ready and Kaplan–Meier.
    await tour.caption(5);
    await tour.scrollTo(page.getByText("Minutes from order to ready", { exact: true }).first(), {
      offset: 90,
    });
    await tour.pause(2000);
    await tour.scrollTo(page.getByText("Time to fulfil (Kaplan–Meier)", { exact: true }).first(), {
      offset: 90,
    });
    await tour.pause(2400);

    // 6. Late-discount rate by van.
    await tour.caption(6);
    await tour.scrollTo(page.getByText("Late-discount rate by van", { exact: true }).first(), {
      offset: 90,
    });
    await tour.pause(2800);

    // 7. The A/B-test designer.
    await tour.caption(7);
    await tour.scrollTo(page.locator("body"), { offset: 0, ms: 600 });
    await tour.click(adminNav.getByRole("link", { name: "Experiments" }));
    await tour.idleWhile(() => page.waitForURL("**/admin/experiments"));
    await expect(h1(page)).toContainText("A/B test");
    await settle(page);
    await tour.scrollTo(page.getByRole("heading", { name: "Design the test" }), { offset: 90 });
    await tour.hover(page.locator("#hypothesis"), 700);
    await tour.pause(2000);

    // 8. Power analysis.
    await tour.caption(8);
    const perArm = page
      .locator("dl div")
      .filter({ hasText: /^Customers per arm/ })
      .first();
    await expect(perArm).toContainText("583");
    await tour.hover(perArm, 700);
    await tour.pause(2600);

    // 9. A smaller effect needs more customers.
    await tour.caption(9);
    const mde = page.locator("#mde");
    await tour.type(mde, "6");
    await expect(perArm).not.toContainText(/^Customers per arm583$/);
    await tour.hover(perArm, 600);
    await tour.pause(2200);
    await tour.type(mde, "8");
    await expect(perArm).toContainText("583");
    await tour.pause(900);

    // 10. The default simulated run: a known +8 point effect, seed 2021.
    await tour.caption(10);
    const simCaption = page.locator("#sim-caption");
    const reading = page.getByText(/the 95% interval (covers|misses) the injected/);
    await tour.scrollTo(page.getByRole("heading", { name: "Simulate it on synthetic customers" }), {
      offset: 90,
    });
    await expect(simCaption).toContainText("Seed 2021");
    await expect(reading).toContainText("covers the injected +8 points");
    await tour.pause(900);
    await tour.scrollTo(simCaption, { offset: 110 });
    await tour.hover(page.getByText("Difference (Newcombe 95% CI)"), 700);
    await tour.pause(1600);
    await tour.hover(reading, 700);
    await tour.pause(2200);

    // 11. Another seed: this run misses, as about 1 in 20 do.
    await tour.caption(11);
    await tour.type(page.locator("#seed"), "4399");
    await tour.click(page.getByRole("button", { name: "Run simulation" }));
    await expect(simCaption).toContainText("Seed 4399");
    await expect(reading).toContainText("misses the injected +8 points");
    await tour.pause(900);
    await tour.hover(page.getByText("Difference (Newcombe 95% CI)"), 700);
    await tour.pause(1400);
    await tour.hover(reading, 700);
    await tour.pause(2600);

    // 12. Don't peek.
    await tour.caption(12);
    await tour.scrollTo(page.getByRole("heading", { name: /Don't peek/ }), { offset: 90 });
    await tour.click(
      page.getByRole("group", { name: "Interim looks" }).getByRole("button", { name: "5" }),
    );
    await tour.click(page.getByRole("button", { name: /^Run 10,000 A\/A tests/ }));
    await expect(page.getByRole("button", { name: /^Run 10,000 A\/A tests/ })).toBeEnabled({
      timeout: 60_000,
    });
    await tour.pause(3200);

    await finishRecording(context, page, tour);
  });
});

async function desktopContext(browser: Browser, colorScheme: "light" | "dark" = "light") {
  return browser.newContext({
    ...BASE_CONTEXT,
    viewport: DESKTOP,
    deviceScaleFactor: 1,
    colorScheme,
  });
}

test.describe("screenshots", () => {
  test.skip(FAST, "screenshots are skipped in fast mode");

  test("landing (light and dark) and methods", async ({ browser }) => {
    for (const scheme of ["light", "dark"] as const) {
      const context = await desktopContext(browser, scheme);
      const page = await context.newPage();
      await page.goto("/");
      await expect(h1(page)).toContainText("Coffee from the van");
      await settle(page);
      await page.waitForTimeout(1500);
      await shot(page, scheme === "light" ? "01-landing-light" : "02-landing-dark");
      if (scheme === "light") {
        await page.goto("/methods");
        await expect(h1(page)).toBeVisible();
        await settle(page);
        await shot(page, "13-methods");
      }
      await context.close();
    }
  });

  test("customer: van finder, menu, tracker, community", async ({ browser }) => {
    const context = await desktopContext(browser);
    const page = await context.newPage();
    await demoLogin(page, "customer");
    await mapReady(page);
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(
      page.getByRole("complementary").getByText("Your location", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button").filter({ hasText: TOUR_VAN }).first().click();
    await mapReady(page);
    await shot(page, "03-van-finder");

    await fillCart(page, CUSTOMER_ORDER);
    await page.goto(`/customer/van/${VAN_SLUG}/menu`);
    await expect(page.getByRole("complementary").filter({ hasText: "Your order" })).toContainText(
      "2× Flat White",
    );
    await settle(page);
    await shot(page, "04-menu");

    await page.goto("/customer/cart");
    await placeCartOrder(page);
    await expect(page.getByRole("heading", { name: "Your order is being prepared" })).toBeVisible();
    await mapReady(page);
    await page.waitForTimeout(3000);
    await shot(page, "05-order-tracker");

    await page.goto("/customer/community");
    await expect(h1(page)).toHaveText("Community");
    await settle(page);
    await shot(page, "06-community");
    await context.close();
  });

  test("vendor: board, van page, AI settings", async ({ browser }) => {
    const context = await desktopContext(browser);
    const page = await context.newPage();
    await demoLogin(page, "vendor");
    await expect(h1(page)).toHaveText("Order board");
    await settle(page);
    await page.waitForTimeout(1200);
    await shot(page, "07-vendor-board");

    await page.goto("/vendor");
    await expect(h1(page)).toHaveText(TOUR_VAN);
    await mapReady(page);
    await shot(page, "08-vendor-van");

    await page.getByRole("button", { name: /^AI settings/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(600);
    await shot(page, "09-ai-settings");
    await context.close();
  });

  test("admin: audit log, analytics, experiments", async ({ browser }) => {
    const context = await desktopContext(browser);
    const page = await context.newPage();
    await demoLogin(page, "admin");
    await page.goto("/admin/records?table=audit_log");
    await expect(h1(page)).toContainText("Audit log");
    await settle(page);
    await shot(page, "10-records-audit-log");

    await page.goto("/admin/analytics");
    await expect(h1(page)).toHaveText("Operations analytics");
    await settle(page);
    await shot(page, "11-analytics", {
      target: page.getByText("Orders per day", { exact: true }).first(),
      offset: 96,
    });

    await page.goto("/admin/experiments");
    await expect(h1(page)).toContainText("A/B test");
    await settle(page);
    await shot(page, "12-experiments", {
      target: page.getByRole("heading", { name: "Design the test" }),
      offset: 80,
    });
    await context.close();
  });

  test("mobile: landing, van finder, tracker", async ({ browser }) => {
    const context = await browser.newContext({
      ...BASE_CONTEXT,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(h1(page)).toContainText("Coffee from the van");
    await settle(page);
    await page.waitForTimeout(1500);
    await shot(page, "14-mobile-landing");

    await demoLogin(page, "customer");
    await mapReady(page);
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(
      page.getByRole("complementary").getByText("Your location", { exact: true }),
    ).toBeVisible();
    await mapReady(page);
    await page.waitForTimeout(2500); // let the map finish fitting the nearest vans
    await shot(page, "15-mobile-van-finder");

    await page.goto("/customer/orders");
    await page.locator('a[href^="/customer/orders/"]').first().click();
    await page.waitForURL(/\/customer\/orders\/[^/]+$/);
    await expect(page.getByRole("timer")).toBeVisible();
    await mapReady(page);
    await shot(page, "16-mobile-order-tracker");
    await context.close();
  });
});
