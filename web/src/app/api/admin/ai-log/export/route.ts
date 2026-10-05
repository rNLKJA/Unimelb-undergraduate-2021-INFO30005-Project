import { toCsv } from "@/lib/csv";
import { aiCallExportRow, listAiCalls } from "@/server/ai-audit";
import { recordAudit } from "@/server/audit";
import { currentAdmin } from "@/server/auth";

/** JSON or CSV export of the AI audit log (admin only). Holds no API keys: none are ever stored. */
export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return new Response("Unauthorised", { status: 401 });
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const rows = (await listAiCalls(10_000)).map(aiCallExportRow);
  await recordAudit({
    actor: { role: "admin", id: admin },
    action: "ai_log.exported",
    entityType: "ai_log",
    entityId: "ai_audit_log",
    detail: { rows: rows.length, format },
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = {
    "Content-Disposition": `attachment; filename="snacks-in-a-van-ai-audit-log-${stamp}.${format}"`,
    "Cache-Control": "no-store",
  };
  if (format === "csv") {
    const columns = rows.length ? Object.keys(rows[0]) : Object.keys(aiCallExportRow(EMPTY));
    return new Response(toCsv(columns, rows), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  }
  const body = {
    exportedAt: new Date().toISOString(),
    note: "Snacks in a Van AI audit log. API keys are never sent to this server, so none appear here.",
    entries: rows,
  };
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

const EMPTY = {
  id: "",
  createdAt: new Date(0),
  feature: "",
  provider: "",
  model: "",
  actorId: "",
  input: "",
  output: null,
  outputText: null,
  errorKind: null,
  errorMessage: null,
  latencyMs: 0,
  inputTokens: null,
  outputTokens: null,
  factCheck: null,
  humanDecision: "pending" as const,
  editedOutput: null,
  decidedAt: null,
};
