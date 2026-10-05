"use server";

import { HUMAN_DECISIONS, parseAiCallRecord } from "@/lib/ai/audit-record";
import { decideAiCall, insertAiCall } from "@/server/ai-audit";
import { currentVan } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";

export type AiLogResult = { ok: true } | { ok: false; message: string };

/**
 * Append one AI call to ai_audit_log. Called by the browser after it has
 * called the provider directly with the vendor's own key. The record holds
 * the prompts, the aggregate metrics, the reply, latency and token usage,
 * never the key; anything shaped like a key is refused. The actor is taken
 * from the signed session, not from the record.
 */
export async function logAiCallAction(record: unknown): Promise<AiLogResult> {
  const van = await currentVan();
  if (!van) return { ok: false, message: "Please log in to get access" };
  // The demo vendor login is public: keep the log from being flooded.
  if (!rateLimit(`ai-log:${van.vanId}`, 30, 10 * 60_000).ok) {
    return { ok: false, message: "Too many AI calls from this van; try again in a few minutes." };
  }
  const parsed = parseAiCallRecord(record);
  if (!parsed.ok) return { ok: false, message: parsed.reason };
  try {
    await insertAiCall(parsed.record, van.vanId);
  } catch {
    return { ok: false, message: "The AI audit log could not be written." };
  }
  return { ok: true };
}

/** The human-in-the-loop decision on an AI output: accepted, edited or rejected (once). */
export async function decideAiOutputAction(
  id: string,
  decision: string,
  editedText?: string,
): Promise<AiLogResult> {
  const van = await currentVan();
  if (!van) return { ok: false, message: "Please log in to get access" };
  const choice = HUMAN_DECISIONS.find((d) => d === decision);
  if (!choice || typeof id !== "string" || id.length > 64)
    return { ok: false, message: "Unknown decision" };
  return decideAiCall({
    id,
    actorId: van.vanId,
    decision: choice,
    editedText: typeof editedText === "string" ? editedText : undefined,
  });
}
