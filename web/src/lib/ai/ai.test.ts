/**
 * Bring-your-own-key AI client tests. No network: every provider call goes
 * through a mocked fetch, so these tests also pin down exactly what is sent,
 * where it goes, and what never leaves the browser (the key, personal data).
 */
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callAnthropic } from "./anthropic";
import { containsSecret, parseAiCallRecord, type AiCallRecord } from "./audit-record";
import { callStructured } from "./client";
import {
  ANTHROPIC_MODELS,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  supportsEffort,
} from "./models";
import { callOpenAI, OPENAI_URL } from "./openai";
import { OPENAI_UNSUPPORTED, openAiJsonSchema } from "./schema";
import {
  DEFAULT_PREFS,
  forgetAllKeys,
  forgetSessionKeys,
  keySaveAction,
  loadAllKeys,
  loadKey,
  loadPrefs,
  maskKey,
  saveKey,
  savePrefs,
} from "./settings";
import {
  allowedNumbers,
  buildShiftSummaryRequest,
  computeShiftMetrics,
  factCheckSummary,
  shiftSummarySchema,
  summaryToText,
  type ShiftMetrics,
  type ShiftOrder,
  type ShiftSummary,
} from "./shift-summary";
import { metricsFromPrompt, verifyAiCallRecord } from "./verify";
import { AiError, type FetchLike, type StructuredRequest } from "./types";

const KEY = "sk-ant-test-0123456789-SECRET";

const Answer = z.object({ answer: z.number(), note: z.string() });
const request: StructuredRequest<z.infer<typeof Answer>> = {
  feature: "shift-summary",
  system: "You are terse.",
  user: "What is 2 + 2?",
  schema: Answer,
  schemaName: "answer",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const anthropicMessage = (text: string, extra: Record<string, unknown> = {}) => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: "claude-haiku-4-5",
  content: [{ type: "text", text }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 120, output_tokens: 18 },
  ...extra,
});

const headerOf = (init: RequestInit | undefined, name: string) =>
  new Headers(init?.headers).get(name);

/** A tiny in-memory Storage. */
function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

describe("models", () => {
  it("defaults to the cheap Haiku tier with a Sonnet option, and a user-editable OpenAI id", () => {
    expect(DEFAULT_ANTHROPIC_MODEL).toBe("claude-haiku-4-5");
    expect(ANTHROPIC_MODELS.map((m) => m.id)).toEqual(["claude-haiku-4-5", "claude-sonnet-5-5"]);
    expect(supportsEffort("claude-sonnet-5-5")).toBe(true);
    expect(supportsEffort("claude-haiku-4-5")).toBe(false);
    expect(DEFAULT_OPENAI_MODEL).toBeTruthy();
  });
});

