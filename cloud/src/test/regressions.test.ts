import { describe, expect, it } from "vitest";
import { decideStartup } from "@/lib/workspace-startup";
import { groundGeneration, groundingFacts, pickOptions, reviewDraft } from "@/lib/core-adapter";
import { sanitizeGeneration, UnsupportedClaimError } from "@/lib/core/grounding";

const SRC = "Antes eu levava 5 horas para montar uma proposta. Hoje levo 20 minutos.";
const gen = (content: string, extra: Partial<{ notes: string[]; slides: { title: string; body: string }[]; schedule: never[] }> = {}) => ({
  title: "Proposta",
  content,
  notes: extra.notes ?? [],
  slides: extra.slides ?? [],
  schedule: extra.schedule ?? [],
});

describe("1) credencial guardada nunca é descartada automaticamente", () => {
  it("rede/500 mantém o token (offline)", () => {
    expect(decideStartup("id.key", "unreachable")).toEqual({ action: "use", status: "offline" });
  });
  it("código inválido pede ação explícita, sem criar outro espaço", () => {
    expect(decideStartup("id.key", "invalid")).toEqual({ action: "ask" });
  });
  it("só cria espaço quando nada está guardado", () => {
    expect(decideStartup(null, "none")).toEqual({ action: "create" });
    expect(decideStartup("id.key", "valid")).toEqual({ action: "use", status: "ready" });
  });
});

describe("3) checagens recalculadas no servidor com opções originais", () => {
  it("legenda de 2200 passa e de 3000 vira alerta", () => {
    const ok = reviewDraft("caption", "a".repeat(2200), [], {});
    const long = reviewDraft("caption", "a".repeat(3000), [], {});
    const limit = (cs: { label: string; level: string }[]) => cs.find((c) => /limite/i.test(c.label));
    expect(limit(ok.checks)?.level).toBe("ok");
    expect(limit(long.checks)?.level).toBe("error");
  });
  it("usa wpm/duração guardados, não valores novos", () => {
    const text = Array.from({ length: 150 }, () => "palavra").join(" ");
    const at150 = reviewDraft("reel", text, [], pickOptions({ wpm: 150, duration: 60 }));
    const at100 = reviewDraft("reel", text, [], pickOptions({ wpm: 100, duration: 60 }));
    expect(at150.stats?.speechSeconds).toBe(60);
    expect(at100.stats?.speechSeconds).toBe(90);
  });
  it("pickOptions descarta campos e valores fora do formato", () => {
    expect(pickOptions({ wpm: 9999, duration: "45", checks: [1], goal: "x" })).toEqual({ wpm: null, duration: null, goal: "x", keywords: "" });
  });
});

describe("4) grounding tipado: 5h/20min não autorizam números novos", () => {
  const facts = groundingFacts(SRC, "");
  it("rejeita 5%", () => {
    expect(() => sanitizeGeneration("ig-reel", gen("Reduzi 5% do tempo."), facts)).toThrow(UnsupportedClaimError);
  });
  it("rejeita 20 clientes", () => {
    expect(() => sanitizeGeneration("ig-reel", gen("Já atendi 20 clientes assim."), facts)).toThrow(UnsupportedClaimError);
  });
  it("aceita os fatos reais", () => {
    expect(sanitizeGeneration("ig-reel", gen("De 5 horas para 20 minutos."), facts).content).toContain("20 minutos");
  });
  it("valida notes e slides também", () => {
    expect(() => sanitizeGeneration("ig-reel", gen("ok", { notes: ["Gancho: 90% mais rápido"] }), facts)).toThrow(UnsupportedClaimError);
    expect(() =>
      groundGeneration("ig-carousel", gen("ok", { slides: [{ title: "Capa", body: "3x mais vendas" }] }), facts),
    ).toThrow(UnsupportedClaimError);
  });
  it("rejeita 90% e 12x mesmo com 5h/20min no contexto", () => {
    expect(() => groundGeneration("ig-reel", gen("Cortei 90% do tempo."), facts)).toThrow(UnsupportedClaimError);
    expect(() => groundGeneration("ig-reel", gen("Fiquei 12x mais rápido."), facts)).toThrow(UnsupportedClaimError);
    expect(groundGeneration("ig-reel", gen("De 5 horas para 20 minutos, {{percentual}}."), facts).content).toContain("5 horas");
  });
  it("objetivo, duração e exemplos não são fatos; proof é", () => {
    const withGoalOnly = groundingFacts(SRC, "");
    expect(withGoalOnly).not.toContain("50 clientes");
    expect(() => sanitizeGeneration("ig-caption", gen("Atendi 50 clientes."), withGoalOnly)).toThrow(UnsupportedClaimError);
    const withProof = groundingFacts(SRC, "Atendi 50 clientes em 2025.");
    expect(sanitizeGeneration("ig-caption", gen("Atendi 50 clientes."), withProof).content).toContain("50");
  });
  it("rankings reais calculados contam como fonte", () => {
    const f = groundingFacts("", "", [{ account: "@a", views: 400000, median: 10000, ratio: 40 }]);
    expect(sanitizeGeneration("ig-viral", gen("@a teve 40 vezes a mediana."), f).content).toContain("40");
  });
  it("remove slides/schedule fora da ferramenta e notas de tempo calculado", () => {
    const out = sanitizeGeneration(
      "ig-caption",
      gen("De 5 horas para 20 minutos.", { slides: [{ title: "x", body: "y" }], notes: ["Duração: 45 s", "Use a CTA do perfil"] }),
      facts,
    );
    expect(out.slides).toEqual([]);
    expect(out.notes).toEqual(["Use a CTA do perfil"]);
  });
});

