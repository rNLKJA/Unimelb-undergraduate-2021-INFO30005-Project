import { describe, expect, it } from "vitest";
import { formatWhen } from "./format";

describe("formatWhen", () => {
  const now = Date.parse("2026-10-01T03:00:00Z"); // 1:00 pm in Melbourne

  it("shows only the time for orders placed today in Melbourne", () => {
    expect(formatWhen(now - 30 * 60_000, now)).toMatch(/^12:30\s?pm$/i);
  });

  it("adds the date for orders from another day", () => {
    const label = formatWhen(now - 2 * 24 * 60 * 60_000, now);
    expect(label).toMatch(/29 Sept?/);
    expect(label).toMatch(/1:00\s?pm/i);
  });
});
