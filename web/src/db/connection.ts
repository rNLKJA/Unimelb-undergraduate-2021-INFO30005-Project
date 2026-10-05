/**
 * Framework-free database factory, shared by the Next.js server (via
 * `client.ts`) and the CLI scripts (migrate / seed / reset). Kept free of
 * "server-only" so `tsx` scripts and Vitest can import it.
 */
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;
export type DbHandle = { db: Db; client: Client };

export function createDb(url: string, authToken?: string): DbHandle {
  const client = createClient({ url, authToken: authToken || undefined });
  const db = drizzle(client, { schema });
  return { db, client };
}

export async function enableForeignKeys(client: Client): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON");
}

/** Folder with the drizzle-kit generated SQL migrations (committed). */
export function migrationsFolder(root: string = process.cwd()): string {
  return path.join(root, "drizzle");
}

export async function runMigrations(db: Db, root?: string): Promise<void> {
  await migrate(db, { migrationsFolder: migrationsFolder(root) });
}

/**
 * Apply the committed migrations only if the database is behind them, and
 * return how many were pending. When the schema is current this costs one
 * query (one round trip to a remote database) instead of the migrator's
 * three. Uses the migrator's own rule: a migration is pending when it is
 * newer than the latest `created_at` in `__drizzle_migrations`.
 */
export async function migrateIfBehind(handle: DbHandle, root?: string): Promise<number> {
  const migrations = readMigrationFiles({ migrationsFolder: migrationsFolder(root) });
  let latestApplied = -Infinity;
  try {
    const result = await handle.client.execute(
      'SELECT max(created_at) AS latest FROM "__drizzle_migrations"',
    );
    const latest = result.rows[0]?.latest;
    if (latest !== null && latest !== undefined) latestApplied = Number(latest);
  } catch {
    // No migrations table yet: a new, empty database. The migrator creates it.
  }
  const pending = migrations.filter((m) => m.folderMillis > latestApplied).length;
  if (pending > 0) await runMigrations(handle.db, root);
  return pending;
}
