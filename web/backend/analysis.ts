import type {
  AnalysisReport,
  CheckIssue,
  GenerateOptions,
  RankedReel,
  SkillId,
} from '../shared/types';
import { LEXICAL_REPLACEMENTS, TYPOGRAPHIC_REPLACEMENTS } from './lexicon';

const MAX_TEXT_CHARACTERS = 60_000;
const MAX_REFERENCE_ROWS = 500;
const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s]+|(?<![\p{L}\p{M}\p{N}._%+-])[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}\p{N}-]+/giu;
const WORD_PATTERN =
  /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:[’'\-\u200c\u200d][\p{L}\p{N}][\p{L}\p{M}\p{N}]*|[.,](?=\p{N})\p{N}+)*/gu;
const HASHTAG_PATTERN = /(?:^|[^\p{L}\p{N}_])#[\p{L}\p{M}\p{N}_]+/gu;
const CODEPOINT_CONTINUATION =
  /^[\p{M}\p{Emoji_Modifier}\u{E0020}-\u{E007F}]$/u;

function codepoints(text: string): string[] {
  return Array.from(text);
}

function words(text: string): string[] {
  return text.match(WORD_PATTERN) ?? [];
}

function withoutUrls(text: string): string {
  return text.replace(URL_PATTERN, ' ');
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clipPreview(text: string, limit = 125): string {
  const points = codepoints(text);
  let end = Math.min(limit, points.length);
  // Codepoint slicing never splits a surrogate pair. Backtrack if the cut
  // would also split a joiner sequence, combining mark, emoji modifier or tag.
  while (
    end > 0 &&
    end < points.length &&
    (points[end] === '\u200d' ||
      points[end - 1] === '\u200d' ||
      CODEPOINT_CONTINUATION.test(points[end]))
  ) {
    end -= 1;
  }
  if (
    end > 0 &&
    end < points.length &&
    /^\p{Regional_Indicator}$/u.test(points[end])
  ) {
    let precedingFlags = 0;
    for (
      let index = end - 1;
      index >= 0 && /^\p{Regional_Indicator}$/u.test(points[index]);
      index -= 1
    ) {
      precedingFlags += 1;
    }
    if (precedingFlags % 2 === 1) end -= 1;
  }
  return points.slice(0, end).join('');
}

const lexicalPatterns = LEXICAL_REPLACEMENTS.map(entry => ({
  replacement: entry.replace,
  pattern: new RegExp(
    `(?<![\\p{L}\\p{M}\\p{N}_])${escapeRegExp(entry.find).replace(/ /g, '[ \\t]+')}(?![\\p{L}\\p{M}\\p{N}_])`,
    'giu'
  ),
}));

const ENGLISH_CONTEXT = new Set(
  'the we our you your this that it is are have has my with of and can will not these those their they'.split(
    ' '
  )
);
const PORTUGUESE_CONTEXT = new Set(
  'eu nos nosso nossa voce voces seu sua meu minha para por com que de do da dos das um uma isso isto este esta esse essa e sao estamos tem nao pode muito'.split(
    ' '
  )
);

function hasEnglishContext(text: string): boolean {
  const tokens = words(text).map(fold);
  const english = tokens.filter(token => ENGLISH_CONTEXT.has(token)).length;
  const portuguese = tokens.filter(token =>
    PORTUGUESE_CONTEXT.has(token)
  ).length;
  // A short or mixed-language line stays untouched unless there is positive
  // English context. Homographs such as Portuguese "vital" are not translated.
  return english >= 2 && portuguese === 0;
}

function cleanSegment(segment: string): string {
  // Joiners, bidi marks and emoji tag sequences have legitimate meaning.
  // Remove only the narrow set of nonsemantic formatting artifacts below.
  let cleaned = segment
    .replace(/[\u200b\u2060\ufeff\u00ad]/gu, '')
    .replace(/[\u00a0\u202f\u2009]/gu, ' ');
  for (const entry of TYPOGRAPHIC_REPLACEMENTS) {
    if (entry.from === '—')
      cleaned = cleaned.replace(/(?<![ \t])[ \t]*—[ \t]*/gu, ', ');
    else if (entry.from === '–') {
      cleaned = cleaned
        .replace(/(?<=\d)–(?=\d)/gu, '-')
        .replace(/(?<![ \t])[ \t]+–[ \t]+/gu, ', ')
        .replace(/–/gu, '-');
    } else cleaned = cleaned.split(entry.from).join(entry.to);
  }
  cleaned = cleaned
    .split('\n')
    .map(line => {
      if (!hasEnglishContext(line)) return line;
      for (const entry of lexicalPatterns) {
        // A capitalized term may name a person, company or product. Keep it
        // instead of guessing that "Foster" should become the verb "build".
        line = line.replace(entry.pattern, match =>
          /^\p{Lu}/u.test(match) ? match : entry.replacement
        );
      }
      return line;
    })
    .join('\n');
  return cleaned
    .replace(/(?<=\S)[ \t]{2,}/gu, ' ')
    .replace(/(?<![ \t])[ \t]+([,.;:!?])/gu, '$1')
    .replace(/,[ \t]*([,.;:!?])/gu, '$1')
    .replace(/^[ \t]*(?:[,.;:]+[ \t]*)+/gmu, '')
    .replace(/\.[ \t]+\./gu, '.')
    .replace(/\n{3,}/gu, '\n\n');
}

/** Local normalization only. It never predicts authorship or changes URLs. */
export function cleanText(text: string): string {
  validateText(text);
  const parts: string[] = [];
  let cursor = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    parts.push(cleanSegment(text.slice(cursor, start)), match[0]);
    cursor = start + match[0].length;
  }
  parts.push(cleanSegment(text.slice(cursor)));
  return parts.join('').trim();
}

function positiveOption(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  label: string
): number {
  if (value === undefined) return fallback;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(`${label} deve estar entre ${min} e ${max}.`);
  }
  return value;
}

