import { afterEach, describe, expect, it } from "vitest";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { createDb, migrateIfBehind, migrationsFolder, type DbHandle } from "./connection";

const committed = readMigrationFiles({ migrationsFolder: migrationsFolder() });

async function appliedCount(handle: DbHandle): Promise<number> {
  const result = await handle.client.execute('SELECT count(*) AS n FROM "__drizzle_migrations"');
  return Number(result.rows[0]?.n);
}

describe("migrateIfBehind", () => {
  let handle: DbHandle | undefined;
  afterEach(() => {
    handle?.client.close();
    handle = undefined;
  });

  it("applies every committed migration to a new, empty database", async () => {
    handle = createDb("file::memory:");
    expect(await migrateIfBehind(handle)).toBe(committed.length);
    expect(await appliedCount(handle)).toBe(committed.length);
    const tables = await handle.client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('orders', 'audit_log', 'ai_audit_log')",
    );
    expect(tables.rows).toHaveLength(3);
  });

  it("is a no-op when the schema is current", async () => {
    handle = createDb("file::memory:");
    await migrateIfBehind(handle);
    expect(await migrateIfBehind(handle)).toBe(0);
    expect(await appliedCount(handle)).toBe(committed.length);
  });

  it("applies only the migrations newer than the latest one recorded", async () => {
    handle = createDb("file::memory:");
    await migrateIfBehind(handle);
    // Pretend the last migration (0004, which replaces a trigger with
    // DROP IF EXISTS + CREATE) never ran: forget its record and its trigger.
    const last = committed.at(-1)!;
    await handle.client.execute({
      sql: 'DELETE FROM "__drizzle_migrations" WHERE created_at = ?',
      args: [last.folderMillis],
    });
    await handle.client.execute("DROP TRIGGER `ai_audit_log_record_immutable`");
    expect(await migrateIfBehind(handle)).toBe(1);
    expect(await appliedCount(handle)).toBe(committed.length);
    const trigger = await handle.client.execute(
      "SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'ai_audit_log_record_immutable'",
    );
    expect(String(trigger.rows[0]?.sql)).toContain("input_matches_server");
  });
});
