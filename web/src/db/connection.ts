/**
 * Framework-free database factory, shared by the Next.js server (via
 * `client.ts`) and the CLI scripts (migrate / seed / reset). Kept free of
 * "server-only" so `tsx` scripts and Vitest can import it.
 */
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
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