function validateText(text: string): void {
  if (typeof text !== 'string')
    throw new Error('O texto precisa ser uma sequência de caracteres.');
  if (codepoints(text).length > MAX_TEXT_CHARACTERS) {
    throw new Error(
      `O texto pode ter no máximo ${MAX_TEXT_CHARACTERS.toLocaleString('pt-BR')} caracteres.`
    );
  }
}

function issue(
  issues: CheckIssue[],
  label: string,
  severity: CheckIssue['severity'],
  detail: string
): void {
  issues.push({ label, severity, detail });
}

const CTA_PATTERNS = [
  { label: 'comentar', pattern: /\b(?:comente|comenta|comentem|comment)\b/iu },
  {
    label: 'enviar mensagem',
    pattern:
      /\b(?:me (?:mande|manda|envie|chame)|(?:mande|manda|envie) (?:uma )?mensagem|chame no (?:direct|privado)|(?:dm|message) me)\b/iu,
  },
  { label: 'salvar', pattern: /\b(?:salve|salva|salvem|save (?:this|it))\b/iu },
  {
    label: 'compartilhar',
    pattern: /\b(?:compartilhe|compartilha|compartilhem|share (?:this|it))\b/iu,
  },
  {
    label: 'seguir',
    pattern: /\b(?:siga|sigam|me siga|follow (?:me|for))\b/iu,
  },
  {
    label: 'abrir o link',
    pattern:
      /\b(?:link (?:na|da|in (?:my )?)bio|acesse (?:o )?link|clique no link)\b/iu,
  },
  {
    label: 'passar ou tocar',
    pattern:
      /\b(?:arraste|deslize|toque|swipe (?:through|left|right)|tap (?:for|to))\b/iu,
  },
  {
    label: 'responder',
    pattern:
      /\b(?:me conte|me conta|diga nos comentarios|qual (?:voce|deles|desses)|o que voce|tell me|what would you|which one)\b/iu,
  },
];

