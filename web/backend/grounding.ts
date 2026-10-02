import type { Generation, SkillId } from '../shared/types';

type GeneratedContent = Omit<Generation, 'checks'>;

export class UnsupportedClaimError extends Error {
  readonly claims: string[];

  constructor(claims: string[]) {
    const unique = [...new Set(claims)].slice(0, 8);
    super(
      `O rascunho incluiu números sem apoio no contexto: ${unique.join('; ')}. Use somente os fatos fornecidos ou deixe uma informação pendente.`,
    );
    this.name = 'UnsupportedClaimError';
    this.claims = unique;
  }
}

interface Quantity {
  value: number;
  unit: string;
  frequency: string | null;
  raw: string;
  index: number;
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  one: 1,
  dois: 2,
  duas: 2,
  two: 2,
  tres: 3,
  three: 3,
  quatro: 4,
  four: 4,
  cinco: 5,
  five: 5,
  seis: 6,
  six: 6,
  sete: 7,
  seven: 7,
  oito: 8,
  eight: 8,
  nove: 9,
  nine: 9,
  dez: 10,
  ten: 10,
  onze: 11,
  eleven: 11,
  doze: 12,
  twelve: 12,
  treze: 13,
  thirteen: 13,
  quatorze: 14,
  catorze: 14,
  fourteen: 14,
  quinze: 15,
  fifteen: 15,
  dezesseis: 16,
  dezasseis: 16,
  sixteen: 16,
  dezessete: 17,
  seventeen: 17,
  dezoito: 18,
  eighteen: 18,
  dezenove: 19,
  nineteen: 19,
  vinte: 20,
  twenty: 20,
  trinta: 30,
  thirty: 30,
  quarenta: 40,
  forty: 40,
  cinquenta: 50,
  fifty: 50,
  sessenta: 60,
  sixty: 60,
  setenta: 70,
  seventy: 70,
  oitenta: 80,
  eighty: 80,
  noventa: 90,
  ninety: 90,
  cem: 100,
  cento: 100,
  hundred: 100,
  duzentos: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
  mil: 1000,
  thousand: 1000,
  milhao: 1_000_000,
  milhoes: 1_000_000,
  million: 1_000_000,
};
const NUMBER_WORD_PATTERN = Object.keys(NUMBER_WORDS)
  .sort((left, right) => right.length - left.length)
  .join('|');
const NUMBER_PATTERN = `(?:[+-]?\\d+(?:[.,]\\d+)*(?:[ \\t]*(?:milhoes|milhao|mil|[kmb]))?|(?:${NUMBER_WORD_PATTERN})(?:[ \\t]+(?:(?:e|and)[ \\t]+)?(?:${NUMBER_WORD_PATTERN})){0,7})`;
const UNIT_ALIASES: Record<string, { unit: string; factor: number }> = {};

function addUnits(names: string[], unit: string, factor = 1): void {
  for (const name of names) UNIT_ALIASES[name] = { unit, factor };
}

addUnits(['%', 'por cento', 'porcento', 'percent', 'percentage'], 'percent');
addUnits(
  ['hora', 'horas', 'h', 'hr', 'hrs', 'hour', 'hours'],
  'time-seconds',
  3600,
);
addUnits(
  ['minuto', 'minutos', 'min', 'mins', 'minute', 'minutes'],
  'time-seconds',
  60,
);
addUnits(
  ['segundo', 'segundos', 's', 'sec', 'secs', 'second', 'seconds'],
  'time-seconds',
);
addUnits(['dia', 'dias', 'day', 'days'], 'time-days');
addUnits(['semana', 'semanas', 'week', 'weeks'], 'time-days', 7);
addUnits(['mes', 'meses', 'month', 'months'], 'time-months');
addUnits(['ano', 'anos', 'year', 'years'], 'time-years');
addUnits(
  ['cliente', 'clientes', 'client', 'clients', 'customer', 'customers'],
  'clients',
);
addUnits(['seguidor', 'seguidores', 'follower', 'followers'], 'followers');
addUnits(['visualizacao', 'visualizacoes', 'view', 'views'], 'views');
addUnits(['venda', 'vendas', 'sale', 'sales'], 'sales');
addUnits(['receita', 'faturamento', 'revenue'], 'revenue');
addUnits(['real', 'reais', 'brl'], 'money-brl');
addUnits(['dolar', 'dolares', 'dollar', 'dollars', 'usd'], 'money-usd');
addUnits(['euro', 'euros', 'eur'], 'money-eur');
addUnits(['libra', 'libras', 'gbp'], 'money-gbp');

function escapePattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \\t]+');
}

