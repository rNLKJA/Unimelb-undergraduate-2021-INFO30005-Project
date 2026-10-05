/**
 * Integration tests for the repository layer against a real (in-memory)
 * libSQL database migrated with the committed Drizzle migrations and seeded
 * with the demo data. They exercise the business rules ported from the 2021
 * controllers end to end: placing, changing, cancelling, fulfilling,
 * collecting and rating orders, plus the records area.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { __setTestDb } from "@/db/client";
import { createDb, enableForeignKeys, runMigrations, type DbHandle } from "@/db/connection";
import { rebaseHistory } from "@/db/rebase";
import * as schema from "@/db/schema";
import { CUSTOMER_SEEDS, DEMO_CREDENTIALS, VAN_SEEDS } from "@/db/seed-data";
import { seedDatabase } from "@/db/seed";
import {
  fulfilmentMinutes,
  imputedOrders,
  lateRateByVan,
  timeToFulfil,
  type OpsOrder,
} from "@/lib/analytics/ops";
import { MESSAGES } from "@/lib/validation";
import { opsOrders } from "./analytics";
import { authenticateCustomer, changePassword, createCustomer } from "./customers";
import { listPosts, createPost, recentRatings } from "./community";
import {
  advanceOrder,
  cancelCustomerOrder,
  closeStaleDemoOrders,
  ensureCustomerActivity,
  ensureVanActivity,
  getCustomerOrder,
  listCustomerOrders,
  placeOrder,
  rateOrder,
  searchVanOrders,
  simulateOrder,
  SIMULATION_CUSTOMER_IDS,
  updateCustomerOrder,
  vendorBoard,
} from "./orders";
import { allRecords, authenticateAdmin, recordCounts, recordPage, REDACTED } from "./records";
import { authenticateVan, getVanBySlug, listVans, setVanLocation, setVanStatus } from "./vans";

const MIN = 60_000;
const NOW = Date.parse("2026-10-01T03:00:00Z"); // 1 pm in Melbourne
const SAM = DEMO_CREDENTIALS.customer.customerId;
const VAN = DEMO_CREDENTIALS.vendor.vanId;

let handle: DbHandle;

beforeAll(async () => {
  handle = createDb("file::memory:");
  await enableForeignKeys(handle.client);
  await runMigrations(handle.db);
  __setTestDb(handle);
});

beforeEach(async () => {
  await seedDatabase(handle.db, { now: NOW, bcryptRounds: 4 });
});

afterAll(() => {
  __setTestDb(undefined);
  handle.client.close();
});

describe("seed", () => {
  it("loads the recovered menu, 15 vans, demo accounts and history", async () => {
    const counts = Object.fromEntries((await recordCounts()).map((c) => [c.name, c.count]));
    expect(counts.products).toBe(8);
    expect(counts.vans).toBe(VAN_SEEDS.length);
    expect(counts.customers).toBe(CUSTOMER_SEEDS.length);
    expect(counts.admins).toBe(1);
    expect(counts.orders).toBeGreaterThan(100);
    expect(counts.order_items).toBeGreaterThan(counts.orders);
  });

  it("is deterministic apart from the timestamps", async () => {
    const first = await allRecords("orders");
    await seedDatabase(handle.db, { now: NOW, bcryptRounds: 4 });
    const second = await allRecords("orders");
    expect(second.rows.map((r) => [r.order_id, r.price, r.status])).toEqual(
      first.rows.map((r) => [r.order_id, r.price, r.status]),
    );
  });
});

describe("accounts", () => {
  it("customer login returns the original passport messages", async () => {
    expect(await authenticateCustomer("nobody@example.com", "x")).toEqual({
      ok: false,
      message: MESSAGES.customerNotFound,
    });
    expect(await authenticateCustomer(SAM, "wrong")).toEqual({
      ok: false,
      message: MESSAGES.wrongPassword,
    });
    const ok = await authenticateCustomer(SAM, DEMO_CREDENTIALS.customer.password);
    expect(ok.ok).toBe(true);
  });

  it("sign-up checks passwords first, then duplicates, like updateNewAccountToDB", async () => {
    const base = { firstName: "Test", lastName: "User", customerId: SAM };
    expect(
      await createCustomer({ ...base, password1: "abc12345", password2: "abc12346" }),
    ).toMatchObject({
      ok: false,
      message: MESSAGES.passwordsDiffer,
    });
    expect(
      await createCustomer({ ...base, password1: "abcdefgh", password2: "abcdefgh" }),
    ).toMatchObject({
      ok: false,
      message: MESSAGES.passwordRule,
    });
    expect(
      await createCustomer({ ...base, password1: "test-1234", password2: "test-1234" }),
    ).toMatchObject({
      ok: false,
      message: MESSAGES.customerExists,
    });
    expect(
      await createCustomer({
        ...base,
        customerId: "new@example.com",
        password1: "test-1234",
        password2: "test-1234",
      }),
    ).toEqual({ ok: true });
    expect((await authenticateCustomer("new@example.com", "test-1234")).ok).toBe(true);
  });

  it("change password follows the profile controller's order of checks", async () => {
    const id = CUSTOMER_SEEDS[1].customerId;
    const pw = DEMO_CREDENTIALS.customer.password;
    expect(
      await changePassword(id, {
        oldPassword: pw,
        newPassword: "abc12345",
        confirmPassword: "abc",
      }),
    ).toMatchObject({
      message: MESSAGES.newPasswordMismatch,
    });
    // The change-password rule is letters and digits only (stricter than sign-up).
    expect(
      await changePassword(id, {
        oldPassword: pw,
        newPassword: "abc-12345",
        confirmPassword: "abc-12345",
      }),
    ).toMatchObject({
      message: MESSAGES.passwordRule,
    });
    expect(
      await changePassword(id, {
        oldPassword: "nope",
        newPassword: "abc12345",
        confirmPassword: "abc12345",
      }),
    ).toMatchObject({
      message: MESSAGES.oldPasswordIncorrect,
    });
    expect(
      await changePassword(id, {
        oldPassword: pw,
        newPassword: "abc12345",
        confirmPassword: "abc12345",
      }),
    ).toEqual({
      ok: true,
      message: MESSAGES.passwordChanged,
    });
  });

  it("vendors and admins sign in with hashed demo passwords", async () => {
    expect(await authenticateVan(VAN, DEMO_CREDENTIALS.vendor.password)).toEqual({
      ok: true,
      vanId: VAN,
    });
    expect(await authenticateVan(VAN, "bad")).toEqual({
      ok: false,
      message: MESSAGES.vendorLoginFailed,
    });
    expect(await authenticateAdmin("admin", DEMO_CREDENTIALS.admin.password)).toBe(true);
    expect(await authenticateAdmin("admin", "bad")).toBe(false);
  });
});

describe("ordering (customer side)", () => {
  it("prices the cart server-side and sets the 15-minute discount deadline", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [
        { food: "Flat White", quantity: 3 },
        { food: "Small Cake", quantity: 2 },
        { food: "Plain Biscuit", quantity: 2 },
        { food: "Fancy Biscuit", quantity: 5 },
      ],
      now: NOW,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.data.orderId).toMatch(/^[A-Z]{3}\d{1,7}$/);
    const order = await getCustomerOrder(SAM, placed.data.orderId);
    expect(order).toMatchObject({ price: 127.88, status: "outstanding", orderDate: "1-10-2026" });
    expect(order!.discountTime - order!.startTime).toBe(15 * MIN);
    expect(await getCustomerOrder(CUSTOMER_SEEDS[1].customerId, placed.data.orderId)).toBeNull();
  });

  it("rejects closed vans, unknown vans, unknown snacks and empty carts", async () => {
    const closed = VAN_SEEDS.find((v) => v.status === "0")!.vanId;
    expect(
      await placeOrder({ customerId: SAM, vanId: closed, lines: [{ food: "Latte", quantity: 1 }] }),
    ).toMatchObject({ ok: false });
    expect(
      await placeOrder({ customerId: SAM, vanId: "Nope", lines: [{ food: "Latte", quantity: 1 }] }),
    ).toEqual({
      ok: false,
      message: "Van is invalid (Van doesn't exist)",
    });
    expect(
      await placeOrder({ customerId: SAM, vanId: VAN, lines: [{ food: "Pie", quantity: 1 }] }),
    ).toMatchObject({ ok: false });
    expect(await placeOrder({ customerId: SAM, vanId: VAN, lines: [] })).toEqual({
      ok: false,
      message: "please order something",
    });
  });

  it("allows changes within the 10-minute window and restarts the clock", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW,
    });
    if (!placed.ok) throw new Error(placed.message);
    const id = placed.data.orderId;
    const later = NOW + 10 * MIN + 59_000; // still inside: elapsed minutes = 10
    expect(
      await updateCustomerOrder({
        customerId: SAM,
        orderId: id,
        lines: [{ food: "Large Cake", quantity: 1 }],
        now: later,
      }),
    ).toMatchObject({ ok: true });
    const updated = (await getCustomerOrder(SAM, id))!;
    expect(updated.price).toBe(18.99);
    expect(updated.items).toEqual([{ food: "Large Cake", quantity: 1, unitPrice: 18.99 }]);
    expect(updated.startTime).toBe(later);
    expect(updated.discountTime).toBe(later + 15 * MIN);
    // 11 minutes after the (new) start the window has closed.
    expect(
      await updateCustomerOrder({
        customerId: SAM,
        orderId: id,
        lines: [{ food: "Latte", quantity: 1 }],
        now: later + 11 * MIN,
      }),
    ).toEqual({
      ok: false,
      message: "10mins past, not able to change your Order",
    });
    expect(
      await cancelCustomerOrder({ customerId: SAM, orderId: id, now: later + 11 * MIN }),
    ).toEqual({
      ok: false,
      message: "10mins past, not able to cancel this order",
    });
  });

  it("cancels inside the window; cancelled orders leave the active list", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW,
    });
    if (!placed.ok) throw new Error(placed.message);
    expect(
      await cancelCustomerOrder({
        customerId: SAM,
        orderId: placed.data.orderId,
        now: NOW + 2 * MIN,
      }),
    ).toMatchObject({ ok: true });
    const active = await listCustomerOrders(SAM, "active");
    expect(active.find((o) => o.orderId === placed.data.orderId)).toBeUndefined();
    const cancelled = await listCustomerOrders(SAM, "cancelled");
    expect(cancelled.find((o) => o.orderId === placed.data.orderId)?.status).toBe("canceled");
  });

  it("rates an order once", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW,
    });
    if (!placed.ok) throw new Error(placed.message);
    const id = placed.data.orderId;
    expect(
      await rateOrder({ customerId: SAM, orderId: id, rating: 5, comment: "  great  " }),
    ).toMatchObject({ ok: true });
    expect(await rateOrder({ customerId: SAM, orderId: id, rating: 1, comment: "" })).toMatchObject(
      { ok: false },
    );
    expect((await getCustomerOrder(SAM, id))!).toMatchObject({ rating: 5, comment: "great" });
    expect((await recentRatings(50)).some((r) => r.orderId === id)).toBe(true);
  });
});

describe("vendor side", () => {
  it("only allows outstanding -> fulfilled -> collected, with the original messages", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW,
    });
    if (!placed.ok) throw new Error(placed.message);
    const id = placed.data.orderId;
    expect(await advanceOrder({ vanId: VAN, orderId: id, target: "collected", now: NOW })).toEqual({
      ok: false,
      message: "Not valid to fulfilled order",
    });
    expect(
      await advanceOrder({ vanId: "Irma Opal", orderId: id, target: "fulfilled", now: NOW }),
    ).toEqual({
      ok: false,
      message: "Order not found",
    });
    expect(
      await advanceOrder({ vanId: VAN, orderId: id, target: "fulfilled", now: NOW + 5 * MIN }),
    ).toEqual({
      ok: true,
      message: "Order Ready for Pick Up",
    });
    expect(
      await advanceOrder({ vanId: VAN, orderId: id, target: "collected", now: NOW + 8 * MIN }),
    ).toEqual({
      ok: true,
      message: "Order Collected",
    });
    const done = (await getCustomerOrder(SAM, id))!;
    expect(done).toMatchObject({
      status: "collected",
      fulfilledTime: NOW + 5 * MIN,
      collectionTime: NOW + 8 * MIN,
      discountApplied: false,
    });
  });

  it("flags the late-order discount when fulfilled after discount_time", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW,
    });
    if (!placed.ok) throw new Error(placed.message);
    await advanceOrder({
      vanId: VAN,
      orderId: placed.data.orderId,
      target: "fulfilled",
      now: NOW + 16 * MIN,
    });
    expect((await getCustomerOrder(SAM, placed.data.orderId))!.discountApplied).toBe(true);
  });

  it("builds the live board: outstanding oldest first, then fulfilled", async () => {
    const a = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW - 5 * MIN,
    });
    const b = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 2 }],
      now: NOW - 2 * MIN,
    });
    if (!a.ok || !b.ok) throw new Error("placement failed");
    await advanceOrder({
      vanId: VAN,
      orderId: a.data.orderId,
      target: "fulfilled",
      now: NOW - MIN,
    });
    const board = await vendorBoard(VAN, NOW);
    expect(board.outstanding.map((o) => o.orderId)).toEqual([b.data.orderId]);
    expect(board.fulfilled.map((o) => o.orderId)).toEqual([a.data.orderId]);
    expect(board.stats.active).toBe(2);
  });

  it("searches history by exact and partial id, scoped to the van", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW,
    });
    if (!placed.ok) throw new Error(placed.message);
    const exact = await searchVanOrders({ vanId: VAN, q: placed.data.orderId.toLowerCase() });
    expect(exact.exact?.orderId).toBe(placed.data.orderId);
    expect(exact.rows.some((r) => r.orderId === placed.data.orderId)).toBe(true);
    expect(
      (await searchVanOrders({ vanId: "Irma Opal", q: placed.data.orderId })).exact,
    ).toBeNull();
    const collected = await searchVanOrders({ vanId: VAN, status: "collected", pageSize: 5 });
    expect(collected.rows.length).toBeLessThanOrEqual(5);
    expect(collected.rows.every((r) => r.status === "collected")).toBe(true);
  });

  it("updates van location/status; closed vans drop off the customer map", async () => {
    await setVanLocation(VAN, { lat: -37.81, lng: 144.96, address: "Typed address wins" }, NOW);
    await setVanStatus(VAN, false);
    const van = (await getVanBySlug("ardeth-lavon"))!;
    expect(van).toMatchObject({
      lat: -37.81,
      lng: 144.96,
      address: "Typed address wins",
      open: false,
      status: "0",
    });
    expect((await listVans()).filter((v) => v.open).some((v) => v.vanId === VAN)).toBe(false);
  });

  it("tops up demo activity for the vendor and customer demos", async () => {
    await ensureVanActivity(VAN, NOW);
    const board = await vendorBoard(VAN, NOW);
    expect(board.outstanding.length + board.fulfilled.length).toBeGreaterThanOrEqual(3);
    await ensureCustomerActivity(SAM, VAN, NOW);
    expect((await listCustomerOrders(SAM, "active")).length).toBeGreaterThanOrEqual(1);
  });

  it("closes out abandoned demo orders instead of showing days-old overdue tickets", async () => {
    const twoDaysAgo = NOW - 2 * 24 * 60 * MIN;
    const lines = [{ food: "Latte", quantity: 1 }];
    const stale = await placeOrder({ customerId: SAM, vanId: VAN, lines, now: twoDaysAgo });
    const staleReady = await placeOrder({ customerId: SAM, vanId: VAN, lines, now: twoDaysAgo });
    expect(stale.ok && staleReady.ok).toBe(true);
    if (!stale.ok || !staleReady.ok) return;
    await advanceOrder({
      vanId: VAN,
      orderId: staleReady.data.orderId,
      target: "fulfilled",
      now: twoDaysAgo + 20 * MIN,
    });
    const fresh = await placeOrder({ customerId: SAM, vanId: VAN, lines, now: NOW - 5 * MIN });
    expect(fresh.ok).toBe(true);

    await ensureVanActivity(VAN, NOW);
    const board = await vendorBoard(VAN, NOW);
    const active = [...board.outstanding, ...board.fulfilled];
    expect(active.length).toBeGreaterThanOrEqual(3);
    expect(active.every((o) => NOW - o.startTime < 90 * MIN)).toBe(true);
    expect(active.some((o) => fresh.ok && o.orderId === fresh.data.orderId)).toBe(true);

    const closed = (await getCustomerOrder(SAM, stale.data.orderId))!;
    expect(closed).toMatchObject({ status: "collected", discountApplied: false });
    expect(closed.fulfilledTime! - closed.startTime).toBe(12 * MIN);
    const late = (await getCustomerOrder(SAM, staleReady.data.orderId))!;
    expect(late).toMatchObject({ status: "collected", discountApplied: true });
    expect(late.collectionTime! - late.fulfilledTime!).toBe(5 * MIN);

    // The invented ready time is flagged; a real one is not.
    const flags = await handle.db
      .select({
        orderId: schema.orders.orderId,
        imputed: schema.orders.fulfilmentImputed,
        closedOutAt: schema.orders.closedOutAt,
      })
      .from(schema.orders)
      .where(inArray(schema.orders.orderId, [stale.data.orderId, staleReady.data.orderId]));
    const flagOf = new Map(flags.map((f) => [f.orderId, f]));
    expect(flagOf.get(stale.data.orderId)).toMatchObject({ imputed: true });
    expect(flagOf.get(staleReady.data.orderId)).toMatchObject({ imputed: false });
    expect(flagOf.get(stale.data.orderId)?.closedOutAt?.getTime()).toBe(NOW);

    // Nothing left to close; recent orders are untouched.
    expect(await closeStaleDemoOrders({ customerId: SAM }, NOW)).toBe(0);
  });

  it("keeps housekeeping's invented ready times out of the analytics", async () => {
    const before = await opsOrders();
    const at12 = (orders: OpsOrder[]) => fulfilmentMinutes(orders).filter((m) => m === 12).length;
    const kmEventsAt12 = (orders: OpsOrder[], now: number) =>
      timeToFulfil(orders, now).km.steps.find((st) => st.time === 12)?.nEvent ?? 0;
    // Twenty demo logins, 100 minutes apart: each one tops the board up with
    // simulated orders and closes out the previous login's leftovers.
    for (let i = 0; i < 20; i++) await ensureVanActivity(VAN, NOW + i * 100 * MIN);
    const later = NOW + 20 * 100 * MIN;
    const after = await opsOrders();
    const imputed = after.filter((o) => o.fulfilmentImputed);
    expect(imputed.length).toBeGreaterThanOrEqual(19 * 2);
    expect(imputedOrders(after)).toBe(imputed.length);
    expect(
      imputed.every((o) => o.closedOutAt != null && o.closedOutAt - o.startTime >= 90 * MIN),
    ).toBe(true);
    // No new 12-minute "observations" and no spike of events at 12 minutes.
    expect(at12(after)).toBe(at12(before));
    expect(kmEventsAt12(after, later)).toBe(kmEventsAt12(before, NOW));
    const ttf = timeToFulfil(after, later);
    expect(ttf.closedOut).toBe(imputed.length);
    // The late-discount rate is over served orders with a recorded ready time only.
    const late = lateRateByVan(after).overall;
    expect(late.n).toBe(fulfilmentMinutes(after).length);
    expect(late.n).toBe(
      after.filter(
        (o) => o.fulfilledTime != null && !o.fulfilmentImputed && o.status !== "canceled",
      ).length,
    );
  });

  it("never simulates orders as the demo customer or a visitor account", async () => {
    expect(SIMULATION_CUSTOMER_IDS).not.toContain(SAM);
    const visitor = await createCustomer({
      firstName: "Vera",
      lastName: "Visitor",
      customerId: "vera@visitor.test",
      password1: "Visitor2026",
      password2: "Visitor2026",
    });
    expect(visitor.ok).toBe(true);
    for (let i = 0; i < 25; i++) {
      const placed = await simulateOrder(VAN, NOW);
      expect(placed.ok).toBe(true);
      if (!placed.ok) continue;
      const row = await handle.db
        .select({ customerId: schema.orders.customerId })
        .from(schema.orders)
        .where(eq(schema.orders.orderId, placed.data.orderId));
      expect(SIMULATION_CUSTOMER_IDS).toContain(row[0].customerId);
    }
  });
});

describe("community and records", () => {
  it("posts to the board newest first without exposing emails", async () => {
    await createPost(SAM, "Hello from the tests", NOW + MIN);
    const posts = await listPosts(SAM);
    expect(posts[0]).toMatchObject({
      content: "Hello from the tests",
      authorName: "Sam S.",
      mine: true,
      date: "1-10-2026",
    });
    expect(JSON.stringify(posts)).not.toContain("@");
  });

  it("pages, searches and redacts records", async () => {
    const customers = await recordPage("customers", { q: "olivia", page: 1, pageSize: 10 });
    expect(customers.total).toBe(1);
    expect(customers.rows[0].password).toBe(REDACTED);
    expect(customers.columns).toContain("customer_id");
    const all = await allRecords("vans");
    expect(all.rows.every((r) => r.password === REDACTED)).toBe(true);
  });
});

describe("snapshot rebasing", () => {
  it("moves all timestamps by the same delta and rewrites the legacy date strings", async () => {
    const before = await handle.db.select().from(schema.orders).limit(1);
    const later = NOW + 3 * 24 * 60 * MIN;
    const result = await rebaseHistory(handle.client, later);
    expect(result).toEqual({ shifted: true, delta: later - NOW });
    const [after] = await handle.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, before[0].id));
    expect(after.startTime.getTime() - before[0].startTime.getTime()).toBe(later - NOW);
    expect(after.orderDate).not.toBe(before[0].orderDate);
    expect(await rebaseHistory(handle.client, later)).toEqual({ shifted: false, delta: 0 });
  });
});
