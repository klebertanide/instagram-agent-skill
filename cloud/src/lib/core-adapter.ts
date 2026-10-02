// Bridges the vendored core (src/lib/core, MIT) to the app's tool ids and check format.
import type { ToolId } from "./tools";
import { analyze, detectDelimiter, type Check, type RefRow } from "./editorial";
import type { SkillId } from "./core/types";
import { analyzeText, parseReferenceRows } from "./core/analysis";
import { sanitizeGeneration, UnsupportedClaimError } from "./core/grounding";
import type { Generation, SkillId as CoreSkill } from "./core/types";

export const SKILL_BY_TOOL: Record<ToolId, SkillId> = {
  reel: "ig-reel",
  caption: "ig-caption",
  carousel: "ig-carousel",
  stories: "ig-story",
  weekplan: "ig-plan",
  review: "ig-human",
  comment: "ig-comment",
  replies: "ig-reply",
  dm: "ig-dm",
  repurpose: "ig-repurpose",
  profile: "ig-profile",
  results: "ig-audit",
  references: "ig-viral",
};

const LEVEL = { pass: "ok", warn: "warn", fail: "error" } as const;
export const MAX_DURATION = 600;

/** Core reference parser adapted to the app's RefRow shape (ratio = views/median, null when median absent). */
export function coreReferences(text: string): { rows: RefRow[]; delimiter: string; errors: string[] } {
  try {
    const ranked = parseReferenceRows(text);
    const delimiter = detectDelimiter(text.replace(/^\uFEFF/, "").split(/\r?\n/)[0] ?? "");
    return {
      rows: ranked.map((r) => ({ account: r.account, views: r.views, median: r.median, hook: r.hook, ratio: r.multiple })),
      delimiter,
      errors: [],
    };
  } catch (e) {
    return { rows: [], delimiter: "", errors: [e instanceof Error ? e.message : "Não foi possível ler a tabela."] };
  }
}

/** Deterministic server checks from the core; drops the local heuristic score (no scores shown to users). */
export function coreChecks(
  tool: string,
  text: string,
  opts: { wpm?: number | null; duration?: number | null; goal?: string; keywords?: string },
): Check[] | null {
  const skill = SKILL_BY_TOOL[tool as ToolId];
  if (!skill || skill === "ig-viral" || !text.trim()) return null;
  try {
    const target = Math.min(MAX_DURATION, Math.max(5, opts.duration ?? 30));
    const wpm = Math.min(260, Math.max(80, opts.wpm ?? 165));
    // Vendored core caps duration at 180 s; the app supports up to 600 s. For longer
    // targets, run the core with 180 and rewrite only its duration issue against the
    // user's real target (same tolerance formula), so no check cites a different value.
    const report = analyzeText(skill, text, {
      duration: Math.min(180, target),
      wpm,
      intent: (opts.goal ?? "").slice(0, 200),
      keywords: (opts.keywords ?? "").slice(0, 300),
    });
    const issues = report.issues.map((i) => {
      if (target <= 180 || i.label !== "Duração estimada") return i;
      const secs = report.durationSeconds;
      const ok = Math.abs(secs - target) <= Math.max(2, target * 0.15);
      return {
        ...i,
        severity: ok ? ("pass" as const) : ("warn" as const),
        detail: `${secs.toFixed(1)} s por contagem de palavras a ${wpm} palavras/minuto; objetivo de ${target} s. Pausas, edição e gravação podem mudar a duração.`,
      };
    });
    return issues
      .filter((i) => !/\d+\s*\/\s*100/.test(i.detail))
      .map((i, n) => ({ id: `core-${n}`, level: LEVEL[i.severity], label: i.label, detail: i.detail }));
  } catch {
    return null;
  }
}


export type AnalysisOptions = { wpm?: number | null; duration?: number | null; goal?: string; keywords?: string };

/** Reads the original analysis options stored with a draft, ignoring anything else. */
export function pickOptions(o: unknown): AnalysisOptions {
  const r = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
  const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null);
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  return { wpm: num(r["wpm"], 80, 260), duration: num(r["duration"], 5, 600), goal: str(r["goal"], 500), keywords: str(r["keywords"], 300) };
}

/** Server-side review of current text/slides with the given (original) options. Never trusts client checks. */
export function reviewDraft(kind: string, content: string, slides: string[], opts: AnalysisOptions) {
  if (kind === "references") return { stats: null, checks: [] as Check[] };
  const k = kind === "repurpose" ? "reel" : kind;
  const text = kind === "carousel" ? [...slides, content].join("\n\n") : content;
  const base = analyze(text, { kind: k, wpm: opts.wpm ?? null, duration: opts.duration ?? null });
  return { stats: base.stats, checks: coreChecks(kind, text, opts) ?? base.checks };
}

/**
 * Factual sources for grounding: only the user's context and profile.proof, plus computed reference rows.
 * Options (duration/wpm/goal/keywords) and profile examples/avoid are NOT facts.
 */
export function groundingFacts(context: string, proof: string | undefined, rankings: { account: string; views: number | null; median: number | null; ratio: number | null }[] = []) {
  return [
    context,
    proof ?? "",
    ...rankings.map((r) => `${r.account}: ${r.views ?? "?"} visualizações; mediana ${r.median ?? "não informada"}; ${r.ratio ?? "não calculado"} vezes a mediana.`),
  ].join("\n");
}


const RATIO_RE = /(\d+(?:[.,]\d+)?)\s*(%|por\s*cento|percent|x\b|vezes)/giu;
const unitOf = (u: string) => (/%|cento|percent/i.test(u) ? "%" : "x");
const numOf = (n: string) => String(Number(n.replace(",", ".")));

/** Percentages and multipliers ("90%", "3x", "12 vezes") must appear with the same unit in the facts. */
export function unsupportedRatios(texts: string[], facts: string): string[] {
  const known = new Set<string>();
  for (const m of facts.matchAll(RATIO_RE)) known.add(numOf(m[1]!) + unitOf(m[2]!));
  const bad: string[] = [];
  for (const t of texts) for (const m of t.replace(/\{\{[^{}]*\}\}/g, " ").matchAll(RATIO_RE)) {
    if (!known.has(numOf(m[1]!) + unitOf(m[2]!))) bad.push(m[0].trim());
  }
  return bad;
}

/** Upstream typed grounding plus the ratio guard, over content, notes, slides and schedule. */
export function groundGeneration(skill: CoreSkill, generated: Omit<Generation, "checks">, facts: string) {
  const out = sanitizeGeneration(skill, generated, facts);
  const texts = [out.title, out.content, ...out.notes, ...out.slides.flatMap((s) => [s.title, s.body]), ...out.schedule.flatMap((s) => [s.title, s.idea, s.format])];
  const bad = unsupportedRatios(texts, facts);
  if (bad.length) throw new UnsupportedClaimError(bad);
  return out;
}
