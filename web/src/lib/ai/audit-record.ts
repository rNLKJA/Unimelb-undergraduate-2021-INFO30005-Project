/**
 * The audit record of one AI call, as posted from the browser to the
 * server's `ai_audit_log` table, and the checks that keep API keys out of it.
 *
 * The record is built from the request payload only (prompts, schema name,
 * the aggregate metrics) and the provider's reply; the key is passed to the
 * provider adapters separately and is never part of it. As defence in depth
 * the server also rejects any record containing something shaped like a key.
 */
import { z } from "zod";
import { AI_FEATURES } from "./types";

export const HUMAN_DECISIONS = ["accepted", "edited", "rejected"] as const;
export type HumanDecision = (typeof HUMAN_DECISIONS)[number] | "pending" | "not-applicable";

export const DECISION_LABEL: Record<HumanDecision, string> = {
  pending: "Awaiting review",
  accepted: "Accepted",
  edited: "Edited",
  rejected: "Rejected",
  "not-applicable": "n/a (call failed)",
};

const ERROR_KINDS = [
  "missing-key",
  "invalid-key",
  "permission",
  "rate-limit",
  "overloaded",
  "network",
  "bad-request",
  "server",
  "refusal",
  "truncated",
  "invalid-output",
  "aborted",
] as const;

export const factCheckSchema = z.object({
  /** Numbers found in the output text. */
  checked: z.number().int().min(0),
  /** Numbers that do not appear in the metrics that were sent. */
  unsupported: z.array(z.string().max(32)).max(50),
});
export type FactCheck = z.infer<typeof factCheckSchema>;

export const aiCallRecordSchema = z
  .object({
    id: z.uuid(),
    feature: z.enum(AI_FEATURES),
    provider: z.enum(["anthropic", "openai"]),
    model: z.string().min(1).max(120),
    input: z.object({
      system: z.string().max(8_000),
      user: z.string().max(16_000),
      schema: z.string().max(80),
    }),
    output: z.unknown().nullable(),
    outputText: z.string().max(32_000).nullable(),
    error: z.object({ kind: z.enum(ERROR_KINDS), message: z.string().max(2_000) }).nullable(),
    latencyMs: z.number().min(0).max(600_000),
    usage: z
      .object({ inputTokens: z.number().int().min(0), outputTokens: z.number().int().min(0) })
      .nullable(),
    factCheck: factCheckSchema.nullable(),
  })
  .strict();

export type AiCallRecord = z.infer<typeof aiCallRecordSchema>;

/**
 * Shapes of provider secrets: Anthropic (sk-ant-...), OpenAI (sk-..., sk-proj-...)
 * and bearer headers. Long enough that ordinary prose never matches.
 */
const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{8,}/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/,
  /bearer\s+[A-Za-z0-9._-]{16,}/i,
  /x-api-key/i,
];

export function containsSecret(value: unknown): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return SECRET_PATTERNS.some((re) => re.test(text));
}

export type ParsedRecord = { ok: true; record: AiCallRecord } | { ok: false; reason: string };

/** Validate a record posted by the browser. Never echoes the offending content back. */
export function parseAiCallRecord(input: unknown): ParsedRecord {
  const parsed = aiCallRecordSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, reason: "The AI call record was not in the expected format." };
  if (containsSecret(parsed.data)) {
    return {
      ok: false,
      reason: "The record looked like it contained an API key, so it was refused.",
    };
  }
  return { ok: true, record: parsed.data };
}

export const newRecordId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.floor(Math.random() * 16) >> (Number(c) / 4))).toString(16),
      );
