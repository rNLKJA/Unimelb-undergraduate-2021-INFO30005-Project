/**
 * Helpers that load the ORIGINAL 2021 source from ../coursework so tests can
 * compare the TypeScript ports against the real thing.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export const COURSEWORK = path.resolve(__dirname, "../../../coursework");

const require = createRequire(import.meta.url);

export type LegacyUtility = {
  currentTime: () => string;
  discountTime: () => string;
  currentDate: () => string;
  generateOrderID: (customerId: string) => string;
  euclidean_distance: (
    van: { lat: number; lng: number },
    user: { lat: number; lng: number },
  ) => number;
};

/** `coursework/js/utility.js` has no dependencies, so it can be required directly. */
export function loadLegacyUtility(): LegacyUtility {
  return require(path.join(COURSEWORK, "js/utility.js")) as LegacyUtility;
}

export function readCoursework(relative: string): string {
  return fs.readFileSync(path.join(COURSEWORK, relative), "utf8");
}

/** Extract `function name(...) { ... }` from a source file by brace matching. */
export function extractFunction(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`function ${name} not found`);
  return extractBlock(source, start);
}

/** Return the text from `start` up to the brace that closes the first `{` after it. */
export function extractBlock(source: string, start: number): string {
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced braces");
}

/** Pull a regex literal that starts with `prefix` out of a source file. */
export function extractRegexLiteral(source: string, prefix: string): RegExp {
  const start = source.indexOf(prefix);
  if (start < 0) throw new Error(`regex ${prefix} not found`);
  const end = source.indexOf("$/", start);
  const literal = source.slice(start, end + 2);
  return new Function(`return ${literal};`)() as RegExp;
}
