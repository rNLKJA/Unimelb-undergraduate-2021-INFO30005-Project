import { Bot, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/admin/page-intro";
import { AiBadge } from "@/components/ai/ai-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DECISION_LABEL, type FactCheck, type HumanDecision } from "@/lib/ai/audit-record";
import { FEATURE_LABEL, PROVIDER_LABEL, type AiFeature, type Provider } from "@/lib/ai/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { aiLogTotals, listAiCalls } from "@/server/ai-audit";
import { requireAdmin } from "@/server/auth";

export const metadata: Metadata = { title: "AI audit log" };

const parse = <T,>(text: string | null): T | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const DECISION_TONE: Record<HumanDecision, string> = {
  pending: "bg-honey-300/30 text-espresso-800 dark:text-honey-300",
  accepted: "bg-matcha-500/15 text-matcha-700 dark:text-matcha-300",
  edited: "bg-viz-b/15 text-foreground",
  rejected: "bg-tomato-500/15 text-tomato-700 dark:text-tomato-300",
  "not-applicable": "bg-muted text-muted-foreground",
};

const LIST_LIMIT = 200;

export default async function AiLogPage() {
  await requireAdmin();
  const [rows, totals] = await Promise.all([listAiCalls(LIST_LIMIT), aiLogTotals()]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
      <PageIntro
        eyebrow="Records · governance"
        title="AI audit log"
        actions={
          <>
            <Button asChild variant="outline" className="h-10 rounded-lg">
              <a href="/api/admin/ai-log/export?format=json" download>
                <Download aria-hidden /> JSON
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-lg">
              <a href="/api/admin/ai-log/export?format=csv" download>
                <Download aria-hidden /> CSV
              </a>
            </Button>
          </>
        }
      >
        <p>
          Every call the optional bring-your-own-key shift summary makes through the app, successful
          or not: the prompt and figures sent, the reply, the model, latency, tokens when the
          provider reports them, the fact check and the vendor&apos;s decision. The call itself goes
          from the vendor&apos;s browser to the provider; this server only receives a record of it
          afterwards, never the key.{" "}
          <strong>Records are reported by the vendor&apos;s browser</strong>: the server checks the
          prompt is the app&apos;s own with valid figures for that van, validates the output and
          recomputes the fact check, but it cannot prove a record matches a real provider response.
          The log shows what the app reported, attested by the signed-in vendor session. Records are
          immutable apart from one review decision (enforced by database triggers). Also browsable
          as the{" "}
          <Link
            href="/admin/records?table=ai_audit_log"
            className="font-medium text-foreground underline underline-offset-4"
          >
            ai_audit_log table
          </Link>
          ; policy in the{" "}
          <Link
            href="/methods#ai-use"
            className="font-medium text-foreground underline underline-offset-4"
          >
            AI use statement
          </Link>
          .
        </p>
      </PageIntro>

      <dl className="flex flex-wrap gap-2 text-sm" aria-label="Totals over the whole log">
        <div className="rounded-full border bg-card px-3 py-1">
          <dt className="inline text-muted-foreground">Calls </dt>
          <dd className="tabular inline font-semibold">{totals.calls}</dd>
        </div>
        {(["pending", "accepted", "edited", "rejected", "not-applicable"] as HumanDecision[]).map(
          (d) => (
            <div key={d} className="rounded-full border bg-card px-3 py-1">
              <dt className="inline text-muted-foreground">{DECISION_LABEL[d]} </dt>
              <dd className="tabular inline font-semibold">{totals.byDecision[d] ?? 0}</dd>
            </div>
          ),
        )}
        <div className="rounded-full border bg-card px-3 py-1">
          <dt className="inline text-muted-foreground">Fact check flagged </dt>
          <dd className="tabular inline font-semibold">{totals.factCheckFlagged}</dd>
        </div>
        <div className="rounded-full border bg-card px-3 py-1">
          <dt className="inline text-muted-foreground">Figures not current </dt>
          <dd className="tabular inline font-semibold">{totals.inputNotCurrent}</dd>
        </div>
      </dl>
      {totals.calls > rows.length ? (
        <p className="text-xs text-muted-foreground">
          Totals cover all {totals.calls.toLocaleString("en-AU")} calls; the list shows the latest{" "}
          {rows.length}. The JSON and CSV exports include every call.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState icon={<Bot />} title="No AI calls yet" className="bg-card" headingLevel={2}>
          The log fills when a vendor adds their own API key (key icon in the vendor header) and
          asks for a shift summary on the van page. Without a key the app makes no AI calls at all.
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {rows.map((r) => {
            const input = parse<{ system: string; user: string; schema: string }>(r.input);
            const check = parse<FactCheck>(r.factCheck);
            const decision = r.humanDecision as HumanDecision;
            return (
              <li key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                  <time dateTime={r.createdAt.toISOString()} className="tabular font-medium">
                    {formatDateTime(r.createdAt)}
                  </time>
                  <span>{FEATURE_LABEL[r.feature as AiFeature] ?? r.feature}</span>
                  <span className="text-muted-foreground">{r.actorId}</span>
                  {r.output != null ? (
                    <AiBadge
                      model={`${PROVIDER_LABEL[r.provider as Provider] ?? r.provider} · ${r.model}`}
                      edited={decision === "edited"}
                    />
                  ) : (
                    <span className="rounded-xl border px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground">
                      {PROVIDER_LABEL[r.provider as Provider] ?? r.provider} · {r.model}
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      DECISION_TONE[decision],
                    )}
                  >
                    {DECISION_LABEL[decision] ?? decision}
                  </span>
                  <span className="tabular text-xs text-muted-foreground">
                    {r.latencyMs.toLocaleString("en-AU")} ms
                    {r.inputTokens != null
                      ? ` · ${r.inputTokens} in / ${r.outputTokens ?? 0} out tokens`
                      : ""}
                  </span>
                  {r.errorKind ? (
                    <span className="rounded-full bg-tomato-500/15 px-2 py-0.5 text-xs font-semibold text-tomato-700 dark:text-tomato-300">
                      error: {r.errorKind}
                    </span>
                  ) : null}
                  {r.inputMatchesServer === false ? (
                    <span className="text-xs text-muted-foreground">
                      figures sent were not the server&apos;s latest
                    </span>
                  ) : null}
                  {check ? (
                    <span className="text-xs text-muted-foreground">
                      fact check:{" "}
                      {check.unsupported.length
                        ? `${check.unsupported.length} unsupported of ${check.checked}`
                        : `${check.checked} numbers, all found`}
                    </span>
                  ) : null}
                </div>
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                    Input, output and decision
                  </summary>
                  <div className="mt-2 grid gap-3 lg:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Sent (schema {input?.schema})
                      </p>
                      <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-muted p-3 text-[0.7rem] whitespace-pre-wrap">
                        {input ? `${input.system}\n\n${input.user}` : r.input}
                      </pre>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Returned</p>
                      <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-[0.7rem] whitespace-pre-wrap">
                        {r.outputText ?? r.errorMessage ?? "—"}
                      </pre>
                      {r.errorMessage && r.outputText ? (
                        <p className="text-xs text-muted-foreground">Error: {r.errorMessage}</p>
                      ) : null}
                      {r.editedOutput ? (
                        <>
                          <p className="text-xs font-semibold text-muted-foreground">
                            Vendor&apos;s edit
                          </p>
                          <pre className="rounded-lg bg-muted p-3 text-[0.7rem] whitespace-pre-wrap">
                            {r.editedOutput}
                          </pre>
                        </>
                      ) : null}
                      {r.decidedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Decided {formatDateTime(r.decidedAt)}
                        </p>
                      ) : null}
                      {check?.unsupported.length ? (
                        <p className="text-xs text-tomato-700 dark:text-tomato-300">
                          Numbers not in the figures sent: {check.unsupported.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-[0.65rem] text-muted-foreground">id {r.id}</p>
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