describe("key storage", () => {
  it("keeps the key in sessionStorage by default and localStorage only when remembered", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveKey("anthropic", ` ${KEY} `, false, session, local);
    expect(loadKey("anthropic", session, local)).toEqual({ key: KEY, remembered: false });
    expect(Object.values(local.dump())).not.toContain(KEY);

    saveKey("anthropic", KEY, true, session, local);
    expect(loadKey("anthropic", session, local)).toEqual({ key: KEY, remembered: true });
    expect(Object.values(session.dump())).not.toContain(KEY);

    saveKey("openai", "sk-openai-key-123456789", false, session, local);
    expect(Object.keys(loadAllKeys(session, local)).sort()).toEqual(["anthropic", "openai"]);
    forgetAllKeys(session, local);
    expect(loadAllKeys(session, local)).toEqual({});
    expect({ ...session.dump(), ...local.dump() }).toEqual({});
  });

  it("Save never moves a key between storages unless the visitor flips the switch", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveKey("anthropic", KEY, true, session, local); // remembered on this device
    saveKey("openai", "sk-openai-key-123456789", false, session, local); // this tab only
    const saved = loadAllKeys(session, local);
    // The dialog opens on Anthropic (switch on), the visitor picks OpenAI and presses Save:
    // the switch follows OpenAI's saved key and was not touched, so nothing moves.
    const switched = {
      draftKey: "",
      stored: saved.openai ?? null,
      remember: saved.openai?.remembered ?? false,
      rememberTouched: false,
    };
    expect(keySaveAction(switched)).toBeNull();
    // Even a stale switch value is ignored unless the visitor flipped it.
    expect(keySaveAction({ ...switched, remember: true })).toBeNull();
    expect(keySaveAction({ ...switched, remember: true, rememberTouched: true })).toEqual({
      key: "sk-openai-key-123456789",
      remember: true,
    });
    expect(keySaveAction({ ...switched, draftKey: "  sk-new-key-0000000000 " })).toEqual({
      key: "sk-new-key-0000000000",
      remember: false,
    });
  });

  it("logging out clears tab-only keys and keeps remembered ones", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveKey("anthropic", KEY, true, session, local);
    saveKey("openai", "sk-openai-key-123456789", false, session, local);
    forgetSessionKeys(session);
    expect(loadAllKeys(session, local)).toEqual({ anthropic: { key: KEY, remembered: true } });
  });

  it("stores preferences (never the key) and masks keys for display", () => {
    const local = memoryStorage();
    expect(loadPrefs(local)).toEqual(DEFAULT_PREFS);
    savePrefs(local, { ...DEFAULT_PREFS, provider: "openai", openaiModel: "  my-model " });
    expect(loadPrefs(local)).toMatchObject({ provider: "openai", openaiModel: "my-model" });
    expect(JSON.stringify(local.dump())).not.toContain("sk-");
    expect(maskKey(KEY)).toBe("sk-ant…CRET");
    expect(maskKey("short")).toBe("•••••");
  });
});

describe("Anthropic adapter", () => {
  it("calls the Messages API straight from the browser with structured output", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      json(anthropicMessage('{"answer": 4, "note": "easy"}')),
    );
    const res = await callAnthropic(KEY, DEFAULT_ANTHROPIC_MODEL, request, { fetch });
    expect(res.data).toEqual({ answer: 4, note: "easy" });
    expect(res.usage).toEqual({ inputTokens: 120, outputTokens: 18 });

    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    expect(headerOf(init, "x-api-key")).toBe(KEY);
    expect(headerOf(init, "anthropic-dangerous-direct-browser-access")).toBe("true");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.system).toBe("You are terse.");
    expect(body.messages).toEqual([{ role: "user", content: "What is 2 + 2?" }]);
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format.schema).toMatchObject({
      type: "object",
      required: ["answer", "note"],
      additionalProperties: false,
    });
    expect(body.output_config.effort).toBeUndefined();
  });

  it("asks Sonnet for low effort", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      json(anthropicMessage('{"answer": 4, "note": "x"}')),
    );
    await callAnthropic(KEY, "claude-sonnet-5-5", request, { fetch });
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).output_config.effort).toBe("low");
  });

  it.each([
    [401, "invalid-key"],
    [403, "permission"],
    [429, "rate-limit"],
    [400, "bad-request"],
    [529, "overloaded"],
    [500, "server"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    const fetch = vi.fn<FetchLike>(async () =>
      json({ type: "error", error: { type: "x", message: "nope" } }, status),
    );
    await expect(
      callAnthropic(KEY, DEFAULT_ANTHROPIC_MODEL, request, { fetch }),
    ).rejects.toMatchObject({ kind });
  });

  it("reports CORS / offline failures as network errors", async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(
      callAnthropic(KEY, DEFAULT_ANTHROPIC_MODEL, request, { fetch }),
    ).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("reports refusals, truncation and bad JSON with the evidence", async () => {
    const refuse = vi.fn<FetchLike>(async () =>
      json(
        anthropicMessage("", {
          stop_reason: "refusal",
          stop_details: { type: "refusal", category: null, explanation: "no" },
        }),
      ),
    );
    await expect(
      callAnthropic(KEY, DEFAULT_ANTHROPIC_MODEL, request, { fetch: refuse }),
    ).rejects.toMatchObject({
      kind: "refusal",
    });
    const cut = vi.fn<FetchLike>(async () =>
      json(anthropicMessage('{"answer": 4', { stop_reason: "max_tokens" })),
    );
    await expect(
      callAnthropic(KEY, DEFAULT_ANTHROPIC_MODEL, request, { fetch: cut }),
    ).rejects.toMatchObject({
      kind: "truncated",
      rawText: '{"answer": 4',
      usage: { inputTokens: 120, outputTokens: 18 },
    });
    const bad = vi.fn<FetchLike>(async () =>
      json(anthropicMessage('{"answer": "four", "note": "x"}')),
    );
    await expect(
      callAnthropic(KEY, DEFAULT_ANTHROPIC_MODEL, request, { fetch: bad }),
    ).rejects.toMatchObject({
      kind: "invalid-output",
    });
  });
});

