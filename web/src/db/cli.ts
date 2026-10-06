/**
 * Database CLI used by the package.json scripts:
 *
 *   tsx src/db/cli.ts migrate            # apply drizzle/ migrations to DATABASE_URL
 *   tsx src/db/cli.ts seed               # wipe + (re)seed DATABASE_URL (remote: needs ALLOW_REMOTE_SEED=1)
 *   tsx src/db/cli.ts reset [file]       # delete + migrate + seed a local SQLite file
 *                                        # (default ./data/app.db; used to build ./data/seed.db)
 */
import fs from "node:fs";
import path from "node:path";
import { createDb, enableForeignKeys, migrateIfBehind, runMigrations } from "./connection";
import { seedDatabase } from "./seed";

const DEFAULT_URL = "file:./data/app.db";

async function main() {
  const [command, target] = process.argv.slice(2);
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (command === "reset") {
    const file = path.resolve(target ?? "data/app.db");
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      fs.rmSync(file + suffix, { force: true });
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const { db, client } = createDb(`file:${file}`);
    await enableForeignKeys(client);
    await runMigrations(db);
    const counts = await seedDatabase(db);
    await client.execute("VACUUM");
    client.close();
    console.log(`Reset ${path.relative(process.cwd(), file)}`, counts);
    return;
  }

  const url = process.env.DATABASE_URL ?? DEFAULT_URL;
  const { db, client } = createDb(url, authToken);
  if (url.startsWith("file:")) await enableForeignKeys(client);

  if (command === "migrate") {
    const pending = await migrateIfBehind({ db, client });
    const label = url.startsWith("file:") ? url : "remote database";
    console.log(`Migrated ${label}: ${pending} pending migration(s) applied`);
  } else if (command === "seed") {
    // Seeding deletes every table first (including the append-only audit
    // tables), so a remote database needs an explicit opt-in.
    if (!url.startsWith("file:") && process.env.ALLOW_REMOTE_SEED !== "1") {
      console.error(
        "Refusing to seed a remote database: seeding deletes every order, account and audit " +
          "record first. Set ALLOW_REMOTE_SEED=1 if you really mean to reset it.",
      );
      process.exitCode = 1;
      client.close();
      return;
    }
    await runMigrations(db);
    const counts = await seedDatabase(db);
    console.log("Seeded", counts);
  } else {
    console.error("Usage: tsx src/db/cli.ts <migrate|seed|reset> [file]");
    process.exitCode = 1;
  }
  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
