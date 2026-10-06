# Snacks in a Van: web app

The deployable Next.js app (Vercel root directory). See the [root README](../README.md)
for the project overview, routes, demo accounts, the 2026 statistics and governance upgrade,
and how the data is produced.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm sync-docs    # after editing ../docs (rendered under /methods)
```