describe("OpenAI adapter", () => {
  const completion = (content: string, finish = "stop") => ({
    model: "gpt-test",
    choices: [{ finish_reason: finish, message: { content, refusal: null } }],
    usage: { prompt_tokens: 50, completion_tokens: 9 },
  });

  it("calls Chat Completions with a strict JSON schema and a bearer key", async () => {
    const fetch = vi.fn<FetchLike>(async () => json(completion('{"answer": 4, "note": "ok"}')));
    const res = await callOpenAI("sk-openai-test-key-1234567890", "gpt-test", request, { fetch });
    expect(res.data).toEqual({ answer: 4, note: "ok" });
    expect(res.usage).toEqual({ inputTokens: 50, outputTokens: 9 });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(OPENAI_URL);
    expect(headerOf(init, "authorization")).toBe("Bearer sk-openai-test-key-1234567890");
    const body = JSON.parse(String(init?.body));
    expect(body.response_format.json_schema).toMatchObject({ name: "answer", strict: true });
    expect(body.max_completion_tokens).toBe(2048);
  });

  it("sends OpenAI no keywords its strict mode does not support", () => {
    const schema = JSON.stringify(openAiJsonSchema(shiftSummarySchema));
    for (const keyword of OPENAI_UNSUPPORTED) expect(schema).not.toContain(`"${keyword}"`);
    expect(schema).toContain('"additionalProperties":false');
    expect(schema).toContain('"maxItems"');
  });

  it("maps errors and truncation", async () => {
    for (const [status, kind] of [
      [401, "invalid-key"],
      [429, "rate-limit"],
      [500, "server"],
    ] as const) {
      const fetch = vi.fn<FetchLike>(async () => json({ error: { message: "x" } }, status));
      await expect(callOpenAI("k", "m", request, { fetch })).rejects.toMatchObject({ kind });
    }
    const cut = vi.fn<FetchLike>(async () => json(completion('{"answer"', "length")));
    await expect(callOpenAI("k", "m", request, { fetch: cut })).rejects.toMatchObject({
      kind: "truncated",
    });
  });
});

