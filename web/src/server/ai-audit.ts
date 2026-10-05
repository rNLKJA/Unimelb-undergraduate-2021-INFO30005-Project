import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiAuditLog, type AiAuditLogRow } from "@/db/schema";
import type { AiCallRecord, HumanDecision } from "@/lib/ai/audit-record";
import { auditInsert } from "./audit";

/**
 * Server side of the AI audit log (`ai_audit_log`). The browser calls the
 * provider with the visitor's key, then posts a record of the call here via
 * a server action; the record never contains the key (checked again in
 * `parseAiCallRecord` before it gets this far).
 */
export async function insertAiCall(
  record: AiCallRecord,
  actorId: string,
  now: number = Date.now(),
): Promise<void> {
  const db = await getDb();
  await db.insert(aiAuditLog).values({
    id: record.id,
    createdAt: new Date(now),
    feature: record.feature,
    provider: record.provider,
    model: record.model,
    actorId,
    input: JSON.stringify(record.input),
    output: record.output == null ? null : JSON.stringify(record.output),
    outputText: record.outputText,
    errorKind: record.error?.kind ?? null,
    errorMessage: record.error?.message ?? null,
    latencyMs: Math.round(record.latencyMs),
    inputTokens: record.usage?.inputTokens ?? null,
    outputTokens: record.usage?.outputTokens ?? null,
    factCheck: record.factCheck ? JSON.stringify(record.factCheck) : null,
    // A failed call has no output to review.
    humanDecision: record.error ? "not-applicable" : "pending",
  });
}

export type DecideResult = { ok: true } | { ok: false; message: string };

/**
 * Record the human decision on an AI output, once. Only the van that made
 * the call may decide, only successful calls can be decided, and the
 * decision is also written to the append-only audit_log.
 */
export async function decideAiCall(input: {
  id: string;
  actorId: string;
  decision: Exclude<HumanDecision, "pending" | "not-applicable">;
  editedText?: string;
  now?: number;
}): Promise<DecideResult> {
  const now = input.now ?? Date.now();
  const db = await getDb();
  const [row] = await db
    .select()
    .from(aiAuditLog)
    .where(and(eq(aiAuditLog.id, input.id), eq(aiAuditLog.actorId, input.actorId)))
    .limit(1);
  if (!row) return { ok: false, message: "That AI output is not in the audit log." };
  if (row.errorKind) return { ok: false, message: "A failed call has no output to review." };
  if (row.humanDecision !== "pending")
    return { ok: false, message: "This output has already been reviewed." };
  const edited =
    input.decision === "edited" ? (input.editedText ?? "").trim().slice(0, 4000) : null;
  if (input.decision === "edited" && !edited)
    return { ok: false, message: "The edited text is empty." };
  await db.batch([
    db
      .update(aiAuditLog)
      .set({ humanDecision: input.decision, editedOutput: edited, decidedAt: new Date(now) })
      .where(eq(aiAuditLog.id, row.id)),
    auditInsert(db, {
      actor: { role: "vendor", id: input.actorId },
      action: `ai_output.${input.decision}`,
      entityType: "ai_output",
      entityId: row.id,
      detail: { feature: row.feature, model: row.model },
      effectiveAt: now,
    }),
  ]);
  return { ok: true };
}

export async function listAiCalls(limit = 200): Promise<AiAuditLogRow[]> {
  const db = await getDb();
  return db.select().from(aiAuditLog).orderBy(desc(aiAuditLog.createdAt)).limit(limit);
}

/** Flat rows for the JSON / CSV export of the AI audit log. */
export function aiCallExportRow(r: AiAuditLogRow) {
  return {
    id: r.id,
    created_at: r.createdAt.toISOString(),
    feature: r.feature,
    provider: r.provider,
    model: r.model,
    actor_id: r.actorId,
    latency_ms: r.latencyMs,
    input_tokens: r.inputTokens,
    output_tokens: r.outputTokens,
    human_decision: r.humanDecision,
    decided_at: r.decidedAt?.toISOString() ?? null,
    error_kind: r.errorKind,
    error_message: r.errorMessage,
    input: r.input,
    output: r.output,
    output_text: r.outputText,
    edited_output: r.editedOutput,
    fact_check: r.factCheck,
  };
}
