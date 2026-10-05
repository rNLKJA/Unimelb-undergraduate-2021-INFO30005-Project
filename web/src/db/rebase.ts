/**
 * Shift the demo history of a freshly copied seed snapshot so it is relative
 * to "now". The committed `data/seed.db` was generated at some fixed moment;
 * without this, the "today" figures on the vendor dashboard and the recent
 * order history would drift further into the past every day.
 *
 * Every epoch-millisecond column moves by the same delta, and the legacy
 * "D-M-YYYY" strings (`orders.order_date`, `blogs.date`) are recomputed in
 * Melbourne time. Framework-free so the CLI and tests can use it.
 */
import type { Client, InStatement } from "@libsql/client";
import { orderDateString } from "../lib/legacy-time";

export const SEEDED_AT_KEY = "seeded_at";

const SHIFTS: readonly [table: string, columns: readonly string[]][] = [
  [
    "orders",
    [
      "start_time",
      "discount_time",
      "fulfilled_time",
      "collection_time",
      "end_time",
      "closed_out_at",
    ],
  ],
  ["customers", ["created_at"]],
  ["blogs", ["created_at"]],
  ["vans", ["location_updated_at"]],
  ["admins", ["created_at"]],
];

export async function rebaseHistory(client: Client, now: number = Date.now()) {
  const meta = await client.execute({
    sql: "SELECT value FROM app_meta WHERE key = ?",
    args: [SEEDED_AT_KEY],
  });
  const seededAt = Number(meta.rows[0]?.value ?? NaN);
  if (!Number.isFinite(seededAt)) return { shifted: false, delta: 0 };
  const delta = Math.round(now - seededAt);
  if (Math.abs(delta) < 60_000) return { shifted: false, delta: 0 };

  const statements: InStatement[] = [];
  for (const [table, columns] of SHIFTS) {
    const sets = columns.map((c) => `${c} = CASE WHEN ${c} IS NULL THEN NULL ELSE ${c} + ? END`);
    statements.push({
      sql: `UPDATE ${table} SET ${sets.join(", ")}`,
      args: columns.map(() => delta),
    });
  }
  await client.batch(statements, "write");

  const orders = await client.execute("SELECT id, start_time FROM orders");
  const blogs = await client.execute("SELECT id, created_at FROM blogs");
  const dates: InStatement[] = [
    ...orders.rows.map((r) => ({
      sql: "UPDATE orders SET order_date = ? WHERE id = ?",
      args: [orderDateString(new Date(Number(r.start_time))), Number(r.id)],
    })),
    ...blogs.rows.map((r) => ({
      sql: "UPDATE blogs SET date = ? WHERE id = ?",
      args: [orderDateString(new Date(Number(r.created_at))), Number(r.id)],
    })),
    { sql: "UPDATE app_meta SET value = ? WHERE key = ?", args: [String(now), SEEDED_AT_KEY] },
  ];
  await client.batch(dates, "write");
  return { shifted: true, delta };
}
