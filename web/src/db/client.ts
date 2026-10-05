import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createDb, enableForeignKeys, runMigrations, type Db, type DbHandle } from "./connection";
import { rebaseHistory } from "./rebase";

/**
 * Where the data lives:
 *  - `remote`    DATABASE_URL (+ DATABASE_AUTH_TOKEN) points at Turso/libSQL;
 *                records persist and are shared by every visitor.
 *  - `local`     no DATABASE_URL, not on Vercel: ./data/app.db (created from the
 *                committed ./data/seed.db snapshot on first use).
 *  - `ephemeral` on Vercel without DATABASE_URL: seed.db is copied to /tmp on
 *                cold start — writable, but reset whenever the instance recycles.
 */
export type StorageMode = "remote" | "local" | "ephemeral";

type Resolved = { url: string; authToken?: string; mode: StorageMode; fresh: boolean };

const SEED_SNAPSHOT = path.join(process.cwd(), "data", "seed.db");

/** Copy the snapshot into place; returns true when a fresh copy was made. */
function copySeedIfMissing(target: string): boolean {
  if (fs.existsSync(target)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(SEED_SNAPSHOT)) return false;
  fs.copyFileSync(SEED_SNAPSHOT, target);
  return true;
}

export function resolveDatabase(env: NodeJS.ProcessEnv = process.env): Resolved {
  const url = env.DATABASE_URL?.trim();
  if (url) {
    return {
      url,
      authToken: env.DATABASE_AUTH_TOKEN?.trim(),
      mode: url.startsWith("file:") ? "local" : "remote",
      fresh: false,
    };
  }
  if (env.VERCEL) {
    const target = path.join("/tmp", "snacks-in-a-van.db");
    const fresh = copySeedIfMissing(target);
    return { url: `file:${target}`, mode: "ephemeral", fresh };
  }
  const target = path.join(process.cwd(), "data", "app.db");
  const fresh = copySeedIfMissing(target);
  return { url: `file:${target}`, mode: "local", fresh };
}

type Instance = DbHandle & { mode: StorageMode };

const globalForDb = globalThis as unknown as { __snacksDb?: Promise<Instance> };

async function init(): Promise<Instance> {
  const resolved = resolveDatabase();
  const handle = createDb(resolved.url, resolved.authToken);
  if (resolved.url.startsWith("file:")) {
    await enableForeignKeys(handle.client);
    // File databases migrate themselves (idempotent); remote ones use `pnpm db:migrate`.
    await runMigrations(handle.db);
    // A freshly copied snapshot gets its demo history moved up to "now".
    if (resolved.fresh) await rebaseHistory(handle.client);
  }
  return { ...handle, mode: resolved.mode };
}

function instance(): Promise<Instance> {
  if (!globalForDb.__snacksDb) {
    globalForDb.__snacksDb = init().catch((error) => {
      globalForDb.__snacksDb = undefined;
      throw error;
    });
  }
  return globalForDb.__snacksDb;
}

export async function getDb(): Promise<Db> {
  return (await instance()).db;
}

export async function getStorageMode(): Promise<StorageMode> {
  return (await instance()).mode;
}

/** Test hook: point the singleton at a specific database (e.g. in-memory). */
export function __setTestDb(handle: DbHandle | undefined) {
  globalForDb.__snacksDb = handle ? Promise.resolve({ ...handle, mode: "local" }) : undefined;
}
