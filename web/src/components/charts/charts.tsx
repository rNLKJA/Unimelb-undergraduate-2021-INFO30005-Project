/**
 * The analytics charts. Pure components (no hooks), so they render on the
 * server and inside client components alike. Marks follow one spec: bars at
 * most 24px wide with a 4px rounded data end, 2px lines, 8px dots with a
 * surface ring, interval bands as a 12% wash of the series hue, solid
 * hairline grids, and a dashed rule only for a threshold (the 15-minute
 * promise) or a reference value.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MarkTip, PlotFrame, type Tick } from "./plot-frame";
import { niceTicks, pct } from "./scale";

const SERIES = {
  a: { fill: "bg-viz-a", stroke: "stroke-viz-a", band: "fill-viz-a" },
  b: { fill: "bg-viz-b", stroke: "stroke-viz-b", band: "fill-viz-b" },
} as const;
export type SeriesKey = keyof typeof SERIES;

const ticksFor = (values: number[], format: (v: number) => string): Tick[] =>
  values.map((value) => ({ value, label: format(value) }));

/** A vertical reference line (threshold) inside a PlotFrame's plot area. */
function VRule({ x, label, dashed = true }: { x: number; label: string; dashed?: boolean }) {
  return (
    <div
      className={cn("absolute inset-y-0 border-l border-foreground/45", dashed && "border-dashed")}
      style={{ left: `${x}%` }}
    >
      <span className="absolute -top-0.5 left-1 rounded bg-card/90 px-1 text-[0.65rem] font-medium whitespace-nowrap text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ColumnChart({
  label,
  data,
  yLabel,
  xEvery = 1,
  mean,
}: {
  label: string;
  data: readonly { key: string; xLabel: string; value: number; tip: ReactNode; muted?: boolean }[];
  yLabel?: string;
  /** Show every n-th x label. */
  xEvery?: number;
  /** Optional horizontal reference (e.g. the mean) with an interval band. */
  mean?: { value: number; lower: number; upper: number; label: string };
}) {
  const max = Math.max(1, ...data.map((d) => d.value), mean?.upper ?? 0);
  const yTicks = niceTicks(0, max, 4);
  const yMax = yTicks[yTicks.length - 1];
  const n = data.length;
  return (
    <PlotFrame
      label={label}
      yLabel={yLabel}
      xDomain={[0, n]}
      yDomain={[0, yMax]}
      yTicks={ticksFor(yTicks, (v) => String(v))}
      xTicks={data
        .map((d, i) => ({ value: i + 0.5, label: d.xLabel, show: i % xEvery === (n - 1) % xEvery }))
        .filter((t) => t.show)}
    >
      {mean ? (
        <>
          <div
            aria-hidden
            className="absolute inset-x-0 bg-foreground/[0.06]"
            style={{
              bottom: `${pct(mean.lower, 0, yMax)}%`,
              height: `${pct(mean.upper, 0, yMax) - pct(mean.lower, 0, yMax)}%`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-[1] border-t border-foreground/50"
            style={{ bottom: `${pct(mean.value, 0, yMax)}%` }}
          >
            <span className="absolute right-1 bottom-0.5 rounded bg-card/90 px-1 text-[0.65rem] text-muted-foreground">
              {mean.label}
            </span>
          </div>
        </>
      ) : null}
      {data.map((d, i) => (
        <div
          key={d.key}
          className="group absolute bottom-0 flex h-full justify-center px-[1px]"
          style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%` }}
        >
          <div className="relative flex h-full w-full max-w-6 items-end">
            <div
              className={cn(
                "w-full rounded-t-[4px] bg-viz-a transition-opacity group-hover:opacity-80",
                d.muted && "opacity-45 group-hover:opacity-60",
              )}
              style={{ height: `${pct(d.value, 0, yMax)}%` }}
            />
            <MarkTip align={i < 2 ? "left" : i > n - 3 ? "right" : "center"}>{d.tip}</MarkTip>
          </div>
        </div>
      ))}
    </PlotFrame>
  );
}

// ---------------------------------------------------------------------------

export function HistogramChart({
  label,
  bins,
  threshold,
  median,
  xLabel,
}: {
  label: string;
  bins: readonly { from: number; to: number; count: number }[];
  threshold?: { value: number; label: string };
  median?: { value: number; lower: number; upper: number; label: string };
  xLabel?: string;
}) {
  const xMax = bins.length ? bins[bins.length - 1].to : 1;
  const yTicks = niceTicks(0, Math.max(1, ...bins.map((b) => b.count)), 4);
  const yMax = yTicks[yTicks.length - 1];
  const xTicks = niceTicks(0, xMax, 6).filter((t) => t <= xMax);
  return (
    <PlotFrame
      label={label}
      xLabel={xLabel}
      yLabel="Orders"
      xDomain={[0, xMax]}
      yDomain={[0, yMax]}
      yTicks={ticksFor(yTicks, String)}
      xTicks={ticksFor(xTicks, String)}
    >
      {median ? (
        <div
          aria-hidden
          className="absolute inset-y-0 bg-foreground/[0.07]"
          style={{
            left: `${pct(median.lower, 0, xMax)}%`,
            width: `${pct(median.upper, 0, xMax) - pct(median.lower, 0, xMax)}%`,
          }}
        />
      ) : null}
      {bins.map((b, i) => (
        <div
          key={b.from}
          className="group absolute bottom-0 flex h-full items-end px-[1px]"
          style={{
            left: `${pct(b.from, 0, xMax)}%`,
            width: `${pct(b.to, 0, xMax) - pct(b.from, 0, xMax)}%`,
          }}
        >
          <div
            className="w-full rounded-t-[4px] bg-viz-a transition-opacity group-hover:opacity-80"
            style={{ height: `${pct(b.count, 0, yMax)}%` }}
          />
          <MarkTip align={i < 2 ? "left" : i > bins.length - 3 ? "right" : "center"}>
            <strong className="tabular">{b.count}</strong> orders · {b.from}–{b.to} min
          </MarkTip>
        </div>
      ))}
      {median ? (
        <div
          className="absolute inset-y-0 border-l-2 border-foreground"
          style={{ left: `${pct(median.value, 0, xMax)}%` }}
        >
          <span className="absolute top-4 left-1 rounded bg-card/90 px-1 text-[0.65rem] font-semibold whitespace-nowrap">
            {median.label}
          </span>
        </div>
      ) : null}
      {threshold ? <VRule x={pct(threshold.value, 0, xMax)} label={threshold.label} /> : null}
    </PlotFrame>
  );
}

// ---------------------------------------------------------------------------

export type IntervalRow = {
  key: string;
  label: ReactNode;
  estimate: number;
  lower: number;
  upper: number;
  value: ReactNode;
  series?: SeriesKey;
  emphasis?: boolean;
};

/**
 * Dot-and-interval ("forest") plot: one row per group, estimate as a dot,
 * 95% interval as a line. Labels and values are HTML columns, so long van
 * names and numbers never collide with the marks.
 */
export function IntervalPlot({
  label,
  rows,
  domain,
  format,
  references = [],
  axisLabel,
}: {
  label: string;
  rows: readonly IntervalRow[];
  domain: [number, number];
  format: (v: number) => string;
  references?: readonly { value: number; label: string; dashed?: boolean }[];
  axisLabel?: string;
}) {
  const ticks = niceTicks(domain[0], domain[1], 4).filter(
    (t) => t >= domain[0] - 1e-12 && t <= domain[1] + 1e-12,
  );
  // A figure, not role="img": the row labels and printed values stay readable
  // by screen readers; only the drawn marks are hidden from them.
  return (
    <figure className="min-w-0 text-xs">
      <figcaption className="sr-only">{label}</figcaption>
      <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]">
        {rows.map((r) => {
          const s = SERIES[r.series ?? "a"];
          const lo = pct(r.lower, domain[0], domain[1]);
          const hi = pct(r.upper, domain[0], domain[1]);
          return (
            <div key={r.key} className="contents">
              <div className={cn("py-1.5 leading-snug break-words", r.emphasis && "font-semibold")}>
                {r.label}
              </div>
              <div className="group relative py-1.5" aria-hidden>
                <div className="relative h-4">
                  {ticks.map((t) => (
                    <div
                      key={t}
                      aria-hidden
                      className="absolute inset-y-[-6px] border-l border-viz-grid"
                      style={{ left: `${pct(t, domain[0], domain[1])}%` }}
                    />
                  ))}
                  {references.map((ref) => (
                    <div
                      key={ref.label}
                      aria-hidden
                      className={cn(
                        "absolute inset-y-[-6px] border-l border-foreground/45",
                        ref.dashed !== false && "border-dashed",
                      )}
                      style={{ left: `${pct(ref.value, domain[0], domain[1])}%` }}
                    />
                  ))}
                  <div
                    className={cn("absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full", s.fill)}
                    style={{ left: `${lo}%`, width: `${Math.max(0.5, hi - lo)}%` }}
                  />
                  <div
                    className={cn(
                      "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
                      s.fill,
                    )}
                    style={{ left: `${pct(r.estimate, domain[0], domain[1])}%` }}
                  />
                </div>
                <MarkTip>{r.value}</MarkTip>
              </div>
              <div className="tabular col-span-2 -mt-1 pb-1.5 text-muted-foreground sm:col-span-1 sm:mt-0 sm:py-1.5 sm:text-right">
                {r.value}
              </div>
            </div>
          );
        })}
        <div className="hidden sm:block" />
        <div className="relative col-start-2 h-5" aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="tabular absolute top-1 -translate-x-1/2 text-[0.7rem] text-muted-foreground"
              style={{ left: `${pct(t, domain[0], domain[1])}%` }}
            >
              {format(t)}
            </span>
          ))}
        </div>
      </div>
      {axisLabel || references.length ? (
        <p className="mt-1 text-[0.7rem] text-muted-foreground">
          {axisLabel}
          {references.map((r) => (
            <span key={r.label}>
              {axisLabel ? " · " : ""}
              {r.dashed !== false ? "dashed" : "solid"} line: {r.label}
            </span>
          ))}
        </p>
      ) : null}
    </figure>
  );
}

// ---------------------------------------------------------------------------

/**
 * Kaplan–Meier style curve, drawn as the share of orders ready by t minutes
 * (1 − S(t)) with its pointwise 95% band, and a threshold rule.
 */
export function StepCurveChart({
  label,
  points,
  xMax,
  threshold,
  marker,
  xLabel,
  yLabel,
}: {
  label: string;
  /** Step points: from `time` on, the curve is at `value` with band [lower, upper] (all 0..1). */
  points: readonly { time: number; value: number; lower: number; upper: number }[];
  xMax: number;
  threshold?: { value: number; label: string };
  marker?: { time: number; value: number; label: string };
  xLabel?: string;
  yLabel?: string;
}) {
  const xTicks = niceTicks(0, xMax, 6).filter((t) => t <= xMax);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const X = (t: number) => pct(t, 0, xMax);
  const Y = (v: number) => 100 - v * 100;
  const safe = points.map((p) => ({
    x: X(p.time),
    value: p.value,
    lower: Number.isFinite(p.lower) ? p.lower : p.value,
    upper: Number.isFinite(p.upper) ? p.upper : p.value,
  }));
  // Step paths: the curve (and band) is 0 until the first time, then holds
  // each value until the next time.
  const line = `M0,${Y(0)}${safe.map((p) => ` H${p.x} V${Y(p.value)}`).join("")} H100`;
  const upperEdge = `M0,${Y(0)}${safe.map((p) => ` H${p.x} V${Y(p.upper)}`).join("")} H100`;
  let lowerEdge = ` V${Y(safe.length ? safe[safe.length - 1].lower : 0)}`;
  for (let i = safe.length - 1; i >= 0; i--) {
    lowerEdge += ` H${safe[i].x} V${Y(i > 0 ? safe[i - 1].lower : 0)}`;
  }
  const band = `${upperEdge}${lowerEdge} H0 Z`;
  return (
    <PlotFrame
      label={label}
      xLabel={xLabel}
      yLabel={yLabel}
      xDomain={[0, xMax]}
      yDomain={[0, 1]}
      xTicks={ticksFor(xTicks, String)}
      yTicks={ticksFor(yTicks, (v) => `${Math.round(v * 100)}%`)}
      overlay={
        <>
          <path d={band} className="fill-viz-a opacity-[0.14]" />
          <path
            d={line}
            fill="none"
            className="stroke-viz-a"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      }
    >
      {threshold ? <VRule x={X(threshold.value)} label={threshold.label} /> : null}
      {marker ? (
        <div
          className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-viz-a ring-2 ring-card"
          style={{ left: `${X(marker.time)}%`, bottom: `${marker.value * 100}%` }}
        >
          <span className="absolute top-1/2 left-3 -translate-y-1/2 rounded bg-card/90 px-1 text-[0.65rem] font-semibold whitespace-nowrap">
            {marker.label}
          </span>
        </div>
      ) : null}
    </PlotFrame>
  );
}
