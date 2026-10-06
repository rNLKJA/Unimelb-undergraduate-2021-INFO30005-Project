import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiAuditLog, type AiAuditLogRow } from "@/db/schema";
import { containsSecret, type AiCallRecord, type HumanDecision } from "@/lib/ai/audit-record";
import { auditInsert } from "./audit";

/**
 * Server side of the AI audit log (`ai_audit_log`). The browser calls the
 * provider with the visitor's key, then posts a record of the call here via
 * a server action; the record never contains the key (checked again in
 * `parseAiCallRecord` before it gets this far) and has been checked by
 * `verifyAiCallRecord` (the fact check stored here is the server's own).
 */
export async function insertAiCall(
  record: AiCallRecord,
  actorId: string,
  options: { inputMatchesServer?: boolean | null; now?: number } = {},
): Promise<void> {
  const now = options.now ?? Date.now();
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
    inputMatchesServer: options.inputMatchesServer ?? null,
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
  // Defence in depth: a key pasted into the edit box must never be stored or exported.
  if (edited && containsSecret(edited)) {
    return {
      ok: false,
      message:
        "The edit looked like it contained an API key, so it was not saved. Remove it and try again.",
    };
  }
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

export type AiLogTotals = {
  calls: number;
  byDecision: Partial<Record<HumanDecision, number>>;
  /** Calls whose (server-computed) fact check listed at least one unsupported number. */
  factCheckFlagged: number;
  /** Calls whose prompt figures no longer matched the server's when logged. */
  inputNotCurrent: number;
};

/** Summary counts over the WHOLE table (the page lists only the latest calls). */
export async function aiLogTotals(): Promise<AiLogTotals> {
  const db = await getDb();
  const [byDecision, [flags]] = await Promise.all([
    db
      .select({ decision: aiAuditLog.humanDecision, n: count() })
      .from(aiAuditLog)
      .groupBy(aiAuditLog.humanDecision),
    db
      .select({
        calls: count(),
        flagged: sql<number>`coalesce(sum(case when json_array_length(json_extract(${aiAuditLog.factCheck}, '$.unsupported')) > 0 then 1 else 0 end), 0)`,
        notCurrent: sql<number>`coalesce(sum(case when ${aiAuditLog.inputMatchesServer} = 0 then 1 else 0 end), 0)`,
      })
      .from(aiAuditLog),
  ]);
  return {
    calls: Number(flags?.calls ?? 0),
    byDecision: Object.fromEntries(byDecision.map((r) => [r.decision, Number(r.n)])),
    factCheckFlagged: Number(flags?.flagged ?? 0),
    inputNotCurrent: Number(flags?.notCurrent ?? 0),
  };
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
    input_matches_server: r.inputMatchesServer,
  };
}
