import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { pct } from "./scale";

export type Tick = { value: number; label: string };

/**
 * Responsive chart frame: axis text is HTML (it stays legible at 375px),
 * the plot area is a positioned box that children draw into with
 * percentages, and an optional SVG overlay (0-100 viewBox, non-scaling
 * strokes) carries lines and bands. Gridlines are solid hairlines.
 */
export function PlotFrame({
  label,
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  className,
  plotClassName = "h-56",
  children,
  overlay,
}: {
  /** Accessible summary of what the chart shows (the table view has the numbers). */
  label: string;
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: readonly Tick[];
  yTicks: readonly Tick[];
  xLabel?: string;
  yLabel?: string;
  className?: string;
  plotClassName?: string;
  children?: ReactNode;
  /** SVG elements drawn in a 0..100 x 0..100 box (y = 0 at the top). */
  overlay?: ReactNode;
}) {
  return (
    <div role="img" aria-label={label} className={cn("min-w-0 pr-3 text-[0.7rem]", className)}>
      {yLabel ? <p className="mb-1 ml-11 text-xs text-muted-foreground">{yLabel}</p> : null}
      <div className="flex">
        <div className="relative w-11 shrink-0" aria-hidden>
          {yTicks.map((t) => (
            <span
              key={t.value}
              className="tabular absolute right-2 translate-y-1/2 text-muted-foreground"
              style={{ bottom: `${pct(t.value, yDomain[0], yDomain[1])}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
        <div className={cn("relative flex-1 border-b border-l border-viz-grid", plotClassName)}>
          {yTicks.map((t) =>
            t.value === yDomain[0] ? null : (
              <div
                key={t.value}
                aria-hidden
                className="absolute inset-x-0 border-t border-viz-grid"
                style={{ bottom: `${pct(t.value, yDomain[0], yDomain[1])}%` }}
              />
            ),
          )}
          {overlay ? (
            <svg
              aria-hidden
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {overlay}
            </svg>
          ) : null}
          {children}
        </div>
      </div>
      <div className="relative ml-11 h-5" aria-hidden>
        {xTicks.map((t) => (
          <span
            key={t.value}
            className="tabular absolute top-1 -translate-x-1/2 whitespace-nowrap text-muted-foreground"
            style={{ left: `${pct(t.value, xDomain[0], xDomain[1])}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>
      {xLabel ? <p className="mt-1 ml-11 text-xs text-muted-foreground">{xLabel}</p> : null}
    </div>
  );
}

/** Hover tooltip for a mark (CSS only; the data table carries the same values for keyboard and screen-reader users). */
export function MarkTip({
  children,
  align = "center",
}: {
  children: ReactNode;
  align?: "center" | "left" | "right";
}) {
  return (
    <span
      className={cn(
        "pointer-events-none invisible absolute bottom-full z-10 mb-1.5 rounded-lg border bg-popover px-2 py-1 text-[0.7rem] whitespace-nowrap text-popover-foreground shadow-md group-hover:visible",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "left" && "left-0",
        align === "right" && "right-0",
      )}
    >
      {children}
    </span>
  );
}

/** "Show the numbers" disclosure under every chart. */
export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <details className="group/table mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        Show the data table
      </summary>
      <div
        className="mt-2 max-h-72 overflow-auto rounded-xl border"
        tabIndex={0}
        role="region"
        aria-label={caption}
      >
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-muted">
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {r.map((cell, j) => (
                  <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
