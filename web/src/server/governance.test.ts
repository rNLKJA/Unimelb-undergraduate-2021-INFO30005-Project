/**
 * Governance: the append-only audit trail and its database-level guarantees,
 * against an in-memory libSQL database migrated with the committed
 * migrations (including the trigger migration 0002).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { __setTestDb } from "@/db/client";
import { createDb, enableForeignKeys, runMigrations, type DbHandle } from "@/db/connection";
import * as schema from "@/db/schema";
import { DEMO_CREDENTIALS } from "@/db/seed-data";
import { seedDatabase } from "@/db/seed";
import { auditTrail, DEMO_HOUSEKEEPING, recordAudit } from "./audit";
import {
  advanceOrder,
  cancelCustomerOrder,
  ensureVanActivity,
  placeOrder,
  simulateOrder,
} from "./orders";
import { setVanLocation, setVanStatus } from "./vans";

const MIN = 60_000;
const NOW = Date.parse("2026-10-01T03:00:00Z");
const VAN = DEMO_CREDENTIALS.vendor.vanId;
const SAM = DEMO_CREDENTIALS.customer.customerId;

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

/** Drizzle wraps driver errors ("Failed query: ..."); the trigger's message is in the cause chain. */
async function expectBlocked(promise: PromiseLike<unknown>, pattern: RegExp) {
  try {
    await promise;
  } catch (error) {
    let text = "";
    for (let e: unknown = error; e instanceof Error; e = e.cause) text += ` ${e.message}`;
    expect(text).toMatch(pattern);
    return;
  }
  throw new Error("expected the statement to be rejected");
}

const rows = () => handle.db.select().from(schema.auditLog).orderBy(asc(schema.auditLog.id));

describe("audit trail", () => {
  it("starts empty after a seed", async () => {
    expect(await rows()).toEqual([]);
  });

  it("records each vendor status change with from/to, in the same batch as the change", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW - 20 * MIN,
    });
    if (!placed.ok) throw new Error(placed.message);
    const id = placed.data.orderId;
    await advanceOrder({ vanId: VAN, orderId: id, target: "fulfilled", now: NOW });
    await advanceOrder({ vanId: VAN, orderId: id, target: "collected", now: NOW + MIN });
    // An invalid transition changes nothing and logs nothing.
    await advanceOrder({ vanId: VAN, orderId: id, target: "collected", now: NOW + 2 * MIN });

    const trail = await rows();
    expect(trail.map((r) => [r.actorRole, r.actorId, r.action, r.entityId])).toEqual([
      ["vendor", VAN, "order.fulfilled", id],
      ["vendor", VAN, "order.collected", id],
    ]);
    expect(JSON.parse(trail[0].detail ?? "{}")).toEqual({
      from: "outstanding",
      to: "fulfilled",
      van: VAN,
      minutes_to_ready: 20,
      late_discount: true,
      effective_at: new Date(NOW).toISOString(),
    });
    // The entry's own time is the server clock when it was written: never backdated.
    expect(Math.abs(trail[0].at.getTime() - Date.now())).toBeLessThan(10_000);
  });

  it("records customer cancellations and van open/close/location changes", async () => {
    const placed = await placeOrder({
      customerId: SAM,
      vanId: VAN,
      lines: [{ food: "Latte", quantity: 1 }],
      now: NOW - MIN,
    });
    if (!placed.ok) throw new Error(placed.message);
    await cancelCustomerOrder({ customerId: SAM, orderId: placed.data.orderId, now: NOW });
    await setVanStatus(VAN, false, NOW);
    await setVanLocation(VAN, { lat: -37.8, lng: 144.96, address: "Somewhere" }, NOW);
    const trail = await rows();
    expect(trail.map((r) => [r.actorRole, r.action])).toEqual([
      ["customer", "order.canceled"],
      ["vendor", "van.closed"],
      ["vendor", "van.location_updated"],
    ]);
    expect(JSON.parse(trail[1].detail ?? "{}")).toMatchObject({ from: "open", to: "closed" });
  });

  it("attributes demo upkeep to the housekeeping actor, and vendor simulations to the van", async () => {
    await ensureVanActivity(VAN, NOW);
    await simulateOrder(VAN, NOW);
    const trail = await rows();
    const system = trail.filter((r) => r.actorId === DEMO_HOUSEKEEPING);
    expect(system.map((r) => r.action).sort()).toEqual([
      "order.fulfilled",
      "order.simulated",
      "order.simulated",
      "order.simulated",
    ]);
    expect(system.every((r) => r.actorRole === "system")).toBe(true);
    expect(trail.at(-1)).toMatchObject({
      actorRole: "vendor",
      actorId: VAN,
      action: "order.simulated",
    });
  });

  it("is append-only: UPDATE and DELETE are rejected by the database", async () => {
    await recordAudit({
      actor: { role: "admin", id: "admin" },
      action: "records.exported",
      entityType: "records",
      entityId: "orders",
      detail: { rows: 3, filter: null },
    });
    await expectBlocked(
      handle.db.update(schema.auditLog).set({ action: "tampered" }),
      /append-only/,
    );
    await expectBlocked(handle.db.delete(schema.auditLog), /append-only/);
    await expectBlocked(
      handle.client.execute("UPDATE audit_log SET actor_id = 'someone-else'"),
      /append-only/,
    );
    expect((await auditTrail()).map((r) => r.action)).toEqual(["records.exported"]);
    expect(await auditTrail({ entityType: "records", entityId: "orders" })).toHaveLength(1);
    expect(await auditTrail({ entityType: "order" })).toHaveLength(0);
  });

  it("can only be emptied by a full demo reset, which leaves no reset flag behind", async () => {
    await recordAudit({
      actor: { role: "vendor", id: VAN },
      action: "van.opened",
      entityType: "van",
      entityId: VAN,
    });
    await seedDatabase(handle.db, { now: NOW, bcryptRounds: 4 });
    expect(await rows()).toEqual([]);
    const flag = await handle.db
      .select()
      .from(schema.appMeta)
      .where(eq(schema.appMeta.key, "demo_reset_in_progress"));
    expect(flag).toEqual([]);
    // With the flag gone, deletes are blocked again.
    await recordAudit({
      actor: { role: "vendor", id: VAN },
      action: "van.opened",
      entityType: "van",
      entityId: VAN,
    });
    await expectBlocked(handle.db.delete(schema.auditLog), /append-only/);
  });
});
