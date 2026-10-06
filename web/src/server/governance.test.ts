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
import type { AiCallRecord } from "@/lib/ai/audit-record";
import { aiLogTotals, decideAiCall, insertAiCall, listAiCalls } from "./ai-audit";
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

describe("AI audit log", () => {
  const record = (id: string, extra: Partial<AiCallRecord> = {}): AiCallRecord => ({
    id,
    feature: "shift-summary",
    provider: "anthropic",
    model: "claude-haiku-4-5",
    input: { system: "sys", user: '{"ordersPlaced": 4}', schema: "shift_summary" },
    output: { headline: "4 orders" },
    outputText: '{"headline":"4 orders"}',
    error: null,
    latencyMs: 812.4,
    usage: { inputTokens: 300, outputTokens: 60 },
    factCheck: { checked: 1, unsupported: [] },
    ...extra,
  });
  const ID = "6f1c1d1e-2b3a-4c5d-8e9f-0a1b2c3d4e5f";
  const FAILED = "7f1c1d1e-2b3a-4c5d-8e9f-0a1b2c3d4e5f";

  it("stores each call and lets the van that made it decide once", async () => {
    await insertAiCall(record(ID), VAN, { now: NOW });
    await insertAiCall(
      record(FAILED, {
        output: null,
        outputText: null,
        error: { kind: "invalid-key", message: "bad" },
        usage: null,
      }),
      VAN,
      { now: NOW + 1, inputMatchesServer: true },
    );
    const [failed, ok] = await listAiCalls();
    expect(failed).toMatchObject({
      id: FAILED,
      humanDecision: "not-applicable",
      errorKind: "invalid-key",
    });
    expect(ok).toMatchObject({
      id: ID,
      humanDecision: "pending",
      latencyMs: 812,
      inputTokens: 300,
      actorId: VAN,
    });
    expect(JSON.parse(ok.input)).toEqual(record(ID).input);

    expect(
      await decideAiCall({ id: ID, actorId: "Another Van", decision: "accepted" }),
    ).toMatchObject({ ok: false });
    expect(await decideAiCall({ id: FAILED, actorId: VAN, decision: "accepted" })).toMatchObject({
      ok: false,
    });
    expect(
      await decideAiCall({ id: ID, actorId: VAN, decision: "edited", editedText: "  " }),
    ).toMatchObject({
      ok: false,
    });
    expect(
      await decideAiCall({
        id: ID,
        actorId: VAN,
        decision: "edited",
        editedText: "Shorter note",
        now: NOW + 5,
      }),
    ).toEqual({
      ok: true,
    });
    expect(await decideAiCall({ id: ID, actorId: VAN, decision: "rejected" })).toEqual({
      ok: false,
      message: "This output has already been reviewed.",
    });
    const [, decided] = await listAiCalls();
    expect(decided).toMatchObject({ humanDecision: "edited", editedOutput: "Shorter note" });
    expect(await aiLogTotals()).toEqual({
      calls: 2,
      byDecision: { edited: 1, "not-applicable": 1 },
      factCheckFlagged: 0,
      inputNotCurrent: 0,
    });
    expect(decided.decidedAt?.getTime()).toBe(NOW + 5);
    const trail = await rows();
    expect(trail.map((r) => [r.action, r.entityId])).toEqual([["ai_output.edited", ID]]);
  });

  it("never stores an edit that looks like an API key", async () => {
    await insertAiCall(record(ID), VAN, { now: NOW });
    const res = await decideAiCall({
      id: ID,
      actorId: VAN,
      decision: "edited",
      editedText: "Note for the crew sk-ant-api03-abcdefghijklmnop",
    });
    expect(res).toMatchObject({ ok: false });
    expect(JSON.stringify(res)).not.toContain("sk-ant");
    const [row] = await listAiCalls();
    expect(row).toMatchObject({ humanDecision: "pending", editedOutput: null });
  });

  it("counts flagged fact checks and stale figures over the whole table", async () => {
    await insertAiCall(record(ID, { factCheck: { checked: 3, unsupported: ["10"] } }), VAN, {
      now: NOW,
      inputMatchesServer: false,
    });
    await insertAiCall(record(FAILED), VAN, { now: NOW + 1, inputMatchesServer: true });
    expect(await aiLogTotals()).toMatchObject({
      calls: 2,
      byDecision: { pending: 2 },
      factCheckFlagged: 1,
      inputNotCurrent: 1,
    });
  });

  it("keeps call records immutable and decisions single, at the database level", async () => {
    await insertAiCall(record(ID), VAN, { now: NOW });
    await expectBlocked(
      handle.db.update(schema.aiAuditLog).set({ outputText: "rewritten" }),
      /immutable/,
    );
    // Migration 0004 extends the trigger to the server's verification flag.
    await expectBlocked(
      handle.db.update(schema.aiAuditLog).set({ inputMatchesServer: true }),
      /immutable/,
    );
    await expectBlocked(handle.db.delete(schema.aiAuditLog), /append-only/);
    await handle.db
      .update(schema.aiAuditLog)
      .set({ humanDecision: "accepted", decidedAt: new Date(NOW) });
    await expectBlocked(
      handle.db.update(schema.aiAuditLog).set({ humanDecision: "rejected" }),
      /reviewed only once/,
    );
    await expectBlocked(
      handle.db.update(schema.aiAuditLog).set({ humanDecision: "pending" }),
      /reviewed only once/,
    );
  });
});
