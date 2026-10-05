"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import {
  containsSecret,
  HUMAN_DECISIONS,
  parseAiCallRecord,
  type FactCheck,
} from "@/lib/ai/audit-record";
import { AI_FEATURES } from "@/lib/ai/types";
import { verifyAiCallRecord } from "@/lib/ai/verify";
import { decideAiCall, insertAiCall } from "@/server/ai-audit";
import { currentVan } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { signAiReservation, verifyAiReservation } from "@/server/session";
import { shiftMetricsFor } from "@/server/shift";

export type AiReserveResult =
  | { ok: true; id: string; token: string }
  | { ok: false; message: string };

const WINDOW_MS = 10 * 60_000;

/**
 * Step 1 of an AI call, BEFORE the browser calls the provider: check the
 * session and the rate limits and issue a short-lived signed reservation for
 * one record id. Refusing here means a refused call never costs the visitor
 * anything on their own key. Limits are per van and visitor (so one visitor
 * cannot use up the shared demo van's budget) with a looser cap per van.
 */
export async function reserveAiCallAction(feature: string): Promise<AiReserveResult> {
  const van = await currentVan();
  if (!van) return { ok: false, message: "Please log in to get access" };
  const known = AI_FEATURES.find((f) => f === feature);
  if (!known) return { ok: false, message: "Unknown AI feature." };
  const visitor = clientKey(await headers());
  if (
    !rateLimit(`ai-call:${van.vanId}:${visitor}`, 20, WINDOW_MS).ok ||
    !rateLimit(`ai-call:${van.vanId}`, 120, WINDOW_MS).ok
  ) {
    return {
      ok: false,
      message:
        "Too many AI calls from this van recently; try again in a few minutes. Nothing was sent to the provider.",
    };
  }
  const id = randomUUID();
  return { ok: true, id, token: await signAiReservation({ id, vanId: van.vanId, feature: known }) };
}

export type AiLogResult =
  | { ok: true; factCheck: FactCheck | null; inputMatchesServer: boolean }
  | { ok: false; message: string };

/**
 * Step 2: append the call to ai_audit_log. The browser posts the record
 * after calling the provider directly with the vendor's own key. The record
 * holds the prompts, the aggregate figures, the reply, latency and token
 * usage, never the key; anything shaped like a key is refused. The server
 * accepts it only against a valid reservation for this van, checks the
 * prompt is the app's own with valid figures, validates the output, and
 * recomputes the fact check itself. The actor comes from the signed session.
 */
export async function logAiCallAction(record: unknown, reservation: unknown): Promise<AiLogResult> {
  const van = await currentVan();
  if (!van) return { ok: false, message: "Please log in to get access" };
  const reserved = await verifyAiReservation(reservation);
  if (!reserved || reserved.vanId !== van.vanId) {
    return { ok: false, message: "This AI call was not reserved by this van's session." };
  }
  const parsed = parseAiCallRecord(record);
  if (!parsed.ok) return { ok: false, message: parsed.reason };
  if (parsed.record.id !== reserved.id || parsed.record.feature !== reserved.feature) {
    return { ok: false, message: "The record does not match its reservation." };
  }
  const verified = verifyAiCallRecord(parsed.record, {
    vanId: van.vanId,
    serverMetrics: await shiftMetricsFor(van.vanId),
  });
  if (!verified.ok) return { ok: false, message: verified.reason };
  try {
    await insertAiCall({ ...parsed.record, factCheck: verified.factCheck }, van.vanId, {
      inputMatchesServer: verified.inputMatchesServer,
    });
  } catch {
    return {
      ok: false,
      message: "The AI audit log could not be written (or this call was already logged).",
    };
  }
  return {
    ok: true,
    factCheck: verified.factCheck,
    inputMatchesServer: verified.inputMatchesServer,
  };
}

export type AiDecideResult = { ok: true } | { ok: false; message: string };

/** The human-in-the-loop decision on an AI output: accepted, edited or rejected (once). */
export async function decideAiOutputAction(
  id: string,
  decision: string,
  editedText?: string,
): Promise<AiDecideResult> {
  const van = await currentVan();
  if (!van) return { ok: false, message: "Please log in to get access" };
  const choice = HUMAN_DECISIONS.find((d) => d === decision);
  if (!choice || typeof id !== "string" || id.length > 64)
    return { ok: false, message: "Unknown decision" };
  if (typeof editedText === "string" && containsSecret(editedText)) {
    // Never echo it back, and never store it.
    return {
      ok: false,
      message:
        "The edit looked like it contained an API key, so it was not saved. Remove it and try again.",
    };
  }
  return decideAiCall({
    id,
    actorId: van.vanId,
    decision: choice,
    editedText: typeof editedText === "string" ? editedText : undefined,
  });
}