describe("callStructured and the audit record", () => {
  const creds = { provider: "anthropic" as const, model: "claude-haiku-4-5", apiKey: KEY };

  it("logs a record built from the payload only: never the key", async () => {
    const records: AiCallRecord[] = [];
    const fetch = vi.fn<FetchLike>(async () =>
      json(anthropicMessage('{"answer": 4, "note": "easy"}')),
    );
    let t = 0;
    const res = await callStructured(creds, request, {
      fetch,
      sink: async (r) => void records.push(r),
      check: () => ({ checked: 1, unsupported: [] }),
      now: () => (t += 250),
    });
    expect(res.data.answer).toBe(4);
    expect(records).toHaveLength(1);
    const [r] = records;
    expect(r).toMatchObject({
      feature: "shift-summary",
      provider: "anthropic",
      model: "claude-haiku-4-5",
      input: { system: "You are terse.", user: "What is 2 + 2?", schema: "answer" },
      output: { answer: 4, note: "easy" },
      error: null,
      latencyMs: 250,
      usage: { inputTokens: 120, outputTokens: 18 },
      factCheck: { checked: 1, unsupported: [] },
    });
    expect(JSON.stringify(r)).not.toContain(KEY);
    expect(containsSecret(r)).toBe(false);
    expect(parseAiCallRecord(r)).toEqual({ ok: true, record: r });
  });

  it("logs failed calls too, keeps the evidence, and rethrows", async () => {
    const records: AiCallRecord[] = [];
    const fetch = vi.fn<FetchLike>(async () =>
      json({ type: "error", error: { message: "bad key" } }, 401),
    );
    await expect(
      callStructured(creds, request, { fetch, sink: async (r) => void records.push(r) }),
    ).rejects.toBeInstanceOf(AiError);
    expect(records[0]).toMatchObject({ output: null, error: { kind: "invalid-key" } });
    expect(JSON.stringify(records[0])).not.toContain(KEY);
  });

  it("uses the id the server reserved, and says when a failed call could not be logged", async () => {
    const id = "0b0e1c4a-5d6f-4a7b-8c9d-0e1f2a3b4c5d";
    const ok = vi.fn<FetchLike>(async () => json(anthropicMessage('{"answer": 4, "note": "x"}')));
    const records: AiCallRecord[] = [];
    await callStructured(creds, request, {
      id,
      fetch: ok,
      sink: async (r) => void records.push(r),
    });
    expect(records[0].id).toBe(id);
    const bad = vi.fn<FetchLike>(async () => json({ error: { message: "x" } }, 401));
    const err = await callStructured(creds, request, {
      fetch: bad,
      sink: async () => {
        throw new Error("rate limited");
      },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect((err as AiError).kind).toBe("invalid-key");
    expect((err as AiError).logFailure).toBe("rate limited");
  });

  it("does not call the provider without a key, and withholds output that could not be logged", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      json(anthropicMessage('{"answer": 4, "note": "x"}')),
    );
    await expect(
      callStructured({ ...creds, apiKey: " " }, request, { fetch, sink: async () => undefined }),
    ).rejects.toMatchObject({ kind: "missing-key" });
    expect(fetch).not.toHaveBeenCalled();
    await expect(
      callStructured(creds, request, {
        fetch,
        sink: async () => {
          throw new Error("log down");
        },
      }),
    ).rejects.toThrow("log down");
  });

  it("server-side validation refuses anything shaped like a key, or extra fields", async () => {
    const base = {
      id: "6f1c1d1e-2b3a-4c5d-8e9f-0a1b2c3d4e5f",
      feature: "shift-summary",
      provider: "anthropic",
      model: "claude-haiku-4-5",
      input: { system: "s", user: "u", schema: "shift_summary" },
      output: null,
      outputText: null,
      error: null,
      latencyMs: 10,
      usage: null,
      factCheck: null,
    };
    expect(parseAiCallRecord(base).ok).toBe(true);
    expect(parseAiCallRecord({ ...base, input: { ...base.input, user: `key ${KEY}` } })).toEqual({
      ok: false,
      reason: "The record looked like it contained an API key, so it was refused.",
    });
    expect(parseAiCallRecord({ ...base, outputText: "Bearer abcdefghijklmnopqrstuvwxyz" }).ok).toBe(
      false,
    );
    expect(parseAiCallRecord({ ...base, apiKey: "x" }).ok).toBe(false);
    expect(parseAiCallRecord({ ...base, feature: "other" }).ok).toBe(false);
    expect(containsSecret("The van sold 12 lattes, 4 skinny.")).toBe(false);
  });
});