function captionChecks(
  text: string,
  report: AnalysisReport,
  keywords: string
): void {
  const issues = report.issues;
  issue(
    issues,
    'Limite da legenda',
    report.characters > 2200 ? 'fail' : 'pass',
    `${report.characters.toLocaleString('pt-BR')} de 2.200 caracteres${report.characters > 2200 ? '; reduza a legenda antes de publicar.' : '.'}`
  );
  const firstLine = text.split('\n')[0].trim();
  issue(
    issues,
    'Primeira linha',
    !firstLine || /^[#@]/u.test(firstLine)
      ? 'fail'
      : codepoints(firstLine).length > 125
        ? 'warn'
        : 'pass',
    !firstLine
      ? 'A abertura está vazia.'
      : /^[#@]/u.test(firstLine)
        ? 'A legenda começa com uma hashtag ou menção; escreva a abertura antes das etiquetas.'
        : codepoints(firstLine).length > 125
          ? 'A primeira linha passa de 125 caracteres; confira a prévia aproximada do feed.'
          : 'A primeira linha cabe na prévia aproximada de 125 caracteres.'
  );
  issue(
    issues,
    'Hashtags',
    report.hashtagCount > 5 ? 'fail' : 'pass',
    `${report.hashtagCount} hashtag${report.hashtagCount === 1 ? '' : 's'}; use até cinco relevantes.`
  );
  if (HASHTAG_PATTERN.test(withoutUrls(report.preview))) {
    issue(
      issues,
      'Hashtags na abertura',
      'warn',
      'Uma hashtag ocupa espaço na prévia do feed. Considere colocá-la ao final.'
    );
  }
  HASHTAG_PATTERN.lastIndex = 0;
  if (URL_PATTERN.test(text))
    issue(
      issues,
      'Links no corpo',
      'warn',
      'Links no corpo da legenda normalmente não são clicáveis; indique o destino disponível no perfil ou na conversa.'
    );
  URL_PATTERN.lastIndex = 0;
  const actions = CTA_PATTERNS.filter(cta =>
    cta.pattern.test(fold(withoutUrls(text)))
  ).map(cta => cta.label);
  issue(
    issues,
    'Chamada para ação',
    actions.length === 1 ? 'pass' : 'warn',
    actions.length === 1
      ? `Uma ação principal identificada: ${actions[0]}.`
      : actions.length === 0
        ? 'Nenhuma chamada clara identificada. Se a publicação pede uma ação, escreva-a de forma direta.'
        : `${actions.length} ações diferentes identificadas (${actions.join(', ')}); escolha a principal.`
  );
  const terms = keywords
    .split(/[,;\n]/u)
    .map(term => term.trim())
    .filter(Boolean);
  if (terms.length) {
    const missing = terms.filter(term => !fold(text).includes(fold(term)));
    issue(
      issues,
      'Termos de busca',
      missing.length === 0
        ? 'pass'
        : missing.length === terms.length
          ? 'fail'
          : 'warn',
      missing.length
        ? `Termos ausentes: ${missing.join(', ')}.`
        : `Os ${terms.length} termos informados aparecem na legenda.`
    );
  }
}

const STAKES = new Set(
  'stop never wrong mistake mistakes lost lose losing cost costs failed failure fail nobody no not quit fired free paid saved before until instead but except without risk warning pare nunca errado erro erros perdi perder custa custou gastei falhou falha ninguem nao sem risco evite antes ate mas gratis economizei economize'.split(
    ' '
  )
);
const SPOKEN_NUMBERS = new Set(
  'zero two three four five six seven eight nine ten twenty thirty hundred thousand million dois duas tres quatro cinco seis sete oito nove dez vinte trinta cem cento mil milhao milhoes'.split(
    ' '
  )
);
const WEAK_OPENERS = [
  'ola',
  'oi',
  'fala pessoal',
  'e ai pessoal',
  'nesse video',
  'neste video',
  'no video de hoje',
  'hoje eu',
  'hoje vamos',
  'vou mostrar',
  'bem vindo',
  'hey',
  'hi',
  'hello',
  'welcome',
  'in this video',
  'today i',
  'i am going to',
];

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function firstScriptLine(text: string): string {
  return (text.split('\n').find(line => line.trim()) ?? '')
    .trim()
    .replace(/^#{1,6}\s+/u, '')
    .replace(/^(?:gancho(?: falado)?|spoken hook|hook)\s*:\s*/iu, '');
}

function reelChecks(
  text: string,
  report: AnalysisReport,
  wpm: number,
  target: number
): void {
  const hook = firstScriptLine(text);
  const tokens = words(hook);
  const normalized = tokens.map(fold);
  const concrete = tokens.filter(
    (token, index) =>
      /\p{N}/u.test(token) ||
      SPOKEN_NUMBERS.has(normalized[index]) ||
      (index > 0 && /^\p{Lu}\p{Ll}{2,}/u.test(token))
  );
  const lengthScore = clampScore(
    tokens.length < 5
      ? 100 - (5 - tokens.length) * 20
      : tokens.length <= 12
        ? 100
        : 100 - (tokens.length - 12) * 10
  );
  const specificityScore =
    concrete.length === 0 ? 15 : clampScore(45 + concrete.length * 30);
  const stakesCount = new Set(normalized.filter(token => STAKES.has(token)))
    .size;
  const stakesScore = stakesCount === 0 ? 20 : stakesCount === 1 ? 70 : 100;
  const payloadIndex = normalized.findIndex(
    (token, index) =>
      STAKES.has(token) ||
      SPOKEN_NUMBERS.has(token) ||
      /\p{N}/u.test(token) ||
      (index > 0 && /^\p{Lu}\p{Ll}{2,}/u.test(tokens[index]))
  );
  const weakOpener = WEAK_OPENERS.find(opener => {
    const openerWords = opener.split(' ');
    return openerWords.every((token, index) => normalized[index] === token);
  });
  const frontloadScore = clampScore(
    (payloadIndex < 0
      ? 30
      : payloadIndex <= 3
        ? 100
        : payloadIndex <= 6
          ? 70
          : 40) - (weakOpener ? 30 : 0)
  );
  const addressScore = normalized.some(token =>
    ['voce', 'voces', 'seu', 'sua', 'you', 'your', 'tu', 'te'].includes(token)
  )
    ? 100
    : [
          'pare',
          'evite',
          'use',
          'aprenda',
          'salve',
          'nao',
          'stop',
          'try',
          'use',
          'save',
          'never',
        ].includes(normalized[0])
      ? 90
      : normalized.some(token =>
            ['eu', 'meu', 'minha', 'nos', 'i', 'my', 'we'].includes(token)
          )
        ? 70
        : 35;
  const scores = [
    lengthScore,
    specificityScore,
    stakesScore,
    frontloadScore,
    addressScore,
  ];
  report.hookScore = Math.round(
    clampScore(
      (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 0.6 +
        Math.min(...scores) * 0.4
    )
  );
  issue(
    report.issues,
    'Abertura (estimativa)',
    report.hookScore >= 70 && !weakOpener ? 'pass' : 'warn',
    `${report.hookScore}/100 numa heurística local de clareza, concisão e concretude. Essa pontuação não prevê retenção, alcance ou desempenho.`
  );
  issue(
    report.issues,
    'Gancho falado',
    tokens.length <= Math.floor((wpm / 60) * 3) && tokens.length > 0
      ? 'pass'
      : 'warn',
    `${tokens.length} palavras na primeira linha, cerca de ${((tokens.length / wpm) * 60).toFixed(1)} s no ritmo informado. Confira lendo em voz alta.`
  );
  if (weakOpener)
    issue(
      report.issues,
      'Introdução genérica',
      'warn',
      `A abertura começa com “${weakOpener}”. Considere começar pelo fato ou pela situação.`
    );
  if (concrete.length === 0)
    issue(
      report.issues,
      'Detalhe concreto',
      'warn',
      'A abertura não contém número ou nome identificado; inclua um detalhe verdadeiro quando fizer sentido.'
    );
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const longBeats = lines.filter(
    line => (words(line).length / wpm) * 60 > 4
  ).length;
  if (longBeats)
    issue(
      report.issues,
      'Ritmo das linhas',
      'warn',
      `${longBeats} linha(s) leva(m) mais de 4 s na estimativa. Verifique pausas e mudanças de imagem durante a gravação.`
    );
  const difference = report.durationSeconds - target;
  issue(
    report.issues,
    'Duração estimada',
    Math.abs(difference) <= Math.max(2, target * 0.15) ? 'pass' : 'warn',
    `${report.durationSeconds.toFixed(1)} s por contagem de palavras a ${wpm} palavras/minuto; objetivo de ${target} s. Pausas, edição e gravação podem mudar a duração.`
  );
}

function detectDelimiter(text: string): string {
  const counts = new Map([
    ['\t', 0],
    [',', 0],
    [';', 0],
  ]);
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && character === '\n') break;
    else if (!quoted && counts.has(character))
      counts.set(character, (counts.get(character) ?? 0) + 1);
  }
  const candidates = [...counts].sort((left, right) => right[1] - left[1]);
  if (candidates[0][1] === 0)
    throw new Error(
      'Cole uma tabela CSV ou TSV com cabeçalho: account, views, median, hook.'
    );
  return candidates[0][0];
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;
  const pushRecord = () => {
    record.push(field.trim());
    if (record.some(cell => cell.length > 0)) records.push(record);
    if (records.length > MAX_REFERENCE_ROWS + 1)
      throw new Error(
        `Use no máximo ${MAX_REFERENCE_ROWS} referências por análise.`
      );
    record = [];
    field = '';
    closedQuote = false;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        closedQuote = true;
      } else field += character;
    } else if (character === delimiter) {
      record.push(field.trim());
      field = '';
      closedQuote = false;
    } else if (character === '\n') pushRecord();
    else if (closedQuote && !/\s/u.test(character))
      throw new Error(
        'A tabela contém texto após o fechamento de aspas. Confira o CSV ou TSV.'
      );
    else if (character === '"' && !field.trim()) {
      quoted = true;
      field = '';
    } else if (!closedQuote) field += character;
  }
  if (quoted)
    throw new Error('Uma célula da tabela contém aspas sem fechamento.');
  pushRecord();
  return records;
}

