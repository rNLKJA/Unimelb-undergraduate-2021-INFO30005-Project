import { ChevronLeft, ChevronRight, Search, SearchCheck, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Stars } from "@/components/shared/stars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderDetailsDialog } from "@/components/vendor/order-details-dialog";
import { formatDateTime } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/order-rules";
import { formatPrice } from "@/lib/pricing";
import { requireVan } from "@/server/auth";
import { searchVanOrders } from "@/server/orders";

export const metadata: Metadata = { title: "Vendor · Order history" };

export default async function VendorHistoryPage(props: PageProps<"/vendor/history">) {
  const van = await requireVan();
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const statusParam = typeof params.status === "string" ? params.status : "all";
  const status = (ORDER_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as OrderStatus)
    : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const result = await searchVanOrders({ vanId: van.vanId, q, status, page, pageSize: 20 });
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status !== "all") sp.set("status", status);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/vendor/history${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-5 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Order history</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} order{result.total === 1 ? "" : "s"} for {van.vanId}
          </p>
        </div>
        <form
          className="flex w-full flex-wrap gap-2 sm:w-auto"
          role="search"
          action="/vendor/history"
        >
          <label htmlFor="q" className="sr-only">
            Search by order ID or customer email
          </label>
          <div className="relative flex-1 sm:w-72 sm:flex-none">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Order ID or customer email"
              className="h-10 rounded-lg bg-card pl-9"
            />
          </div>
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
          >
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button type="submit" className="h-10 rounded-lg">
            Search
          </Button>
        </form>
      </div>

      {q ? (
        result.exact ? (
          <p className="flex items-center gap-2 rounded-xl bg-matcha-300/25 px-3 py-2 text-sm text-matcha-600 dark:text-matcha-300">
            <SearchCheck className="size-4" aria-hidden /> Exact match found:{" "}
            <OrderDetailsDialog order={result.exact} />
            <span className="text-muted-foreground">(open it to see every field)</span>
          </p>
        ) : result.total === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-tomato-300/20 px-3 py-2 text-sm text-tomato-700 dark:text-tomato-300">
            <SearchX className="size-4" aria-hidden /> Order not found. Check the ID and try again.
          </p>
        ) : null
      ) : null}

      {result.rows.length === 0 ? (
        <EmptyState icon={<Search />} title="No orders match" className="bg-card" headingLevel={2}>
          Try a different order ID, or clear the filters.
        </EmptyState>
      ) : (
        <div
          className="overflow-x-auto rounded-2xl border bg-card shadow-sm"
          tabIndex={0}
          role="region"
          aria-label="Order history"
        >
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Order
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Customer
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Placed
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Items
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                  Total
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Discount
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((o) => (
                <tr key={o.orderId} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <OrderDetailsDialog order={o} />
                  </td>
                  <td className="px-4 py-2.5">{o.customerName}</td>
                  <td className="tabular px-4 py-2.5 whitespace-nowrap">
                    {formatDateTime(o.startTime)}
                  </td>
                  <td className="max-w-64 truncate px-4 py-2.5 text-muted-foreground">
                    {o.items.map((i) => `${i.quantity}× ${i.food}`).join(", ")}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-medium">
                    {formatPrice(o.price)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-2.5">{o.discountApplied ? "Yes" : "—"}</td>
                  <td className="px-4 py-2.5">
                    {o.rating ? <Stars value={o.rating} size="size-3.5" /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Page {result.page} of {pages}
          </p>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Button asChild variant="outline" className="h-9 rounded-lg">
                <Link href={href(result.page - 1)} rel="prev">
                  <ChevronLeft aria-hidden /> Previous
                </Link>
              </Button>
            ) : null}
            {result.page < pages ? (
              <Button asChild variant="outline" className="h-9 rounded-lg">
                <Link href={href(result.page + 1)} rel="next">
                  Next <ChevronRight aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
