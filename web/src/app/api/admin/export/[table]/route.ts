import { toCsv } from "@/lib/csv";
import { currentAdmin } from "@/server/auth";
import { allRecords, isRecordTable } from "@/server/records";

/** CSV export of one table (admin only). Password hashes are redacted. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/export/[table]">) {
  if (!(await currentAdmin())) return new Response("Unauthorised", { status: 401 });
  const { table } = await ctx.params;
  if (!isRecordTable(table)) return new Response("Unknown table", { status: 404 });
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  const { columns, rows } = await allRecords(table, q);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(columns, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="snacks-in-a-van-${table}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
