import { describe, expect, it } from "vitest";
import { analyze, formatRatio, parseMetric, parseReferences, graphemes } from "@/lib/editorial";

describe("references", () => {
  it("computes ratios and sorts", () => {
    const r = parseReferences('account,views,median,hook\n@b,90000,30000,"Oi, tudo"\n@a,400000,10000,Gancho\n@c,5000,,x');
    expect(r.rows.map((x) => x.account)).toEqual(["@a", "@b", "@c"]);
    expect(formatRatio(r.rows[0]!.ratio)).toBe("40x");
    expect(formatRatio(r.rows[1]!.ratio)).toBe("3x");
    expect(r.rows[2]!.ratio).toBeNull();
  });
  it("parses semicolon pt numbers", () => {
    const r = parseReferences("conta;views;mediana\n@a;1,2M;300K\n@b;40.000;10.000");
    expect(r.rows[0]!.ratio).toBe(4);
    expect(parseMetric("1,5 mil")).toBe(1500);
    expect(parseMetric("2.5K")).toBe(2500);
  });
});

describe("analyze", () => {
  it("counts ZWJ emoji as one grapheme and caption rules", () => {
    expect(graphemes("👩‍💻").length).toBe(1);
    const r = analyze("Salve este post #a #b #c #d #e #f", { kind: "caption" });
    expect(r.stats.hashtags).toBe(6);
    expect(r.checks.find((c) => c.id === "tags")?.level).toBe("warn");
  });
});