const UNIT_PATTERN = Object.keys(UNIT_ALIASES)
  .sort((left, right) => right.length - left.length)
  .map(escapePattern)
  .join('|');
const POSTFIX_QUANTITY = new RegExp(
  `(?<![a-z0-9_#@])(${NUMBER_PATTERN})[ \\t]*(?:de[ \\t]+)?(${UNIT_PATTERN})(?![a-z])`,
  'gu',
);
const PREFIX_QUANTITY = new RegExp(
  `(?<![a-z0-9_])((?:r\\$|us\\$|\\$|€|£)|(?:clientes?|clients?|customers?|followers?|seguidores|visualizacoes|views|vendas|sales|receita|faturamento|revenue))[ \\t]*(?:["':]|de|of)?[ \\t]*(${NUMBER_PATTERN})(?![a-z0-9_])`,
  'gu',
);
const PHANTOM_NOTE =
  /\b(?:scored|scores?|hookscore|pontuacao|human score|humanizer|humanizador|length|tempo estimado|duracao estimada|estimated (?:time|duration|length)|estimativa de (?:tempo|duracao))\b/u;
const PHANTOM_STATUS = /\b(?:PASS|STRONG|FAIL|FLAGGED|READY|WEAK)\b/u;

function numericValue(raw: string): number | null {
  if (/^[+-]?\d/u.test(raw)) {
    const match = raw
      .replace(/[ \t]/gu, '')
      .match(/^([+-]?\d[\d.,]*)(milhoes|milhao|mil|[kmb])?$/u);
    if (!match) return null;
    let value = match[1];
    const suffix = match[2] ?? '';
    const comma = value.lastIndexOf(',');
    const dot = value.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      const last = Math.max(comma, dot);
      value =
        value.slice(0, last).replace(/[.,]/gu, '') +
        '.' +
        value.slice(last + 1);
    } else if (!suffix && /^[+-]?\d{1,3}(?:[.,]\d{3})+$/u.test(value))
      value = value.replace(/[.,]/gu, '');
    else value = value.replace(',', '.');
    const factors: Record<string, number> = {
      '': 1,
      k: 1000,
      mil: 1000,
      m: 1_000_000,
      milhao: 1_000_000,
      milhoes: 1_000_000,
      b: 1_000_000_000,
    };
    const parsed = Number(value) * factors[suffix];
    return Number.isFinite(parsed) ? parsed : null;
  }
  let total = 0;
  let group = 0;
  for (const token of raw
    .split(/[ \t]+/u)
    .filter((word) => word !== 'e' && word !== 'and')) {
    const value = NUMBER_WORDS[token];
    if (value === undefined) return null;
    if (value === 100) group = (group || 1) * 100;
    else if (value >= 1000) {
      total += (group || 1) * value;
      group = 0;
    } else group += value;
  }
  return total + group;
}

function frequencyAfter(text: string, end: number): string | null {
  const period = text
    .slice(end, end + 35)
    .match(
      /^[ \t]*(?:por|ao|a cada|per|\/)[ \t]*(dia|day|semana|week|mes|month|ano|year)\b/u,
    )?.[1];
  return period
    ? (
        {
          dia: 'day',
          day: 'day',
          semana: 'week',
          week: 'week',
          mes: 'month',
          month: 'month',
          ano: 'year',
          year: 'year',
        } as Record<string, string>
      )[period]
    : null;
}

function ignoreStructuralTime(
  text: string,
  index: number,
  raw: string,
  unit: string,
): boolean {
  if (!unit.startsWith('time-')) return false;
  const prefix =
    text
      .slice(Math.max(0, index - 100), index)
      .split(/[.!?;\n]/u)
      .pop()
      ?.trim() ?? '';
  if (
    /^(?:\d+[.) -]+)?(?:reserve|dedique|grave|filme|leia|planeje|escolha|record|allow|spend)\b/u.test(
      prefix,
    )
  )
    return true;
  if (
    /(?:plano|planejamento|cronograma|calendario)[ \t]+(?:de|para)?[ \t]*$/u.test(
      prefix,
    )
  )
    return true;
  if (
    /\b(?:gancho|cena|frame|card|tela|take|roteiro|reel|video|on.screen)[^.!?;\n]{0,45}$/u.test(
      prefix,
    ) &&
    /\b(?:s|sec|secs|segundos?|seconds?)$/u.test(raw)
  )
    return true;
  return false;
}

