import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DOCS_DIR, listDecisions, parseTitle, withoutTitle } from "./docs";

const ROOT_DOCS = path.resolve(process.cwd(), "..", "docs");
const RENDERED = ["model-card.md", "ai-use-statement.md", "privacy-and-retention.md"];

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
    expect(list.map((d) => d.id)).toEqual(["DR-001", "DR-002", "DR-003", "DR-004"]);
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
    for (const f of [...RENDERED, ...listDecisions().map((d) => `decisions/${d.slug}.md`)]) {
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
