import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv export", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(4.99)).toBe("4.99");
  });
  it("neutralises formula injection", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell("+61 400 000 000")).toBe("'+61 400 000 000");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
  it("keeps negative numbers numeric (e.g. Melbourne latitudes)", () => {
    expect(csvCell(-37.7845)).toBe("-37.7845");
    expect(csvCell("-37.7845")).toBe("-37.7845");
    expect(csvCell(-1e-7)).toBe("-1e-7");
    expect(toCsv(["x_coord"], [{ x_coord: -37.78 }])).toBe("x_coord\r\n-37.78\r\n");
  });
  it("builds a table", () => {
    expect(toCsv(["a", "b"], [{ a: 1, b: "x" }])).toBe("a,b\r\n1,x\r\n");
  });
});