function quantities(original: string): Quantity[] {
  const mask = (match: string) => ' '.repeat(match.length);
  const text = fold(original)
    .replace(/https?:\/\/\S+|www\.\S+/gu, mask)
    .replace(
      /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{1,2}:\d{2}(?::\d{2})?\b/gu,
      mask,
    );
  const result: Quantity[] = [];
  for (const match of text.matchAll(POSTFIX_QUANTITY)) {
    const alias = UNIT_ALIASES[match[2].replace(/[ \t]+/gu, ' ')];
    const value = numericValue(match[1]);
    const index = match.index ?? 0;
    if (
      value === null ||
      ignoreStructuralTime(text, index, match[0], alias.unit)
    )
      continue;
    const before = text.slice(Math.max(0, index - 70), index);
    if (
      /^(?:um|uma|one)$/u.test(match[1]) &&
      !/\b(?:atendi|atendemos|tenho|tivemos|consegui|ganhei|vendi|vendemos|perdi|we|i|our|my|served|sold|lost|have|had)\b/u.test(
        before,
      )
    )
      continue;
    result.push({
      value: value * alias.factor,
      unit: alias.unit,
      frequency: frequencyAfter(text, index + match[0].length),
      raw: match[0],
      index,
    });
  }
  for (const match of text.matchAll(PREFIX_QUANTITY)) {
    const value = numericValue(match[2]);
    if (value === null) continue;
    const index = match.index ?? 0;
    const prefix = match[1];
    const unit =
      prefix === 'r$'
        ? 'money-brl'
        : prefix === '$' || prefix === 'us$'
          ? 'money-usd'
          : prefix === '€'
            ? 'money-eur'
            : prefix === '£'
              ? 'money-gbp'
              : UNIT_ALIASES[prefix]?.unit;
    if (!unit) continue;
    result.push({
      value,
      unit,
      frequency: frequencyAfter(text, index + match[0].length),
      raw: match[0],
      index,
    });
  }
  return result;
}

function forbiddenBySource(source: string, claim: Quantity): boolean {
  const before = fold(source).slice(Math.max(0, claim.index - 80), claim.index);
  return /\b(?:nao (?:invente|cite|use|diga|afirme|mencione)|evite (?:afirmar|inventar|citar|usar)|do not (?:claim|invent|say|use))[^.!?;\n]{0,60}$/u.test(
    before,
  );
}

function sameQuantity(left: Quantity, right: Quantity): boolean {
  const tolerance =
    Math.max(1, Math.abs(left.value), Math.abs(right.value)) *
    Number.EPSILON *
    8;
  return (
    left.unit === right.unit &&
    Math.abs(left.value - right.value) <= tolerance &&
    (right.frequency === null || left.frequency === right.frequency)
  );
}

function safeNote(note: string): boolean {
  const normalized = fold(note);
  if (PHANTOM_NOTE.test(normalized) || PHANTOM_STATUS.test(note)) return false;
  if (
    /\b(?:duracao|duration|tempo)(?:[ \t]+total)?[ \t]*:[ \t]*\d/u.test(
      normalized,
    )
  )
    return false;
  if (
    /\bestimativa\b/u.test(normalized) &&
    /\btempo\b|\bduracao\b|\b\d+(?:[.,]\d+)?\s*(?:s|segundos?|seconds?)\b/u.test(
      normalized,
    )
  )
    return false;
  return true;
}

/**
 * A conservative quantity check, not a proof that a narrative is true.
 * It understands common Portuguese/English quantities and unit aliases;
 * it does not infer revenue, ratios, clients or results from unlabelled numbers.
 */
export function sanitizeGeneration(
  skillId: SkillId,
  generated: GeneratedContent,
  source: string,
): GeneratedContent {
  const sanitized: GeneratedContent = {
    ...generated,
    notes: generated.notes.filter(safeNote),
    slides:
      skillId === 'ig-carousel'
        ? generated.slides.map((slide) => ({ ...slide }))
        : [],
    schedule:
      skillId === 'ig-plan'
        ? generated.schedule.map((item) => ({ ...item }))
        : [],
  };
  const known = quantities(source).filter(
    (claim) => !forbiddenBySource(source, claim),
  );
  const texts = [
    sanitized.title,
    sanitized.content,
    ...sanitized.notes,
    ...sanitized.slides.flatMap((slide) => [slide.title, slide.body]),
    ...sanitized.schedule.flatMap((item) => [
      item.title,
      item.idea,
      item.format,
    ]),
  ];
  const unsupported = texts
    .flatMap(quantities)
    .filter((claim) => !known.some((fact) => sameQuantity(fact, claim)));
  if (unsupported.length)
    throw new UnsupportedClaimError(unsupported.map((claim) => claim.raw));
  return sanitized;
}
