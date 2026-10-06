/** RFC 4180 CSV helpers for the admin "export table" feature. */
const NUMBER = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start), but
  // leave real numbers alone so negative values such as latitudes stay numeric.
  const numeric = typeof value === "number" || NUMBER.test(text);
  const safe = !numeric && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(
  columns: readonly string[],
  rows: readonly Record<string, unknown>[],
): string {
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}