// ---- Final review fixes ----
import { coreChecks as _cc, coreReferences as _cr, reviewDraft as _rd } from "@/lib/core-adapter";
import { isCurrentSession as _ics } from "@/components/studio/DraftEditor";

describe("duração até 600 s sem clamp silencioso", () => {
  const script = Array.from({ length: 1000 }, (_, i) => `palavra${i}`).join(" ") + ". Comente abaixo.";
  it("usa o alvo do usuário (400 s) na checagem", () => {
    const checks = _cc("reel", script, { wpm: 150, duration: 400 })!;
    const d = checks.find((c) => c.label === "Duração estimada")!;
    expect(d.detail).toContain("objetivo de 400 s");
    expect(d.level).toBe("ok");
    expect(checks.some((c) => /objetivo de 180 s/.test(c.detail ?? ""))).toBe(false);
  });
  it("alerta quando longe de 600 s", () => {
    const d = _cc("reel", script, { wpm: 150, duration: 600 })!.find((c) => c.label === "Duração estimada")!;
    expect(d.detail).toContain("objetivo de 600 s");
    expect(d.level).toBe("warn");
  });
  it("legenda 2910 caracteres vira erro ao recalcular", () => {
    const r = _rd("caption", "a".repeat(2910), [], { keywords: "marketing" });
    expect(r.checks.some((c) => c.level === "error")).toBe(true);
  });
});

describe("referências pelo parser do core", () => {
  it("ordena 40x e 3x, mediana ausente = null", () => {
    const r = _cr("account,views,median,hook\n@b,300,100,Gancho B\n@a,40000,1000,Gancho A\n@c,500,,Gancho C");
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => [x.account, x.ratio])).toEqual([["@a", 40], ["@b", 3], ["@c", null]]);
    expect(r.rows[2]!.median).toBeNull();
  });
  it("TSV, ponto e vírgula com aspas e 1.001k exato", () => {
    expect(_cr("account\tviews\tmedian\thook\n@a\t1.001k\t1001\tOi").rows[0]!.views).toBe(1001);
    const s = _cr('account;views;median;hook\n@a;"2,5 mil";500;"a; b"');
    expect(s.rows[0]!.views).toBe(2500);
    expect(s.rows[0]!.hook).toBe("a; b");
    expect(s.delimiter).toBe(";");
  });
  it("erros claros de cabeçalho e valor inválido", () => {
    expect(_cr("nome,valor\nx,1").errors[0]).toMatch(/account/);
    expect(_cr("account,views,hook\n@a,abc,Oi").errors[0]).toMatch(/Linha 2/);
  });
});

describe("editor ignora respostas de outra sessão", () => {
  it("compara sessão", () => {
    expect(_ics(2, 1)).toBe(false);
    expect(_ics(3, 3)).toBe(true);
  });
});
