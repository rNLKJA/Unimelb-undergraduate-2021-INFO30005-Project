/**
 * Database CLI used by the package.json scripts:
 *
 *   tsx src/db/cli.ts migrate            # apply drizzle/ migrations to DATABASE_URL
 *   tsx src/db/cli.ts seed               # (re)seed DATABASE_URL
 *   tsx src/db/cli.ts reset [file]       # delete + migrate + seed a local SQLite file
 *                                        # (default ./data/app.db; used to build ./data/seed.db)
 */
import fs from "node:fs";
import path from "node:path";
import { createDb, enableForeignKeys, runMigrations } from "./connection";
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
    await runMigrations(db);
    console.log(`Migrated ${url.startsWith("file:") ? url : "remote database"}`);
  } else if (command === "seed") {
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
