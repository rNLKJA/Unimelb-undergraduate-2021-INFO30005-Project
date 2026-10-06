/**
 * pnpm showcase: run the guided tour and rebuild the showcase media.
 *
 *   pnpm showcase                                             # against production
 *   BASE_URL=http://localhost:3000 pnpm showcase --fresh-db   # after `pnpm build`; the server is
 *                                                             # started for you on a fresh copy of
 *                                                             # the demo data (data/app.db is reset)
 *   pnpm showcase --test-only                                 # Playwright only (screenshots + raw video)
 *   pnpm showcase --media-only                                # post-process the last run only
 *   pnpm showcase -g "vendor"                                 # other arguments go to `playwright test`
 *
 * 1. Playwright records video by piping frames to ffmpeg. Instead of
 *    downloading Playwright's own ffmpeg build, this puts a small wrapper
 *    around the ffmpeg already on PATH into a project-local
 *    PLAYWRIGHT_BROWSERS_PATH (web/.playwright, git-ignored). The wrapper
 *    raises the VP8 quality from Playwright's 1 Mbit/s default: at that rate
 *    the detailed map tiles shimmer from frame to frame, which the GIFs pay
 *    for in size. No browser is downloaded either: the tour runs on the
 *    system Google Chrome (channel "chrome").
 * 2. `playwright test` runs e2e/showcase.spec.ts, writing raw screenshots,
 *    webm recordings and caption timings to web/.showcase/.
 * 3. scripts/showcase-media.mjs turns those into the committed media.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const web = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const flags = new Set(["--test-only", "--media-only", "--fresh-db"]);
const testOnly = args.includes("--test-only");
const mediaOnly = args.includes("--media-only");
const freshDb = args.includes("--fresh-db");
const passThrough = args.filter((a) => !flags.has(a));
const baseUrl = process.env.BASE_URL ?? "https://snacks-in-a-van.vercel.app";

function which(cmd) {
  const res = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], {
    encoding: "utf8",
  });
  return res.status === 0 ? res.stdout.split(/\r?\n/)[0].trim() : null;
}

/**
 * Playwright's recorder runs `ffmpeg ... -qmax 50 -crf 8 ... -b:v 1M ...`; the
 * wrapper swaps in a near-lossless setting and passes everything else through.
 */
const wrapper = (ffmpeg) => `#!/bin/sh
# Written by scripts/showcase.mjs: Playwright's video recorder, at a higher quality.
for arg do
  shift
  case "$prev" in
    -qmax) value=10 ;;
    -crf) value=4 ;;
    -b:v) value=8M ;;
    *) value=$arg ;;
  esac
  prev=$arg
  set -- "$@" "$value"
done
exec ${JSON.stringify(ffmpeg)} "$@"
`;

/** Put the system ffmpeg (wrapped, except on Windows) where Playwright looks for its own build. */
function ffmpegShim() {
  const ffmpeg = which("ffmpeg");
  if (!ffmpeg) {
    console.error(
      "ffmpeg is not on PATH; install it (e.g. `brew install ffmpeg`) to record video.",
    );
    process.exit(1);
  }
  const req = createRequire(path.join(web, "package.json"));
  const pwTest = req.resolve("@playwright/test/package.json");
  const pw = createRequire(pwTest).resolve("playwright/package.json");
  const core = path.dirname(createRequire(pw).resolve("playwright-core/package.json"));
  const browsers = JSON.parse(readFileSync(path.join(core, "browsers.json"), "utf8"));
  const { revision } = browsers.browsers.find((b) => b.name === "ffmpeg");
  const exe =
    process.platform === "darwin"
      ? "ffmpeg-mac"
      : process.platform === "win32"
        ? "ffmpeg-win64.exe"
        : "ffmpeg-linux";
  const root = path.join(web, ".playwright");
  const dir = path.join(root, `ffmpeg-${revision}`);
  const target = path.join(dir, exe);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  if (process.platform === "win32") {
    symlinkSync(ffmpeg, target);
  } else {
    writeFileSync(target, wrapper(ffmpeg));
    chmodSync(target, 0o755);
  }
  return root;
}

function run(cmd, cmdArgs, env = {}) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd: web,
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

if (!mediaOnly) {
  if (freshDb) {
    const { hostname } = new URL(baseUrl);
    if (!["localhost", "127.0.0.1"].includes(hostname)) {
      console.error("--fresh-db only applies to a local BASE_URL (it resets web/data/app.db).");
      process.exit(1);
    }
    const running = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) }).then(
      () => true,
      () => false,
    );
    if (running) {
      console.error(`A server is already running at ${baseUrl}; stop it before using --fresh-db.`);
      process.exit(1);
    }
    // The local server copies data/seed.db into place on first use and moves the
    // demo history up to "now", so every run starts from the same synthetic data.
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      rmSync(path.join(web, "data", `app.db${suffix}`), { force: true });
    }
    console.log("Reset data/app.db: the server starts from the committed seed snapshot.");
  }
  const browsersPath = ffmpegShim();
  console.log(`Tour against ${baseUrl}`);
  run("pnpm", ["exec", "playwright", "test", ...passThrough], {
    PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
  });
}
if (!testOnly) run("node", [path.join("scripts", "showcase-media.mjs")]);
