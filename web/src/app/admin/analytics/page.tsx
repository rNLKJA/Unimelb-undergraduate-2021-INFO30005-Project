import type { Metadata } from "next";
import Link from "next/link";
import { Figure, PageIntro, Panel } from "@/components/admin/page-intro";
import {
  ColumnChart,
  HistogramChart,
  IntervalPlot,
  StepCurveChart,
} from "@/components/charts/charts";
import { DataTable } from "@/components/charts/plot-frame";
import {
  ANALYTICS_SEED,
  BOOTSTRAP_REPS,
  fulfilmentMinutes,
  fulfilmentSummary,
  histogram,
  imputedOrders,
  lateRateByVan,
  ordersPerDay,
  timeToFulfil,
} from "@/lib/analytics/ops";
import { formatDate } from "@/lib/format";
import { OVERDUE_MINUTES } from "@/lib/order-rules";
import { formatInterval, formatNumber, formatPct, formatPctInterval } from "@/lib/stats/format";
import { opsOrders } from "@/server/analytics";
import { requireAdmin } from "@/server/auth";
import { serverNow } from "@/server/clock";

export const metadata: Metadata = { title: "Operations analytics" };

const shortDay = (key: string) => {
  const [, m, d] = key.split("-").map(Number);
  return `${d}/${m}`;
};