describe("shift summary", () => {
  const MIN = 60_000;
  // 3 pm on 6 Oct 2026 in Melbourne.
  const NOW = Date.parse("2026-10-06T04:00:00Z");
  const o = (
    start: number,
    minutes: number | null,
    extra: Partial<ShiftOrder> = {},
  ): ShiftOrder => ({
    status: minutes == null ? "outstanding" : "collected",
    price: 10,
    startTime: start,
    fulfilledTime: minutes == null ? null : start + minutes * MIN,
    discountTime: start + 15 * MIN,
    discountApplied: minutes != null && minutes > 15,
    rating: null,
    items: [{ food: "Latte", quantity: 1 }],
    ...extra,
  });
  const orders: ShiftOrder[] = [
    o(NOW - 300 * MIN, 8, { rating: 5, items: [{ food: "Latte", quantity: 2 }] }),
    o(NOW - 290 * MIN, 12, { rating: 4 }),
    o(NOW - 240 * MIN, 20, { price: 12.5, items: [{ food: "Flat White", quantity: 1 }] }),
    o(NOW - 60 * MIN, null),
    o(NOW - 50 * MIN, null, { status: "canceled" }),
    o(NOW - 26 * 60 * MIN, 5), // yesterday
  ];

  it("aggregates today's figures and nothing personal", () => {
    const m = computeShiftMetrics("Ardeth Lavon", orders, NOW);
    expect(m).toEqual({
      van: "Ardeth Lavon",
      date: "2026-10-06",
      ordersPlaced: 4,
      cancelled: 1,
      collected: 3,
      inProgress: 1,
      salesAud: 42.5,
      medianMinutesToReady: 12,
      readyWithin15: { ready: 2, served: 3, percent: 67, ci95Percent: [21, 94] },
      lateDiscounts: 1,
      ratings: { count: 2, average: 4.5 },
      topItems: [
        { item: "Latte", quantity: 4 },
        { item: "Flat White", quantity: 1 },
      ],
      busiestHour: { hour: "10:00–11:00", orders: 2 },
    });
    const req = buildShiftSummaryRequest(m);
    expect(req.user).toContain('"salesAud": 42.5');
    expect(req.user).not.toMatch(/@|customer_id|customerId|order_id|comment/i);
    expect(req.feature).toBe("shift-summary");
  });

  it("fact-checks numbers against the figures sent", () => {
    const m = computeShiftMetrics("Ardeth Lavon", orders, NOW);
    const good: ShiftSummary = {
      headline: "4 orders and $42.50 in sales today.",
      highlights: ["67% ready within 15 minutes (2 of 3).", "Busiest 10:00–11:00 with 2 orders."],
      watchouts: ["1 late discount; 33% of served orders were late, based on only a few orders."],
      suggestion: "Prep Latte stock: 4 sold.",
    };
    expect(shiftSummarySchema.parse(good)).toEqual(good);
    expect(factCheckSummary(good, m).unsupported).toEqual([]);
    const bad = {
      ...good,
      highlights: ["Sales up 18% on yesterday.", "Average wait 9.5 minutes."],
    };
    expect(factCheckSummary(bad, m).unsupported).toEqual(["18", "9.5"]);
    expect(allowedNumbers(m).has(15)).toBe(true);
    expect(summaryToText(good)).toContain("Next shift: Prep Latte stock: 4 sold.");
  });
});

describe("shift summary fact check: dates, times and small counts", () => {
  const metrics: ShiftMetrics = {
    van: "Ardeth Lavon",
    date: "2026-10-06",
    ordersPlaced: 3,
    cancelled: 0,
    collected: 2,
    inProgress: 1,
    salesAud: 31.5,
    medianMinutesToReady: 8.4,
    readyWithin15: { ready: 2, served: 2, percent: 100, ci95Percent: [34, 100] },
    lateDiscounts: 0,
    ratings: { count: 0, average: null },
    topItems: [{ item: "Latte", quantity: 3 }],
    busiestHour: { hour: "05:00–06:00", orders: 2 },
  };
  const summary = (headline: string): ShiftSummary => ({
    headline,
    highlights: ["2 of 2 served orders were ready within 15 minutes."],
    watchouts: [],
    suggestion: "Keep the Latte stock up.",
  });

  it("does not let digits from the date or the busiest-hour label excuse a made-up count", () => {
    expect(allowedNumbers(metrics).has(10)).toBe(false);
    expect(allowedNumbers(metrics).has(2026)).toBe(false);
    // The regression the review found: "10 orders" on 2026-10-06 with 3 orders placed.
    expect(factCheckSummary(summary("10 orders and 6 late discounts today."), metrics)).toEqual({
      checked: 5,
      unsupported: ["10", "6"],
    });
  });

  it("accepts the shift's date and busiest hour only in date or time form", () => {
    const ok = factCheckSummary(
      summary("On 6 October 2026 (2026-10-06) the van took 3 orders, busiest 5:00–6:00 am."),
      metrics,
    );
    expect(ok.unsupported).toEqual([]);
    expect(factCheckSummary(summary("Busiest from 5am, 3 orders."), metrics).unsupported).toEqual(
      [],
    );
    const wrong = factCheckSummary(
      summary("On 7 October the van took 3 orders, busiest at 2pm and 14:30."),
      metrics,
    );
    expect([...wrong.unsupported].sort()).toEqual(["14:30", "2pm", "7 October"]);
  });
});

