import { ChevronLeft, ChevronRight, Database, Download, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/server/auth";
import {
  isRecordTable,
  RECORD_TABLES,
  recordCounts,
  recordPage,
  REDACTED,
  type RecordTableName,
} from "@/server/records";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Records" };

const TIME_COLUMNS = new Set([
  "start_time",
  "discount_time",
  "fulfilled_time",
  "collection_time",
  "end_time",
  "created_at",
  "location_updated_at",
  "at",
  "decided_at",
]);

function Cell({ column, value }: { column: string; value: string | number | boolean | null }) {
  if (value === null || value === "")
    return <span className="text-muted-foreground italic">null</span>;
  if (value === REDACTED) return <span className="text-muted-foreground italic">{REDACTED}</span>;
  if (typeof value === "boolean") return <span>{value ? "true" : "false"}</span>;
  if (TIME_COLUMNS.has(column) && typeof value === "string") {
    return (
      <time dateTime={value} className="tabular whitespace-nowrap">
        {value.replace("T", " ").replace(/\.\d+Z$/, "Z")}
      </time>
    );
  }
  const text = String(value);
  return (
    <span className={cn(text.length > 60 ? "line-clamp-2 min-w-64" : "whitespace-nowrap")}>
      {text}
    </span>
  );
}

export default async function RecordsPage(props: PageProps<"/admin/records">) {
  await requireAdmin();
  const params = await props.searchParams;
  const tableParam = typeof params.table === "string" ? params.table : "orders";
  const table: RecordTableName = isRecordTable(tableParam) ? tableParam : "orders";
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const page = Math.max(1, Number(params.page) || 1);
  const [counts, data] = await Promise.all([
    recordCounts(),
    recordPage(table, { q, page, pageSize: 25 }),
  ]);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const spec = RECORD_TABLES[table];
  const href = (next: { table?: string; q?: string; page?: number }) => {
    const sp = new URLSearchParams();
    sp.set("table", next.table ?? table);
    const nq = next.q ?? q;
    if (nq) sp.set("q", nq);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    return `/admin/records?${sp.toString()}`;
  };
  const exportHref = `/api/admin/export/${table}${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Tables" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 flex items-center gap-1.5 px-2 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
          <Database className="size-3.5" aria-hidden /> Tables
        </p>
        <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {counts.map((c) => (
            <li key={c.name}>
              <Link
                href={href({ table: c.name, q: "", page: 1 })}
                aria-current={c.name === table ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  c.name === table ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                )}
              >
                <span className="font-medium">{c.label}</span>
                <span
                  className={cn(
                    "tabular rounded-full px-2 text-xs",
                    c.name === table ? "bg-black/20 dark:bg-white/25" : "bg-secondary",
                  )}
                >
                  {c.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="min-w-0 space-y-4" aria-labelledby="table-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="table-title" className="text-2xl font-semibold">
              {spec.label}{" "}
              <span className="font-mono text-base font-normal text-muted-foreground">{table}</span>
            </h1>
            <p className="text-sm text-muted-foreground">{spec.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form className="flex gap-2" role="search" action="/admin/records">
              <input type="hidden" name="table" value={table} />
              <label htmlFor="records-q" className="sr-only">
                Search {spec.label}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="records-q"
                  name="q"
                  defaultValue={q}
                  placeholder={`Search ${spec.label.toLowerCase()}`}
                  className="h-10 w-56 rounded-lg pl-9"
                />
              </div>
              <Button type="submit" variant="secondary" className="h-10 rounded-lg">
                Search
              </Button>
            </form>
            <Button asChild variant="outline" className="h-10 rounded-lg">
              <a href={exportHref} download>
                <Download aria-hidden /> Export CSV
              </a>
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {data.total} record{data.total === 1 ? "" : "s"}
          {q ? <> matching &ldquo;{q}&rdquo;</> : null}
        </p>

        {data.rows.length === 0 ? (
          <EmptyState icon={<Search />} title="No records" className="bg-card" headingLevel={2}>
            {q ? "Nothing matches that search." : "This table is empty."}
          </EmptyState>
        ) : (
          <div
            className="overflow-x-auto rounded-2xl border bg-card shadow-sm"
            tabIndex={0}
            role="region"
            aria-label={`${spec.label} records`}
          >
            <table className="w-full text-left text-[0.8rem]">
              <thead className="border-b bg-muted/60">
                <tr>
                  {data.columns.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-3 py-2.5 font-mono text-[0.72rem] font-medium whitespace-nowrap text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b align-top last:border-0 hover:bg-muted/40">
                    {data.columns.map((col) => (
                      <td key={col} className="px-3 py-2">
                        <Cell column={col} value={row[col]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 ? (
          <nav aria-label="Pagination" className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {pages}
            </p>
            <div className="flex gap-2">
              {data.page > 1 ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={href({ page: data.page - 1 })} rel="prev">
                    <ChevronLeft aria-hidden /> Previous
                  </Link>
                </Button>
              ) : null}
              {data.page < pages ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={href({ page: data.page + 1 })} rel="next">
                    Next <ChevronRight aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
