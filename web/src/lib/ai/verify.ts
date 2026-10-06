/**
 * Server-side checks on an AI call record before it enters ai_audit_log.
 *
 * The provider is called from the vendor's browser (the key never reaches
 * this server), so the server receives a record of the call, not the call
 * itself. It cannot prove that a record matches a real provider response,
 * and the AI use statement says so. What it can and does check:
 *
 *  - the prompt is exactly the app's fixed shift-summary instructions plus a
 *    well-formed set of aggregate figures for the signed-in van (so no
 *    customer-level data or free text can have been sent, whatever the
 *    browser did), and whether those figures still equal the server's own;
 *  - a successful call's output has the shift-summary shape;
 *  - the fact check is recomputed here from the output and the figures in
 *    the prompt; the browser's own fact check is ignored.
 */
import { z } from "zod";
import type { AiCallRecord, FactCheck } from "./audit-record";
import {
  buildShiftSummaryRequest,
  factCheckSummary,
  SHIFT_SUMMARY_SYSTEM,
  shiftSummarySchema,
  type ShiftMetrics,
} from "./shift-summary";

const count = z.number().int().min(0).max(1_000_000);
const finite = z.number();

/** The exact shape `computeShiftMetrics` produces: aggregates only, nothing else allowed. */
export const shiftMetricsSchema: z.ZodType<ShiftMetrics> = z
  .object({
    van: z.string().min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ordersPlaced: count,
    cancelled: count,
    collected: count,
    inProgress: count,
    salesAud: finite.min(0),
    medianMinutesToReady: finite.min(0).nullable(),
    readyWithin15: z
      .object({
        ready: count,
        served: count,
        percent: finite.min(0).max(100).nullable(),
        ci95Percent: z.tuple([finite, finite]).nullable(),
      })
      .strict(),
    lateDiscounts: count,
    ratings: z.object({ count, average: finite.min(1).max(5).nullable() }).strict(),
    topItems: z
      .array(z.object({ item: z.string().min(1).max(60), quantity: count }).strict())
      .max(3),
    busiestHour: z
      .object({ hour: z.string().regex(/^\d{2}:00–\d{2}:00$/), orders: count })
      .strict()
      .nullable(),
  })
  .strict();

/**
 * The figures in a shift-summary prompt, or null unless the prompt is
 * exactly what `buildShiftSummaryRequest` renders for valid figures.
 */
export function metricsFromPrompt(user: string): ShiftMetrics | null {
  const lines = user.split("\n");
  const end = lines.indexOf("", 1);
  if (end < 2) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(lines.slice(1, end).join("\n"));
  } catch {
    return null;
  }
  const metrics = shiftMetricsSchema.safeParse(parsed);
  if (!metrics.success) return null;
  // Canonical form only: nothing added, removed or reworded around the figures.
  return buildShiftSummaryRequest(metrics.data).user === user ? metrics.data : null;
}

export type VerifiedRecord =
  | { ok: true; factCheck: FactCheck | null; inputMatchesServer: boolean }
  | { ok: false; reason: string };

/**
 * Check a parsed record (see `parseAiCallRecord`) against what the server
 * knows. `serverMetrics` are the server's current figures for the van.
 */
export function verifyAiCallRecord(
  record: AiCallRecord,
  context: { vanId: string; serverMetrics: ShiftMetrics },
): VerifiedRecord {
  if (record.feature !== "shift-summary") return { ok: false, reason: "Unknown AI feature." };
  if (record.input.system !== SHIFT_SUMMARY_SYSTEM || record.input.schema !== "shift_summary") {
    return {
      ok: false,
      reason:
        "The record's instructions are not the app's shift-summary prompt, so it was refused.",
    };
  }
  const metrics = metricsFromPrompt(record.input.user);
  if (!metrics) {
    return {
      ok: false,
      reason:
        "The record's prompt is not the app's shift-summary prompt with a valid set of figures, so it was refused.",
    };
  }
  if (metrics.van !== context.vanId) {
    return { ok: false, reason: "The figures in the record are for a different van." };
  }
  let factCheck: FactCheck | null = null;
  if (record.error == null) {
    const output = shiftSummarySchema.safeParse(record.output);
    if (!output.success) {
      return { ok: false, reason: "The record's output is not in the shift-summary format." };
    }
    factCheck = factCheckSummary(output.data, metrics);
  } else if (record.output != null) {
    return { ok: false, reason: "A failed call cannot carry a validated output." };
  }
  return {
    ok: true,
    factCheck,
    inputMatchesServer: buildShiftSummaryRequest(context.serverMetrics).user === record.input.user,
  };
}