function parseCount(value: string): number | null {
  const compact = fold(value).replace(/[\s\u00a0\u202f]/gu, '');
  const match = compact.match(/^(\d[\d.,]*)(k|m|b|mil|milhao|milhoes)?$/u);
  if (!match) return null;
  const raw = match[1];
  const suffix = match[2] ?? '';
  const powers: Record<string, number> = {
    '': 0,
    k: 3,
    mil: 3,
    m: 6,
    milhao: 6,
    milhoes: 6,
    b: 9,
  };
  let normalized: string;
  const commaCount = (raw.match(/,/gu) ?? []).length;
  const dotCount = (raw.match(/\./gu) ?? []).length;
  if (commaCount && dotCount) {
    const decimalIndex = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('.'));
    const whole = raw.slice(0, decimalIndex);
    const fraction = raw.slice(decimalIndex + 1);
    if (
      !/^\d+$/u.test(fraction) ||
      !(
        /^\d+$/u.test(whole) ||
        /^\d{1,3}(?:,\d{3})+$/u.test(whole) ||
        /^\d{1,3}(?:\.\d{3})+$/u.test(whole)
      )
    )
      return null;
    normalized = `${whole.replace(/[.,]/gu, '')}.${fraction}`;
  } else if (
    !suffix &&
    (/^\d{1,3}(?:,\d{3})+$/u.test(raw) || /^\d{1,3}(?:\.\d{3})+$/u.test(raw))
  ) {
    normalized = raw.replace(/[.,]/gu, '');
  } else if (commaCount + dotCount <= 1 && /^\d+(?:[.,]\d+)?$/u.test(raw)) {
    normalized = raw.replace(',', '.');
  } else if (
    /^\d{1,3}(?:,\d{3})+$/u.test(raw) ||
    /^\d{1,3}(?:\.\d{3})+$/u.test(raw)
  ) {
    normalized = raw.replace(/[.,]/gu, '');
  } else return null;
  // Shift decimal digits exactly before converting to Number. Multiplying
  // 1.001 * 1000 in binary floating point would otherwise reject 1001 views.
  const [whole, fraction = ''] = normalized.split('.');
  let digits = whole + fraction;
  const shift = powers[suffix] - fraction.length;
  if (shift >= 0) digits += '0'.repeat(shift);
  else {
    if (!digits.endsWith('0'.repeat(-shift))) return null;
    digits = digits.slice(0, shift) || '0';
  }
  const count = Number(digits);
  if (!Number.isFinite(count) || !Number.isSafeInteger(count) || count < 0)
    return null;
  return count;
}

