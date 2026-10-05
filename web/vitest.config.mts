import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
      // `server-only` throws outside the React Server runtime; stub it for tests.
      "server-only": path.resolve(dirname, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Run the Melbourne-specific assertions in a fixed zone, like the original Heroku box (UTC).
    env: { TZ: "UTC" },
  },
});
