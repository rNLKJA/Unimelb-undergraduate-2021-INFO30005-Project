/**
 * One entry point for every AI call: picks the provider adapter, times the
 * call, builds the audit record (success or failure) from the request
 * payload and the reply, and hands it to the sink, which posts it to the
 * server's ai_audit_log WITHOUT the key.
 */
import { callAnthropic } from "./anthropic";
import { type AiCallRecord, type FactCheck, newRecordId } from "./audit-record";
import { callOpenAI } from "./openai";
import {
  AiError,
  type Credentials,
  type FetchLike,
  type StructuredRequest,
  type StructuredResponse,
} from "./types";

/** Where audit records go. Resolves when the record is stored; rejects if it could not be. */
export type AuditSink = (record: AiCallRecord) => Promise<void>;

export interface CallOptions<T> {
  sink: AuditSink;
  fetch?: FetchLike;
  signal?: AbortSignal;
  /** Automatic check of the output, stored with the record. */
  check?: (data: T) => FactCheck;
  now?: () => number;
}

export interface CallResult<T> extends StructuredResponse<T> {
  record: AiCallRecord;
}

export async function callStructured<T>(
  credentials: Credentials,
  req: StructuredRequest<T>,
  { sink, fetch, signal, check, now = () => performance.now() }: CallOptions<T>,
): Promise<CallResult<T>> {
  const base = {
    id: newRecordId(),
    feature: req.feature,
    provider: credentials.provider,
    model: credentials.model,
    // The request payload only. The key is never part of a record.
    input: { system: req.system, user: req.user, schema: req.schemaName },
  };
  const started = now();
  let res: StructuredResponse<T>;
  try {
    if (!credentials.apiKey.trim()) throw new AiError("missing-key");
    const call = credentials.provider === "anthropic" ? callAnthropic : callOpenAI;
    res = await call(credentials.apiKey.trim(), credentials.model, req, { fetch, signal });
  } catch (err) {
    const error = err instanceof AiError ? err : new AiError("network", String(err));
    const record: AiCallRecord = {
      ...base,
      output: null,
      // Whatever came back (a cut-off or malformed reply) and the tokens it
      // cost are kept, so the evidence behind a failure can be inspected.
      outputText: error.rawText,
      error: { kind: error.kind, message: error.message },
      latencyMs: Math.round(now() - started),
      usage: error.usage,
      factCheck: null,
    };
    // A failed call is still logged; never let logging hide the real error.
    await sink(record).catch(() => undefined);
    throw error;
  }
  const record: AiCallRecord = {
    ...base,
    model:
      res.model && res.model !== credentials.model
        ? `${credentials.model} → ${res.model}`
        : credentials.model,
    output: res.data,
    outputText: res.rawText,
    error: null,
    latencyMs: Math.round(now() - started),
    usage: res.usage,
    factCheck: check ? check(res.data) : null,
  };
  // Successful output is only returned once it is on the record.
  await sink(record);
  return { ...res, record };
}
