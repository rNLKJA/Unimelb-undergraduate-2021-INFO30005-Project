/**
 * JSON schemas for structured output, built from the same zod schema that
 * validates the reply, and the shared reply parser.
 *
 * Both providers are asked for strict JSON: every object lists all of its
 * properties as required and forbids additional ones. `enum` is kept (both
 * APIs enforce it), so the model cannot answer "place" for "PLACE". Anthropic
 * does not accept numeric or string-length constraints in
 * `output_config.format`, and OpenAI's strict mode does not document string
 * lengths or `uniqueItems`, so those are dropped from the copies sent; zod
 * still checks every constraint after the reply arrives.
 */
import { z } from "zod";

import { AiError, type AiErrorEvidence } from "./types";

export type JsonSchema = { [key: string]: unknown };

/** Strict mode: all properties required, no additional properties, no `$schema`. */
export function strictJsonSchema(schema: JsonSchema): JsonSchema {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (node === null || typeof node !== "object") return node;
    const out: JsonSchema = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "$schema") continue;
      out[k] = visit(v);
    }
    if (out.type === "object" && out.properties && typeof out.properties === "object") {
      out.required = Object.keys(out.properties as object);
      out.additionalProperties = false;
    }
    return out;
  };
  return visit(schema) as JsonSchema;
}

/** Keywords Anthropic's structured outputs do not support. */
const ANTHROPIC_UNSUPPORTED = new Set([
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "uniqueItems",
]);

function dropKeywords(schema: JsonSchema, drop: ReadonlySet<string>): JsonSchema {
  const visit = (node: unknown, parentKey: string | null): unknown => {
    if (Array.isArray(node)) return node.map((x) => visit(x, null));
    if (node === null || typeof node !== "object") return node;
    const out: JsonSchema = {};
    for (const [k, v] of Object.entries(node)) {
      // Inside `properties`, keys are field names, not keywords.
      if (parentKey !== "properties" && drop.has(k)) continue;
      out[k] = visit(v, k);
    }
    return out;
  };
  return visit(schema, null) as JsonSchema;
}

/**
 * Keywords OpenAI's strict Structured Outputs does not list as supported
 * (it documents pattern/format, numeric bounds and minItems/maxItems).
 * Sending them risks a 400 on every call, which mocked tests cannot catch.
 */
export const OPENAI_UNSUPPORTED: ReadonlySet<string> = new Set([
  "minLength",
  "maxLength",
  "uniqueItems",
  "minProperties",
  "maxProperties",
]);

/** The strict schema both providers start from (zod's JSON Schema, all fields required). */
function strictFromZod(schema: z.ZodType): JsonSchema {
  return strictJsonSchema(z.toJSONSchema(schema) as JsonSchema);
}

/** Schema for OpenAI's `response_format` (strict mode, unsupported keywords dropped). */
export function openAiJsonSchema(schema: z.ZodType): JsonSchema {
  return dropKeywords(strictFromZod(schema), OPENAI_UNSUPPORTED);
}

/** Schema for Anthropic's `output_config.format`: strict, enums kept, bounds dropped. */
export function anthropicJsonSchema(schema: z.ZodType): JsonSchema {
  return dropKeywords(strictFromZod(schema), ANTHROPIC_UNSUPPORTED);
}

/** Parse the model's text as JSON and validate it; failures carry the evidence. */
export function parseStructured<T>(
  schema: z.ZodType<T>,
  rawText: string,
  evidence: AiErrorEvidence,
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new AiError("invalid-output", "reply was not valid JSON", undefined, evidence);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AiError(
      "invalid-output",
      result.error.issues[0]?.message ?? "schema mismatch",
      undefined,
      evidence,
    );
  }
  return result.data;
}
