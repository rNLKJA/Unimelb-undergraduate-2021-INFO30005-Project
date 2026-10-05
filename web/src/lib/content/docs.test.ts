import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calibrate } from "@/lib/experiments/calibrate";
import {
  meanDifferenceText,
  readCalibration,
  seedRange,
  shareWithCi,
} from "./calibration";
import { DOCS_DIR, listDecisions, parseTitle, withoutTitle } from "./docs";

const ROOT_DOCS = path.resolve(process.cwd(), "..", "docs");
const MARKDOWN = ["model-card.md", "ai-use-statement.md", "privacy-and-retention.md"];
const RENDERED = [...MARKDOWN, "calibration.json"];

describe("rendered docs", () => {
  it("are byte-identical to the repository's docs/ (run pnpm sync-docs)", () => {
    const decisions = readdirSync(path.join(ROOT_DOCS, "decisions"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join("decisions", f));
    for (const f of [...RENDERED, ...decisions]) {
      expect(readFileSync(path.join(DOCS_DIR, f), "utf8"), f).toBe(
        readFileSync(path.join(ROOT_DOCS, f), "utf8"),
      );
    }
    expect(readdirSync(path.join(DOCS_DIR, "decisions"))).toHaveLength(decisions.length);
  });

  it("lists the decision records in order with ids and titles", () => {
    const list = listDecisions();
    expect(list.map((d) => d.id)).toEqual([
      "DR-001",
      "DR-002",
      "DR-003",
      "DR-004",
      "DR-005",
      "DR-006",
      "DR-007",
      "DR-008",
    ]);
    for (const d of list) {
      expect(d.title.length).toBeGreaterThan(10);
      expect(d.slug.startsWith(d.id)).toBe(true);
    }
  });

  it("follows the decision-record format, decision stated first", () => {
    for (const d of listDecisions()) {
      const md = readFileSync(path.join(DOCS_DIR, "decisions", `${d.slug}.md`), "utf8");
      const headings = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
      expect(headings, d.id).toEqual([
        "Context",
        "Decision",
        "Options considered",
        "Why",
        "What happened",
        "What I'd change",
      ]);
      expect(md.indexOf("**Decision:**"), d.id).toBeGreaterThan(0);
      expect(md.indexOf("**Decision:**")).toBeLessThan(md.indexOf("## Context"));
    }
  });

  it("never claims compliance, and keeps to plain dashes", () => {
    for (const f of [...MARKDOWN, ...listDecisions().map((d) => `decisions/${d.slug}.md`)]) {
      const md = readFileSync(path.join(DOCS_DIR, f), "utf8");
      expect(md, f).not.toMatch(/\b(?<!no claim of formal )compliant\b|certified/i);
      expect(md, f).not.toContain("—");
    }
  });

  it("parses titles", () => {
    expect(parseTitle("# DR-007: Something\n\ntext")).toEqual({ id: "DR-007", title: "Something" });
    expect(parseTitle("# Model and data card\n")).toEqual({ id: null, title: "Model and data card" });
    expect(withoutTitle("# T\n\nBody")).toBe("Body");
  });
});

describe("calibration of the experiment analysis", () => {
  const cal = readCalibration();

  it("is reproduced exactly from the seeds and pool recorded in docs/calibration.json", () => {
    const { design, fulfilmentPool } = cal;
    expect(fulfilmentPool.values).toHaveLength(fulfilmentPool.size);
    for (const row of cal.rows) {
      const again = calibrate({
        perArm: design.perArm,
        baseline: design.baseline,
        alpha: design.alpha,
        treatmentWindow: design.treatmentWindowMinutes,
        effect: row.injectedEffect,
        reps: row.reps,
        firstSeed: row.seeds.first,
        pool: fulfilmentPool.values,
      });
      expect(again).toEqual(row);
    }
  });

  it("is quoted with the same numbers in the model card and the README", () => {
    const card = readFileSync(path.join(ROOT_DOCS, "model-card.md"), "utf8");
    const readme = readFileSync(path.resolve(ROOT_DOCS, "..", "README.md"), "utf8");
    const [effect, aa] = cal.rows;
    for (const text of [
      shareWithCi(effect.coverage),
      shareWithCi(effect.rejectZ, false),
      shareWithCi(effect.rejectExact, false),
      shareWithCi(aa.coverage, false),
      shareWithCi(aa.rejectZ, false),
      shareWithCi(aa.rejectExact, false),
      meanDifferenceText(effect),
      meanDifferenceText(aa),
      seedRange(effect),
      seedRange(aa),
      shareWithCi(cal.peeking.stopAtFirstSignificantLook, false),
    ]) {
      expect(card, text).toContain(text);
    }
    expect(readme).toContain(`${(100 * effect.coverage.p).toFixed(1)}%`);
    expect(readme).toContain(`${(100 * effect.rejectZ.p).toFixed(1)}%`);
    expect(readme).toContain("pnpm calibrate");
  });
});