/** Parse supplied evidence only. Missing account medians never get a fallback. */
export function parseReferenceRows(text: string): RankedReel[] {
  validateText(text);
  const source = text
    .replace(/^\ufeff/u, '')
    .replace(/\r\n?/gu, '\n')
    .trim();
  if (!source)
    throw new Error(
      'Adicione as referências com account, views, median e hook.'
    );
  const records = parseDelimited(source, detectDelimiter(source));
  const headers = (records.shift() ?? []).map(header => fold(header).trim());
  const aliases: Record<string, string[]> = {
    account: ['account', 'perfil', 'conta'],
    views: ['views', 'visualizacoes', 'visualizacoes do reel'],
    median: ['median', 'mediana'],
    hook: ['hook', 'gancho'],
  };
  const column = (name: string) =>
    headers.findIndex(header => aliases[name].includes(header));
  for (const name of Object.keys(aliases)) {
    if (headers.filter(header => aliases[name].includes(header)).length > 1)
      throw new Error(
        `A coluna ${name} aparece mais de uma vez. Deixe uma única coluna para cada dado.`
      );
  }
  for (const required of ['account', 'views', 'hook']) {
    if (column(required) < 0)
      throw new Error(
        'A tabela precisa das colunas account (perfil), views (visualizações) e hook (gancho). A median (mediana) pode ficar vazia.'
      );
  }
  if (!records.length)
    throw new Error('A tabela não contém referências para analisar.');
  const rows = records.map((cells, index): RankedReel => {
    if (cells.length !== headers.length)
      throw new Error(
        `Linha ${index + 2}: a quantidade de células não corresponde ao cabeçalho. Use aspas em ganchos com separadores.`
      );
    const account = cells[column('account')].trim();
    const hook = cells[column('hook')].trim();
    if (codepoints(account).length > 100)
      throw new Error(
        `Linha ${index + 2}: o perfil pode ter no máximo 100 caracteres.`
      );
    if (codepoints(hook).length > 2000)
      throw new Error(
        `Linha ${index + 2}: o gancho pode ter no máximo 2.000 caracteres.`
      );
    const views = parseCount(cells[column('views')]);
    if (!account || !hook || views === null)
      throw new Error(
        `Linha ${index + 2}: informe perfil, gancho e um número válido de visualizações.`
      );
    const suppliedMedian =
      column('median') < 0 ? null : parseCount(cells[column('median')]);
    const median =
      suppliedMedian !== null && suppliedMedian > 0 ? suppliedMedian : null;
    return {
      account,
      hook,
      views,
      median,
      multiple: median === null ? null : views / median,
    };
  });
  return rows.sort((left, right) =>
    left.multiple === null
      ? right.multiple === null
        ? 0
        : 1
      : right.multiple === null
        ? -1
        : right.multiple - left.multiple
  );
}