export default async function AnalyticsPage() {
  await requireAdmin();
  const now = serverNow();
  const orders = await opsOrders();

  const perDay = ordersPerDay(orders, now, 21);
  const minutes = fulfilmentMinutes(orders);
  const summary = fulfilmentSummary(minutes);
  const bins = histogram(minutes, 1);
  const late = lateRateByVan(orders);
  const ttf = timeToFulfil(orders, now);
  const counts = {
    total: orders.length,
    cancelled: orders.filter((o) => o.status === "canceled").length,
    active: orders.filter((o) => o.status === "outstanding" || o.status === "fulfilled").length,
    imputed: imputedOrders(orders),
  };
  const first = orders[0]?.startTime;
  // The axis ends at the last ready order: orders censored much later (closed
  // out by housekeeping after 90+ minutes) would only add a long flat line.
  const lastEvent = Math.max(0, ...ttf.km.steps.filter((s) => s.nEvent > 0).map((s) => s.time));
  const kmMax = Math.max(OVERDUE_MINUTES + 5, Math.ceil(lastEvent));
  const censoredBeyond = ttf.km.steps
    .filter((s) => s.time > kmMax)
    .reduce((sum, s) => sum + s.nCensor, 0);
  const lateMax = Math.min(1, Math.max(0.5, ...late.byVan.map((v) => v.late.upper)));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
      <PageIntro eyebrow="Records · analytics" title="Operations analytics">
        <p>
          Computed live from the demo database: {counts.total} orders
          {first ? <> since {formatDate(first)}</> : null} ({counts.cancelled} cancelled,{" "}
          {counts.active} still active). The history is <strong>synthetic seed data</strong> plus
          whatever visitors did on this server, so read the numbers as a demonstration of the
          method, not as facts about real vans.{" "}
          <span id="imputed-note">
            Demo orders closed out by housekeeping without ever being marked ready: {counts.imputed}
            . Their invented ready times are left out of every figure, and the Kaplan–Meier curve
            treats them as censored.
          </span>{" "}
          Every rate has a Wilson 95% interval; medians and percentiles have percentile-bootstrap
          intervals ({BOOTSTRAP_REPS.toLocaleString("en-AU")} resamples, seed {ANALYTICS_SEED}).
          Method notes:{" "}
          <Link
            href="/methods#analytics"
            className="font-medium text-foreground underline underline-offset-4"
          >
            /methods
          </Link>
          .
        </p>
      </PageIntro>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Orders per day"
          value={formatNumber(perDay.meanPerDay.estimate, 1)}
          interval={formatInterval(perDay.meanPerDay.lower, perDay.meanPerDay.upper)}
          note={`mean of ${perDay.completeDays} complete days, cancellations excluded`}
        />
        <Figure
          label="Median minutes to ready"
          value={formatNumber(summary.median.estimate, 1)}
          interval={formatInterval(summary.median.lower, summary.median.upper)}
          note={`n = ${summary.n} served orders${counts.imputed ? `, ${counts.imputed} closed out excluded` : ""}`}
        />
        <Figure
          label={`Ready within ${OVERDUE_MINUTES} minutes (Kaplan–Meier)`}
          value={formatPct(ttf.readyBy15.estimate, 0)}
          interval={formatPctInterval(ttf.readyBy15.lower, ttf.readyBy15.upper, 0)}
          note={`n = ${ttf.km.n}, ${ttf.km.censored} censored (${ttf.stillPreparing} still preparing, ${ttf.closedOut} closed out)`}
        />
        <Figure
          label="Late-discount rate"
          value={formatPct(late.overall.p, 0)}
          interval={formatPctInterval(late.overall.lower, late.overall.upper, 0)}
          note={`${late.overall.successes} of ${late.overall.n} served orders`}
        />
      </dl>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          id="per-day"
          title="Orders per day"
          subtitle={
            <>
              Non-cancelled orders per Melbourne calendar day, last 21 days. Today is partial
              (lighter bar) and left out of the mean; the shaded band is the mean&apos;s 95%
              bootstrap interval over days.
            </>
          }
        >
          <ColumnChart
            label={`Column chart of orders per day over 21 days; mean ${formatNumber(perDay.meanPerDay.estimate, 1)} per day.`}
            yLabel="Orders"
            xEvery={3}
            mean={{
              value: perDay.meanPerDay.estimate,
              lower: perDay.meanPerDay.lower,
              upper: perDay.meanPerDay.upper,
              label: `mean ${formatNumber(perDay.meanPerDay.estimate, 1)}`,
            }}
            data={perDay.series.map((d) => ({
              key: d.day,
              xLabel: shortDay(d.day),
              value: d.count,
              muted: d.partial,
              tip: (
                <>
                  <strong className="tabular">{d.count}</strong> orders · {d.day}
                  {d.partial ? " (today so far)" : ""}
                </>
              ),
            }))}
          />
          <DataTable
            caption="Orders per day"
            columns={["Day", "Orders", "Note"]}
            rows={perDay.series.map((d) => [d.day, d.count, d.partial ? "today, partial" : ""])}
          />
        </Panel>

        <Panel
          id="fulfilment"
          title="Minutes from order to ready"
          subtitle={
            <>
              Served orders, 1-minute bins. Median {formatNumber(summary.median.estimate, 1)} min
              (95% CI {formatInterval(summary.median.lower, summary.median.upper)}, shaded); 90th
              percentile {formatNumber(summary.p90.estimate, 1)} min (
              {formatInterval(summary.p90.lower, summary.p90.upper)}). Ready within the promise:{" "}
              {formatPct(summary.withinPromise.p, 0)} (
              {formatPctInterval(summary.withinPromise.lower, summary.withinPromise.upper, 0)}), n ={" "}
              {summary.n}.
            </>
          }
        >
          <HistogramChart
            label={`Histogram of minutes to ready for ${summary.n} orders; median ${formatNumber(summary.median.estimate, 1)} minutes.`}
            bins={bins}
            xLabel="Minutes from order to ready"
            threshold={{ value: OVERDUE_MINUTES, label: `${OVERDUE_MINUTES}-min promise` }}
            median={{
              value: summary.median.estimate,
              lower: summary.median.lower,
              upper: summary.median.upper,
              label: `median ${formatNumber(summary.median.estimate, 1)}`,
            }}
          />
          <DataTable
            caption="Minutes to ready, histogram bins"
            columns={["Minutes", "Orders"]}
            rows={bins.map((b) => [`${b.from}–${b.to}`, b.count])}
          />
        </Panel>

        <Panel
          id="time-to-fulfil"
          title="Time to fulfil (Kaplan–Meier)"
          subtitle={
            <>
              Share of orders ready by each minute, 1 − S(t) from a Kaplan–Meier fit with Greenwood
              log-log 95% band. Orders still being prepared count as censored at their current age,
              not as finished and not as missing; {ttf.closedOut} demo orders closed out by
              housekeeping are censored at their age when closed out; {ttf.cancelled} cancelled
              orders are left out (a competing outcome). KM median{" "}
              {Number.isFinite(ttf.medianMinutes)
                ? `${formatNumber(ttf.medianMinutes, 1)} min`
                : "not reached"}
              .
              {censoredBeyond
                ? ` The axis stops at the last ready order; ${censoredBeyond} orders censored after that are listed in the data table (the curve stays flat beyond it).`
                : ""}
            </>
          }
        >
          <StepCurveChart
            label={`Kaplan–Meier curve of the share of orders ready by minute; ${formatPct(ttf.readyBy15.estimate, 0)} ready by 15 minutes.`}
            points={ttf.km.steps
              .filter((s) => s.nEvent > 0)
              .map((s) => ({
                time: s.time,
                value: 1 - s.survival,
                lower: 1 - s.upper,
                upper: 1 - s.lower,
              }))}
            xMax={kmMax}
            xLabel="Minutes since the order was placed"
            yLabel="Share ready"
            threshold={{ value: OVERDUE_MINUTES, label: `${OVERDUE_MINUTES} min` }}
            marker={{
              time: OVERDUE_MINUTES,
              value: ttf.readyBy15.estimate,
              label: `${formatPct(ttf.readyBy15.estimate, 0)} ${formatPctInterval(ttf.readyBy15.lower, ttf.readyBy15.upper, 0)}`,
            }}
          />
          <DataTable
            caption="Kaplan–Meier steps"
            columns={["Minutes", "At risk", "Ready", "Censored", "Share ready", "95% CI"]}
            rows={ttf.km.steps.map((s) => [
              formatNumber(s.time, 1),
              s.nRisk,
              s.nEvent,
              s.nCensor,
              formatPct(1 - s.survival, 1),
              Number.isFinite(s.lower) ? formatPctInterval(1 - s.upper, 1 - s.lower, 1) : "–",
            ])}
          />
        </Panel>

        <Panel
          id="late-by-van"
          title="Late-discount rate by van"
          subtitle={
            <>
              Share of each van&apos;s served orders that were ready after the 15-minute deadline
              (and so discounted), with Wilson 95% intervals; orders closed out by housekeeping are
              left out. Wide intervals mean few orders: differences between vans this small are not
              evidence of a slower crew. Dashed line: all vans together.
            </>
          }
        >
          <IntervalPlot
            label={`Late-discount rate for ${late.byVan.length} vans with 95% intervals; overall ${formatPct(late.overall.p, 0)}.`}
            domain={[0, lateMax]}
            format={(v) => formatPct(v, 0)}
            references={[
              { value: late.overall.p, label: `all vans, ${formatPct(late.overall.p, 0)}` },
            ]}
            rows={late.byVan.map((v) => ({
              key: v.vanId,
              label: v.vanId,
              estimate: v.late.p,
              lower: v.late.lower,
              upper: v.late.upper,
              value: (
                <>
                  {formatPct(v.late.p, 0)} {formatPctInterval(v.late.lower, v.late.upper, 0)} ·{" "}
                  {v.late.successes}/{v.late.n}
                </>
              ),
            }))}
          />
          <DataTable
            caption="Late-discount rate by van"
            columns={["Van", "Late", "Served", "Rate", "95% CI (Wilson)"]}
            rows={late.byVan.map((v) => [
              v.vanId,
              v.late.successes,
              v.late.n,
              formatPct(v.late.p, 1),
              formatPctInterval(v.late.lower, v.late.upper, 1),
            ])}
          />
        </Panel>
      </div>
    </div>
  );
}
