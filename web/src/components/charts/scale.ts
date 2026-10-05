/** Small scale helpers for the HTML/SVG charts (framework-free, unit-tested). */

/** Position of v in [min, max] as a percentage (clamped to 0..100). */
export function pct(v: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
}

/** "Nice" round tick values covering [min, max] with about `count` steps. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(Math.round(v / step) * step);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks.map((t) => Number(t.toPrecision(12)));
}
