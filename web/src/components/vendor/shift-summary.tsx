"use client";

import { Check, KeyRound, Loader2, Pencil, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { decideAiOutputAction, logAiCallAction } from "@/app/vendor/ai-actions";
import { AiBadge } from "@/components/ai/ai-badge";
import { useAi } from "@/components/ai/ai-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DECISION_LABEL, type AiCallRecord, type HumanDecision } from "@/lib/ai/audit-record";
import { callStructured } from "@/lib/ai/client";
import {
  buildShiftSummaryRequest,
  factCheckSummary,
  summaryToText,
  type ShiftMetrics,
  type ShiftSummary,
} from "@/lib/ai/shift-summary";
import { PROVIDER_LABEL, isAiError } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type Result = { summary: ShiftSummary; record: AiCallRecord };

/**
 * Optional bring-your-own-key shift summary. The model only ever sees
 * today's aggregate figures for this van (shown in full below the button);
 * the output is labelled, fact-checked against those figures, logged, and
 * waits for the vendor's decision.
 */
export function ShiftSummaryCard({ metrics }: { metrics: ShiftMetrics }) {
  const { credentials, openSettings, ready, prefs } = useAi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [decision, setDecision] = useState<HumanDecision>("pending");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [deciding, setDeciding] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const request = buildShiftSummaryRequest(metrics);

  const generate = async () => {
    if (!credentials) return openSettings();
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    setDecision("pending");
    setEditing(false);
    try {
      const res = await callStructured(credentials, request, {
        signal: controller.signal,
        check: (data) => factCheckSummary(data, metrics),
        sink: async (record) => {
          const logged = await logAiCallAction(record);
          if (!logged.ok) throw new Error(logged.message);
        },
      });
      setResult({ summary: res.data, record: res.record });
    } catch (err) {
      setError(
        isAiError(err)
          ? err.message
          : `The summary was not shown because it could not be recorded in the AI audit log (${
              err instanceof Error ? err.message : "unknown error"
            }).`,
      );
    } finally {
      setBusy(false);
    }
  };

  const decide = async (choice: "accepted" | "edited" | "rejected") => {
    if (!result) return;
    setDeciding(true);
    const res = await decideAiOutputAction(
      result.record.id,
      choice,
      choice === "edited" ? draft : undefined,
    );
    setDeciding(false);
    if (res.ok) {
      setDecision(choice);
      setEditing(false);
    } else setError(res.message);
  };

  const check = result?.record.factCheck;
  const shown = decision === "edited" ? draft : null;

  return (
    <section aria-labelledby="shift-summary-title" className="rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h2 id="shift-summary-title" className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-primary" aria-hidden /> Shift summary
          <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
            optional AI · your own key
          </span>
        </h2>
        {ready && credentials ? (
          <Button type="button" className="h-9 rounded-xl" onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            {result ? "Write another" : "Write a summary"}
          </Button>
        ) : (
          <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={openSettings}>
            <KeyRound aria-hidden /> Add your API key
          </Button>
        )}
      </div>

      <div className="space-y-4 p-4">
        {!result && !error && !busy ? (
          <p className="text-sm text-muted-foreground">
            {credentials
              ? `Asks ${PROVIDER_LABEL[prefs.provider]} (${credentials.model}) to turn today's figures into a short note for the crew. You review it before it counts.`
              : "Bring your own Anthropic or OpenAI key to get a short, AI-written note on today's shift. Without a key nothing changes: the figures above are the whole story."}
          </p>
        ) : null}
        {busy ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Waiting for{" "}
            {credentials ? PROVIDER_LABEL[credentials.provider] : "the provider"}…
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-tomato-500/40 bg-tomato-500/10 px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <article
            className="space-y-3 rounded-xl border border-honey-400/50 bg-honey-300/10 p-4"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center gap-2">
              <AiBadge model={result.record.model} />
              <span className="text-[0.7rem] text-muted-foreground">
                {Math.round(result.record.latencyMs).toLocaleString("en-AU")} ms
                {result.record.usage
                  ? ` · ${result.record.usage.inputTokens} in / ${result.record.usage.outputTokens} out tokens`
                  : ""}
              </span>
            </div>
            {shown ? (
              <p className="text-sm whitespace-pre-line">{shown}</p>
            ) : (
              <div
                className={cn(
                  "space-y-2 text-sm",
                  decision === "rejected" && "line-through opacity-50",
                )}
              >
                <p className="font-semibold">{result.summary.headline}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {result.summary.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                {result.summary.watchouts.length ? (
                  <>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Watch out
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {result.summary.watchouts.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p>
                  <span className="font-semibold">Next shift: </span>
                  {result.summary.suggestion}
                </p>
              </div>
            )}
            {check ? (
              <p
                className={cn(
                  "flex items-start gap-1.5 text-xs",
                  check.unsupported.length
                    ? "text-tomato-700 dark:text-tomato-300"
                    : "text-muted-foreground",
                )}
              >
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {check.unsupported.length
                  ? `Fact check: ${check.unsupported.length} of ${check.checked} numbers are not in the figures sent (${check.unsupported.join(", ")}). Check them before accepting.`
                  : `Fact check: all ${check.checked} numbers appear in the figures sent. Wording can still mislead, so read it before accepting.`}
              </p>
            ) : null}

            {decision === "pending" ? (
              editing ? (
                <div className="space-y-2">
                  <label
                    htmlFor="summary-edit"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Your edited version (stored next to the original)
                  </label>
                  <Textarea
                    id="summary-edit"
                    rows={8}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="h-9 rounded-xl"
                      disabled={deciding || !draft.trim()}
                      onClick={() => decide("edited")}
                    >
                      <Check aria-hidden /> Save edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 rounded-xl"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Your decision:
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg"
                    disabled={deciding}
                    onClick={() => decide("accepted")}
                  >
                    <Check aria-hidden /> Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg"
                    disabled={deciding}
                    onClick={() => {
                      setDraft(summaryToText(result.summary));
                      setEditing(true);
                    }}
                  >
                    <Pencil aria-hidden /> Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-8 rounded-lg"
                    disabled={deciding}
                    onClick={() => decide("rejected")}
                  >
                    <X aria-hidden /> Reject
                  </Button>
                </div>
              )
            ) : (
              <p className="text-xs font-medium">
                {DECISION_LABEL[decision]} · recorded in the AI audit log with the original output.
              </p>
            )}
          </article>
        ) : null}

        <details className="rounded-xl border bg-muted/40 px-3 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
            Exactly what is sent to the provider
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Today&apos;s aggregate figures for this van, nothing else: no customer names, emails,
            order ids or written comments. The instructions below are sent with them.
          </p>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-card p-3 text-[0.7rem] leading-relaxed whitespace-pre-wrap">
            {request.system}
            {"\n\n"}
            {request.user}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            How the AI feature is governed:{" "}
            <Link href="/methods#ai-use" className="underline underline-offset-4">
              AI use statement
            </Link>
            .
          </p>
        </details>
      </div>
    </section>
  );
}