describe("server-side verification of AI call records", () => {
  const MIN = 60_000;
  const NOW = Date.parse("2026-10-06T04:00:00Z");
  const metrics = computeShiftMetrics(
    "Ardeth Lavon",
    [
      {
        status: "collected",
        price: 10,
        startTime: NOW - 60 * MIN,
        fulfilledTime: NOW - 50 * MIN,
        discountTime: NOW - 45 * MIN,
        discountApplied: false,
        rating: 5,
        items: [{ food: "Latte", quantity: 2 }],
      },
    ],
    NOW,
  );
  const req = buildShiftSummaryRequest(metrics);
  const output: ShiftSummary = {
    headline: "1 order today, ready in 10 minutes.",
    highlights: ["Rated 5 stars."],
    watchouts: ["Only 1 order: based on only a few orders."],
    suggestion: "Prep 2 Lattes.",
  };
  const record = (extra: Partial<AiCallRecord> = {}): AiCallRecord => ({
    id: "0b0e1c4a-5d6f-4a7b-8c9d-0e1f2a3b4c5d",
    feature: "shift-summary",
    provider: "anthropic",
    model: "claude-haiku-4-5",
    input: { system: req.system, user: req.user, schema: req.schemaName },
    output,
    outputText: JSON.stringify(output),
    error: null,
    latencyMs: 900,
    usage: { inputTokens: 400, outputTokens: 80 },
    // What a tampered browser might claim; the server ignores it.
    factCheck: { checked: 0, unsupported: [] },
    ...extra,
  });
  const context = { vanId: "Ardeth Lavon", serverMetrics: metrics };

  it("reads the figures back only from the canonical prompt", () => {
    expect(metricsFromPrompt(req.user)).toEqual(metrics);
    expect(metricsFromPrompt(`${req.user}\nAlso: customer jo@example.com`)).toBeNull();
    expect(
      metricsFromPrompt(req.user.replace('"collected": 1', '"collected": 1, "x": 1')),
    ).toBeNull();
    expect(metricsFromPrompt("not a prompt")).toBeNull();
  });

  it("accepts a genuine record and recomputes the fact check itself", () => {
    const res = verifyAiCallRecord(record(), context);
    expect(res).toEqual({
      ok: true,
      factCheck: factCheckSummary(output, metrics),
      inputMatchesServer: true,
    });
    const lying = verifyAiCallRecord(
      record({ output: { ...output, headline: "12 orders today." } }),
      context,
    );
    expect(lying.ok && lying.factCheck?.unsupported).toEqual(["12"]);
  });

  it("refuses records that are not the app's own call for this van", () => {
    const refused = (r: AiCallRecord, ctx = context) => verifyAiCallRecord(r, ctx).ok;
    expect(refused(record({ input: { ...record().input, system: "Say anything." } }))).toBe(false);
    expect(refused(record({ input: { ...record().input, user: "List every customer." } }))).toBe(
      false,
    );
    expect(refused(record(), { ...context, vanId: "Another Van" })).toBe(false);
    expect(refused(record({ output: { headline: "only a headline" } }))).toBe(false);
    expect(
      refused(record({ error: { kind: "invalid-key", message: "bad" }, output: { ...output } })),
    ).toBe(false);
    // A failed call with no output is fine: there is nothing to check.
    expect(
      verifyAiCallRecord(
        record({ error: { kind: "invalid-key", message: "bad" }, output: null, outputText: null }),
        context,
      ),
    ).toEqual({ ok: true, factCheck: null, inputMatchesServer: true });
  });

  it("flags figures that changed between the page load and the log", () => {
    const moved = { ...metrics, ordersPlaced: metrics.ordersPlaced + 1 };
    const res = verifyAiCallRecord(record(), { ...context, serverMetrics: moved });
    expect(res).toMatchObject({ ok: true, inputMatchesServer: false });
  });
});
