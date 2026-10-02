// Pure, deterministic editorial helpers shared by server and browser.
// No network, no randomness, no AI. Never produces predictive scores.

export type CheckLevel = "ok" | "warn" | "error" | "info";
export type Check = { id: string; level: CheckLevel; label: string; detail?: string };
export type Stats = {
  chars: number;
  words: number;
  hashtags: number;
  preview: string;
  speechSeconds: number | null;
  wpm: number | null;
};

export const CAPTION_LIMIT = 2200;
export const MAX_HASHTAGS = 5;
export const PREVIEW_LEN = 125;

function segmenter() {
  try {
    return new Intl.Segmenter("pt-BR", { granularity: "grapheme" });
  } catch {
    return null;
  }
}

export function graphemes(s: string): string[] {
  const seg = segmenter();
  return seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);
}

export function countWords(s: string): number {
  return s
    .trim()
    .split(/\s+/u)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function findHashtags(s: string): string[] {
  const out: string[] = [];
  const re = /(^|[^\p{L}\p{N}_&/])#([\p{L}\p{N}_]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push("#" + (m[2] ?? ""));
  return out;
}

const CTA_RE =
  /\b(comente|comenta|salve|salva|compartilhe|compartilha|envie|manda|mande|clique|link na bio|siga|segue|me conta|conta aqui|responda|chama no direct|me chama|inscreva|garanta|baixe|comment|save this|save it|share|follow|click|link in bio|dm me|send me|tap|reply|sign up|download)\b/iu;

export function hasCTA(s: string): boolean {
  return CTA_RE.test(s);
}

export function speechSeconds(words: number, wpm: number): number {
  if (!wpm || wpm <= 0) return 0;
  return Math.round((words / wpm) * 60);
}

export function placeholders(s: string): string[] {
  return Array.from(new Set(s.match(/\{\{[^{}]{1,60}\}\}/g) ?? []));
}

export type AnalyzeOptions = { kind: string; wpm?: number | null; duration?: number | null };

export function analyze(text: string, opts: AnalyzeOptions): { stats: Stats; checks: Check[] } {
  const g = graphemes(text);
  const words = countWords(text);
  const tags = findHashtags(text);
  const isSpoken = opts.kind === "reel" || opts.kind === "stories";
  const wpm = isSpoken ? opts.wpm || 150 : null;
  const secs = wpm ? speechSeconds(words, wpm) : null;
  const stats: Stats = {
    chars: g.length,
    words,
    hashtags: tags.length,
    preview: g.slice(0, PREVIEW_LEN).join(""),
    speechSeconds: secs,
    wpm,
  };
  const checks: Check[] = [];

  if (!text.trim()) {
    checks.push({ id: "empty", level: "error", label: "Texto vazio" });
    return { stats, checks };
  }

  if (opts.kind === "caption") {
    checks.push(
      g.length > CAPTION_LIMIT
        ? { id: "limit", level: "error", label: `Passa do limite de ${CAPTION_LIMIT} caracteres`, detail: `${g.length} caracteres` }
        : { id: "limit", level: "ok", label: `Dentro do limite de ${CAPTION_LIMIT} caracteres`, detail: `${g.length} caracteres` },
    );
    checks.push(
      tags.length > MAX_HASHTAGS
        ? { id: "tags", level: "warn", label: `Mais de ${MAX_HASHTAGS} hashtags`, detail: `${tags.length} encontradas` }
        : { id: "tags", level: "ok", label: `Até ${MAX_HASHTAGS} hashtags`, detail: `${tags.length} encontradas` },
    );
    const firstLine = text.split("\n")[0] ?? "";
    if (graphemes(firstLine).length > PREVIEW_LEN)
      checks.push({ id: "preview", level: "info", label: "A primeira frase passa do corte da prévia (125)", detail: "O início some atrás do “mais”." });
  }

  if (isSpoken && secs !== null) {
    const target = opts.duration || null;
    if (target) {
      const diff = Math.abs(secs - target) / target;
      checks.push({
        id: "duration",
        level: diff > 0.15 ? "warn" : "ok",
        label: diff > 0.15 ? "Fala estimada fora da duração pedida" : "Fala estimada próxima da duração pedida",
        detail: `≈${secs}s em ${wpm} ppm (alvo ${target}s). Estimativa por contagem de palavras.`,
      });
    } else {
      checks.push({ id: "duration", level: "info", label: `Fala estimada ≈${secs}s`, detail: `${words} palavras a ${wpm} ppm.` });
    }
  }

  checks.push(
    hasCTA(text)
      ? { id: "cta", level: "ok", label: "Tem chamada para ação" }
      : { id: "cta", level: "info", label: "Nenhuma chamada para ação reconhecida" },
  );

  const ph = placeholders(text);
  if (ph.length) checks.push({ id: "placeholders", level: "warn", label: "Complete as lacunas antes de publicar", detail: ph.join(", ") });

  const longPara = text.split(/\n\s*\n/).some((p) => countWords(p) > 70);
  if (longPara) checks.push({ id: "para", level: "info", label: "Há parágrafo longo (70+ palavras)", detail: "Considere quebrar para leitura no celular." });

  return { stats, checks };
}

// ---------- Numeric claim guard ----------

const NUM_RE = /(\d+(?:[.,]\d+)*)\s*(%|x\b|k\b|mil\b|mi\b|m\b|h\b|min\b|horas?\b|minutos?\b|dias?\b|semanas?\b|meses\b|anos?\b|reais\b|clientes?\b|alunos?\b|seguidores\b)?/giu;

function normNum(s: string) {
  return s.replace(/[.,]/g, "");
}

export type NumToken = { raw: string; value: string; unit: string };

export function extractNumbers(s: string): NumToken[] {
  const out: NumToken[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(NUM_RE.source, NUM_RE.flags);
  const cleaned = s.replace(/\{\{[^{}]*\}\}/g, " ");
  while ((m = re.exec(cleaned))) out.push({ raw: m[0].trim(), value: normNum(m[1] ?? ""), unit: (m[2] ?? "").toLowerCase() });
  return out;
}

// ---------- References (CSV/TSV/semicolon) ----------

export type RefRow = { account: string; views: number | null; median: number | null; hook: string; ratio: number | null };

export function detectDelimiter(headerLine: string): string {
  const c = { "\t": 0, ";": 0, ",": 0 } as Record<string, number>;
  let q = false;
  for (const ch of headerLine) {
    if (ch === '"') q = !q;
    else if (!q && ch in c) c[ch] = (c[ch] ?? 0) + 1;
  }
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? top[0] : ",";
}

export function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) {
      row.push(f);
      f = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(f);
      f = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else f += ch;
  }
  row.push(f);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export function parseMetric(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim().toLowerCase().replace(/\s|\u00a0/g, "");
  if (!s) return null;
  let mult = 1;
  const suf = s.match(/(k|mil|mi|m)$/);
  if (suf) {
    const sx = suf[1] ?? "";
    mult = sx === "k" || sx === "mil" ? 1e3 : 1e6;
    s = s.slice(0, -sx.length);
  }
  if (!/^[\d.,]+$/.test(s)) return null;
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const th = dec === "," ? "." : ",";
    s = s.split(th).join("").replace(dec, ".");
  } else if (hasComma) {
    const parts = s.split(",");
    const isThousands = mult === 1 && parts.length >= 2 && parts.slice(1).every((p) => p.length === 3);
    s = isThousands ? parts.join("") : s.replace(",", ".");
  } else if (hasDot) {
    const parts = s.split(".");
    const isThousands = mult === 1 && (parts.length > 2 || (parts.length === 2 && parts[1]?.length === 3));
    if (isThousands) s = parts.join("");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n * mult : null;
}

const COLS: Record<"account" | "views" | "median" | "hook", RegExp> = {
  account: /^(account|conta|perfil|handle|@|usuario|usuário)$/i,
  views: /^(views|visualiza[cç](õ|o)es|plays|reproduc(õ|o)es|alcance)$/i,
  median: /^(median|mediana|median_views|baseline)$/i,
  hook: /^(hook|gancho|abertura|titulo|título)$/i,
};

export function parseReferences(text: string): { rows: RefRow[]; delimiter: string; errors: string[] } {
  const errors: string[] = [];
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const table = parseDelimited(text, delimiter);
  if (table.length < 2) return { rows: [], delimiter, errors: ["Envie um cabeçalho e ao menos uma linha de dados."] };
  const header = (table[0] ?? []).map((h) => h.trim());
  const idx = Object.fromEntries(
    (Object.keys(COLS) as (keyof typeof COLS)[]).map((k) => [k, header.findIndex((h) => COLS[k].test(h))]),
  ) as Record<keyof typeof COLS, number>;
  if (idx.account < 0) errors.push("Coluna de conta (account) não encontrada.");
  if (idx.views < 0) errors.push("Coluna de views não encontrada.");
  if (errors.length) return { rows: [], delimiter, errors };
  const rows: RefRow[] = table.slice(1).map((r) => {
    const views = parseMetric(r[idx.views]);
    const median = idx.median >= 0 ? parseMetric(r[idx.median]) : null;
    const ratio = views != null && median != null && median > 0 ? views / median : null;
    return {
      account: (r[idx.account] ?? "").trim(),
      views,
      median: median != null && median > 0 ? median : null,
      hook: idx.hook >= 0 ? (r[idx.hook] ?? "").trim() : "",
      ratio,
    };
  });
  rows.sort((a, b) => (b.ratio ?? -Infinity) - (a.ratio ?? -Infinity));
  return { rows, delimiter, errors };
}

export function formatRatio(r: number | null): string {
  if (r == null) return "—";
  return (r >= 10 ? Math.round(r).toString() : r.toFixed(1).replace(/\.0$/, "").replace(".", ",")) + "x";
}

// ---------- Dates (America/Sao_Paulo) ----------

export function todaySP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y = 0, m = 0, d = 0] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(iso: string, n: number): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(iso: string): number {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
