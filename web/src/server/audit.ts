import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { Db } from "@/db/connection";
import { auditLog, type AuditLogRow } from "@/db/schema";

/**
 * The append-only audit trail (`audit_log`). Writes go through here so every
 * entry has the same shape; state changes batch their audit insert with the
 * change itself, so neither can land without the other.
 */
export type AuditActor =
  | { role: "vendor"; id: string }
  | { role: "admin"; id: string }
  | { role: "customer"; id: string }
  | { role: "system"; id: typeof DEMO_HOUSEKEEPING };

/** The actor recorded for automated demo upkeep (top-ups, closing out stale demo orders). */
export const DEMO_HOUSEKEEPING = "demo-housekeeping";
export const SYSTEM_ACTOR: AuditActor = { role: "system", id: DEMO_HOUSEKEEPING };

export type AuditEvent = {
  actor: AuditActor;
  action: string;
  entityType: "order" | "van" | "records" | "ai_output" | "ai_log" | "session";
  entityId: string;
  detail?: Record<string, string | number | boolean | null>;
  /**
   * When the change takes effect in business terms, if not "now" (the demo
   * top-up backdates simulated orders). Stored in the detail; `at` is always
   * the server's clock when the entry is written, so the trail is never backdated.
   */
  effectiveAt?: number;
};

/** An insert statement for one event, for use inside `db.batch([...])`. */
export function auditInsert(db: Db, event: AuditEvent, clock: () => number = Date.now) {
  const at = clock();
  const detail: Record<string, string | number | boolean | null> = { ...event.detail };
  if (event.effectiveAt != null && Math.abs(event.effectiveAt - at) > 1000) {
    detail.effective_at = new Date(event.effectiveAt).toISOString();
  }
  return db.insert(auditLog).values({
    at: new Date(at),
    actorRole: event.actor.role,
    actorId: event.actor.id,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    detail: Object.keys(detail).length ? JSON.stringify(detail) : null,
  });
}

export async function recordAudit(event: AuditEvent): Promise<void> {
  const db = await getDb();
  await auditInsert(db, event);
}

export async function auditTrail(
  filter: { entityType?: string; entityId?: string; limit?: number } = {},
): Promise<AuditLogRow[]> {
  const db = await getDb();
  const conditions = [];
  if (filter.entityType) conditions.push(eq(auditLog.entityType, filter.entityType));
  if (filter.entityId) conditions.push(eq(auditLog.entityId, filter.entityId));
  return db
    .select()
    .from(auditLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.id))
    .limit(Math.min(500, filter.limit ?? 100));
}