function profileBio(text: string): string | null {
  const lines = text.split('\n');
  const startPattern =
    /^(?:#{1,6}[ \t]*)?(?:bio|biografia)[ \t]*:[ \t]*(.*)$/iu;
  const index = lines.findIndex(line => startPattern.test(line.trim()));
  if (index < 0) return null;
  const nextField =
    /^(?:#{1,6}[ \t]*)?(?:nome|name|usuario|usuário|handle|perfil|link|links|destino|destaques|highlights|fixados|posts fixados|foto|categoria|contato|bio|biografia|contexto|context|objetivo|público|publico|audiência|audiencia|oferta|observações|observacoes)[ \t]*:/iu;
  const parts = [lines[index].trim().match(startPattern)?.[1] ?? ''];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (nextField.test(lines[cursor].trim())) break;
    parts.push(lines[cursor]);
  }
  return parts.join('\n').trim();
}

function contextualChecks(
  skillId: SkillId,
  text: string,
  issues: CheckIssue[]
): void {
  if (skillId === 'ig-profile') {
    const bio = profileBio(text);
    issue(
      issues,
      'Bio do perfil',
      bio === null
        ? 'warn'
        : !bio || codepoints(bio).length > 150
          ? 'fail'
          : 'pass',
      bio === null
        ? 'Identifique a bio como “Bio: …” para verificar o limite de 150 caracteres sem confundi-la com o restante do perfil.'
        : !bio
          ? 'O campo Bio está vazio.'
          : `${codepoints(bio).length} de 150 caracteres no campo Bio identificado, incluindo suas quebras de linha.`
    );
  } else if (skillId === 'ig-carousel' || skillId === 'ig-story') {
    const pattern =
      skillId === 'ig-carousel'
        ? /^(?:#{1,6}\s*)?(?:slide|pagina|página|tela)\s+\d+\b/gimu
        : /^(?:#{1,6}\s*)?(?:frame|story|stories|tela)\s+\d+\b/gimu;
    const count = (text.match(pattern) ?? []).length;
    if (count)
      issue(
        issues,
        skillId === 'ig-carousel'
          ? 'Slides identificados'
          : 'Frames identificados',
        skillId === 'ig-carousel' && count > 20 ? 'fail' : 'pass',
        `${count} ${skillId === 'ig-carousel' ? 'slides' : 'frames'} identificados por títulos numerados; confira a sequência visual.`
      );
  } else if (skillId === 'ig-audit') {
    const hasNumbers = /\p{N}/u.test(text);
    issue(
      issues,
      'Dados fornecidos',
      hasNumbers ? 'pass' : 'warn',
      hasNumbers
        ? 'Há números no material. Comparações exigem métricas, períodos e bases equivalentes; dados ausentes continuam ausentes.'
        : 'Não há números no material. Inclua os resultados reais para comparar publicações.'
    );
  } else if (skillId === 'ig-plan') {
    const hasDates =
      /\b(?:segunda|terca|quarta|quinta|sexta|sabado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b\d{4}-\d{2}-\d{2}\b/iu.test(
        fold(text)
      );
    issue(
      issues,
      'Organização da semana',
      hasDates ? 'pass' : 'warn',
      hasDates
        ? 'Há dias ou datas identificados. Confira a disponibilidade antes de organizar os rascunhos.'
        : 'Nenhum dia ou data identificado. Escolha quando cada rascunho pode ser produzido.'
    );
  }
}

/** Deterministic editorial checks; no AI, network, inferred evidence or metrics. */
export function analyzeText(
  skillId: SkillId,
  text: string,
  options: Partial<GenerateOptions> = {}
): AnalysisReport {
  validateText(text);
  const wpm = positiveOption(options.wpm, 165, 80, 260, 'O ritmo de fala');
  const duration = positiveOption(options.duration, 30, 5, 180, 'A duração');
  if (
    options.keywords !== undefined &&
    (typeof options.keywords !== 'string' ||
      codepoints(options.keywords).length > 300)
  )
    throw new Error('Os termos de busca podem ter no máximo 300 caracteres.');
  const trimmed = text.trim();
  const tokenCount = words(trimmed).length;
  const report: AnalysisReport = {
    characters: codepoints(trimmed).length,
    words: tokenCount,
    hashtagCount: (withoutUrls(trimmed).match(HASHTAG_PATTERN) ?? []).length,
    preview: clipPreview(trimmed),
    durationSeconds: Math.round((tokenCount / wpm) * 60 * 100) / 100,
    issues: [],
  };
  if (!trimmed) {
    issue(report.issues, 'Texto', 'fail', 'Adicione um texto para revisar.');
    return report;
  }
  issue(
    report.issues,
    'Texto recebido',
    'pass',
    `${report.characters.toLocaleString('pt-BR')} caracteres e ${report.words.toLocaleString('pt-BR')} palavras no material fornecido.`
  );
  if (
    /\[(?:informe|preencha|dado|numero|número|nome|link|insira)[^\]]*\]|\b(?:TODO|TBD)\b/iu.test(
      trimmed
    )
  ) {
    issue(
      report.issues,
      'Campos pendentes',
      'warn',
      'Há campos ou fatos pendentes. Preencha-os com informações verificadas antes de usar o texto.'
    );
  }
  if (skillId === 'ig-caption')
    captionChecks(trimmed, report, options.keywords ?? '');
  else if (skillId === 'ig-reel') reelChecks(trimmed, report, wpm, duration);
  else if (skillId === 'ig-human') {
    report.cleanedText = cleanText(trimmed);
    issue(
      report.issues,
      'Normalização local',
      report.cleanedText === trimmed ? 'pass' : 'warn',
      report.cleanedText === trimmed
        ? 'Nenhuma substituição local necessária.'
        : 'Há uma sugestão de limpeza de formatação e termos do léxico em inglês. Compare a sugestão com o original e preserve sua voz e seus fatos.'
    );
    issue(
      report.issues,
      'Revisão de linguagem',
      'warn',
      'Esta revisão não é um detector de autoria. As substituições do léxico são voltadas ao inglês; textos em português exigem leitura editorial, sem perseguir uma pontuação de “humanidade”.'
    );
  } else if (skillId === 'ig-viral') {
    report.rankings = parseReferenceRows(trimmed);
    const missing = report.rankings.filter(row => row.median === null).length;
    issue(
      report.issues,
      'Referências fornecidas',
      'pass',
      `${report.rankings.length} Reel(s) da tabela fornecida; a análise não busca outras publicações.`
    );
    issue(
      report.issues,
      'Base de comparação',
      missing ? 'warn' : 'pass',
      missing
        ? `${missing} referência(s) sem mediana válida do próprio perfil; o múltiplo permanece indisponível. Seguidores não substituem essa base.`
        : 'Cada múltiplo usa visualizações divididas pela mediana informada do mesmo perfil. Isso descreve a amostra, sem prever o resultado de um novo Reel.'
    );
  } else contextualChecks(skillId, trimmed, report.issues);
  return report;
}
