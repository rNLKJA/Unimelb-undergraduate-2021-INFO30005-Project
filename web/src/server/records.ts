import "server-only";
import bcrypt from "bcryptjs";
import { count, desc, eq, getTableColumns, like, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";

/**
 * The admin "Records" area: every table, read-only, with counts, search,
 * pagination and CSV export. Password hashes are never shown or exported.
 */
type TableSpec = {
  label: string;
  description: string;
  table: SQLiteTable;
  search: string[];
  order: string;
  redact?: string[];
};

export const RECORD_TABLES = {
  orders: {
    label: "Orders",
    description: "Every order with its state, timestamps, discount flag and rating.",
    table: schema.orders,
    search: ["orderId", "vanId", "customerId", "status"],
    order: "id",
  },
  order_items: {
    label: "Order items",
    description: "The snacks in each order (the embedded orderItems sub-schema).",
    table: schema.orderItems,
    search: ["orderId", "food"],
    order: "id",
  },
  customers: {
    label: "Customers",
    description: "Snacker accounts. Passwords are bcrypt hashes and are hidden here.",
    table: schema.customers,
    search: ["customerId", "firstName", "lastName"],
    order: "id",
    redact: ["password"],
  },
  vans: {
    label: "Vans",
    description: "Vendor vans: status (1 open / 0 closed), location and address.",
    table: schema.vans,
    search: ["vanId", "address", "status"],
    order: "id",
    redact: ["password"],
  },
  products: {
    label: "Products",
    description: "The eight-item menu recovered from the 2021 mock-up.",
    table: schema.products,
    search: ["product", "description"],
    order: "id",
  },
  blogs: {
    label: "Blog posts",
    description: "Community board posts.",
    table: schema.blogs,
    search: ["customerId", "content"],
    order: "id",
  },
  admins: {
    label: "Admins",
    description: "Accounts for this records area.",
    table: schema.admins,
    search: ["username"],
    order: "id",
    redact: ["password"],
  },
  app_meta: {
    label: "App meta",
    description: "Key/value bookkeeping (when the demo data was seeded).",
    table: schema.appMeta,
    search: ["key", "value"],
    order: "key",
  },
} satisfies Record<string, TableSpec>;

export type RecordTableName = keyof typeof RECORD_TABLES;

export function isRecordTable(name: string): name is RecordTableName {
  return Object.prototype.hasOwnProperty.call(RECORD_TABLES, name);
}

export const REDACTED = "[hidden bcrypt hash]";

function spec(name: RecordTableName): TableSpec {
  return RECORD_TABLES[name];
}

function columnsOf(name: RecordTableName) {
  return Object.entries(getTableColumns(spec(name).table)) as [string, SQLiteColumn][];
}

/** Database column names, in schema order. */
export function recordColumns(name: RecordTableName): string[] {
  return columnsOf(name).map(([, col]) => col.name);
}

function serialise(name: RecordTableName, row: Record<string, unknown>) {
  const redact = new Set(spec(name).redact ?? []);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, col] of columnsOf(name)) {
    const value = row[key];
    if (redact.has(key)) out[col.name] = REDACTED;
    else if (value instanceof Date) out[col.name] = value.toISOString();
    else if (value === undefined) out[col.name] = null;
    else out[col.name] = value as string | number | boolean | null;
  }
  return out;
}

function whereFor(name: RecordTableName, q: string | undefined): SQL | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  const cols = Object.fromEntries(columnsOf(name));
  const pattern = `%${term.replace(/[%_]/g, "")}%`;
  return or(...spec(name).search.map((k) => like(cols[k], pattern)));
}

export async function recordCounts(): Promise<
  { name: RecordTableName; label: string; count: number }[]
> {
  const db = await getDb();
  const names = Object.keys(RECORD_TABLES) as RecordTableName[];
  const counts = await Promise.all(
    names.map((n) =>
      db
        .select({ n: count() })
        .from(spec(n).table)
        .then((r) => Number(r[0].n)),
    ),
  );
  return names.map((n, i) => ({ name: n, label: spec(n).label, count: counts[i] }));
}

export async function recordPage(
  name: RecordTableName,
  options: { q?: string; page?: number; pageSize?: number },
) {
  const db = await getDb();
  const pageSize = Math.min(100, Math.max(10, options.pageSize ?? 25));
  const page = Math.max(1, options.page ?? 1);
  const s = spec(name);
  const cols = Object.fromEntries(columnsOf(name));
  const where = whereFor(name, options.q);
  const [[{ n }], rows] = await Promise.all([
    db.select({ n: count() }).from(s.table).where(where),
    db
      .select()
      .from(s.table)
      .where(where)
      .orderBy(desc(cols[s.order]))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  return {
    columns: recordColumns(name),
    rows: (rows as Record<string, unknown>[]).map((r) => serialise(name, r)),
    total: Number(n),
    page,
    pageSize,
  };
}

export async function allRecords(name: RecordTableName, q?: string) {
  const db = await getDb();
  const s = spec(name);
  const cols = Object.fromEntries(columnsOf(name));
  const rows = await db
    .select()
    .from(s.table)
    .where(whereFor(name, q))
    .orderBy(desc(cols[s.order]));
  return {
    columns: recordColumns(name),
    rows: (rows as Record<string, unknown>[]).map((r) => serialise(name, r)),
  };
}

export async function authenticateAdmin(username: string, password: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.username, username))
    .limit(1);
  return !!row && (await bcrypt.compare(password, row.password));
}

export async function adminExists(username: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ id: schema.admins.id })
    .from(schema.admins)
    .where(eq(schema.admins.username, username))
    .limit(1);
  return !!row;
}
