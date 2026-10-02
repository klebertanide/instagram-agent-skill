import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeText,
  cleanText,
  parseReferenceRows,
} from '../backend/analysis';
import type { AnalysisReport, SkillId } from '../shared/types';

function check(report: AnalysisReport, label: string) {
  const found = report.issues.find(item => item.label === label);
  assert.ok(found, `A verificação “${label}” deve existir.`);
  return found;
}

test('contagens usam Unicode, mantêm palavras acentuadas e não contam emojis como palavras', () => {
  const report = analyzeText('ig-comment', 'ação e café 👩‍💻');
  assert.equal(report.characters, 15);
  assert.equal(report.words, 3);
  assert.equal(analyzeText('ig-comment', 'ação').words, 1);
  assert.equal(analyzeText('ig-comment', 'می‌روم').words, 1);
  assert.equal(analyzeText('ig-comment', 'R$18.000,50').words, 2);
});

test('a prévia não divide pares substitutos, emojis unidos ou sinais combinantes', () => {
  const singleEmoji = analyzeText('ig-caption', `${'a'.repeat(124)}😀b`);
  assert.equal(singleEmoji.preview, `${'a'.repeat(124)}😀`);
  assert.equal(singleEmoji.characters, 126);
  assert.equal(
    analyzeText('ig-caption', `${'a'.repeat(124)}👩‍💻`).preview,
    'a'.repeat(124)
  );
  assert.equal(
    analyzeText('ig-caption', `${'a'.repeat(124)}e\u0301`).preview,
    'a'.repeat(124)
  );
  assert.equal(
    analyzeText('ig-caption', `${'a'.repeat(124)}🇧🇷`).preview,
    'a'.repeat(124)
  );
});

test('hashtags em português são contadas e fragmentos de URLs ficam de fora', () => {
  const report = analyzeText(
    'ig-caption',
    '#ação #café #açúcar https://example.com/#oculto'
  );
  assert.equal(report.hashtagCount, 3);
  assert.equal(check(report, 'Primeira linha').severity, 'fail');
  assert.equal(check(report, 'Links no corpo').severity, 'warn');
});

test('a legenda respeita 2200 codepoints e cinco hashtags', () => {
  assert.equal(
    check(analyzeText('ig-caption', '😀'.repeat(2200)), 'Limite da legenda')
      .severity,
    'pass'
  );
  assert.equal(
    check(analyzeText('ig-caption', '😀'.repeat(2201)), 'Limite da legenda')
      .severity,
    'fail'
  );
  assert.equal(
    check(
      analyzeText('ig-caption', 'Uma abertura. #um #dois #três #quatro #cinco'),
      'Hashtags'
    ).severity,
    'pass'
  );
  assert.equal(
    check(
      analyzeText(
        'ig-caption',
        'Uma abertura. #um #dois #três #quatro #cinco #seis'
      ),
      'Hashtags'
    ).severity,
    'fail'
  );
});

test('chamadas para ação reconhecem português, inglês e perguntas naturais', () => {
  for (const content of [
    'Economize 2 horas. Salve este post.',
    'Me mande uma mensagem para receber o material.',
    'Clique no link da bio para ver os detalhes.',
    'Qual você escolheria?',
    'O que você faria com esse tempo?',
    'Save this for your next project.',
    'DM me for the template.',
  ]) {
    assert.equal(
      check(analyzeText('ig-caption', content), 'Chamada para ação').severity,
      'pass',
      content
    );
  }
  assert.equal(
    check(
      analyzeText('ig-caption', 'Salve e compartilhe com sua equipe.'),
      'Chamada para ação'
    ).severity,
    'warn'
  );
  assert.equal(
    check(
      analyzeText('ig-caption', 'Hoje tivemos uma reunião.'),
      'Chamada para ação'
    ).severity,
    'warn'
  );
});

test('termos de busca com acentos são verificados sem mudar a redação', () => {
  const report = analyzeText(
    'ig-caption',
    'Propostas rápidas para agências. Salve este post.',
    { keywords: 'propostas rápidas,agências' }
  );
  assert.equal(check(report, 'Termos de busca').severity, 'pass');
  assert.equal(
    check(
      analyzeText('ig-caption', 'Uma proposta rápida.', {
        keywords: 'contratos,agências',
      }),
      'Termos de busca'
    ).severity,
    'fail'
  );
});

test('material longo de outros formatos não recebe limite de legenda nem score de Reel', () => {
  const skills: SkillId[] = [
    'ig-carousel',
    'ig-story',
    'ig-plan',
    'ig-human',
    'ig-comment',
    'ig-reply',
    'ig-dm',
    'ig-repurpose',
    'ig-profile',
    'ig-audit',
  ];
  for (const skill of skills) {
    const report = analyzeText(
      skill,
      'Material original com contexto. '.repeat(100)
    );
    assert.ok(report.characters > 2200);
    assert.equal(report.hookScore, undefined);
    assert.equal(
      report.issues.some(
        item =>
          item.label === 'Limite da legenda' ||
          item.label === 'Duração estimada'
      ),
      false,
      skill
    );
  }
});

test('roteiro calcula duração apenas por palavras e ritmo informado', () => {
  const report = analyzeText(
    'ig-reel',
    Array.from({ length: 165 }, () => 'palavra').join(' '),
    { duration: 60, wpm: 165 }
  );
  assert.equal(report.words, 165);
  assert.equal(report.durationSeconds, 60);
  assert.equal(check(report, 'Duração estimada').severity, 'pass');
  assert.match(
    check(report, 'Duração estimada').detail,
    /gravação podem mudar/u
  );
  assert.equal(check(report, 'Gancho falado').severity, 'warn');
  assert.ok(
    typeof report.hookScore === 'number' &&
      report.hookScore >= 0 &&
      report.hookScore <= 100
  );
  assert.match(
    check(report, 'Abertura (estimativa)').detail,
    /não prevê retenção, alcance ou desempenho/u
  );
});

test('introduções fracas em português são avisos editoriais, sem falso positivo de prefixo', () => {
  const weak = analyzeText(
    'ig-reel',
    'Oi pessoal, hoje eu vou mostrar como economizei 2 horas.'
  );
  assert.equal(check(weak, 'Introdução genérica').severity, 'warn');
  const direct = analyzeText(
    'ig-reel',
    'Sorocaba perdeu 2 horas nesta reunião.'
  );
  assert.equal(
    direct.issues.some(item => item.label === 'Introdução genérica'),
    false
  );
  assert.equal(
    analyzeText(
      'ig-reel',
      'Gancho: Pare de perder 2 horas nas suas propostas.'
    ).preview.startsWith('Gancho:'),
    true
  );
});

test('opções inválidas e material excessivo falham com mensagens úteis', () => {
  for (const wpm of [0, 79, 261, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => analyzeText('ig-reel', 'Um roteiro.', { wpm }),
      /ritmo de fala deve estar entre 80 e 260/u
    );
  }
  for (const duration of [0, 4, 181, Number.NaN]) {
    assert.throws(
      () => analyzeText('ig-reel', 'Um roteiro.', { duration }),
      /duração deve estar entre 5 e 180/u
    );
  }
  assert.throws(
    () => analyzeText('ig-caption', 'Texto.', { keywords: 'a'.repeat(301) }),
    /300 caracteres/u
  );
  assert.throws(
    () => analyzeText('ig-repurpose', 'a'.repeat(60001)),
    /60\.000 caracteres/u
  );
  assert.equal(analyzeText('ig-comment', 'a'.repeat(60000)).characters, 60000);
});

test('texto vazio retorna contagens zeradas sem fabricar diagnóstico ou desempenho', () => {
  const report = analyzeText('ig-reel', '   ');
  assert.equal(report.characters, 0);
  assert.equal(report.words, 0);
  assert.equal(report.durationSeconds, 0);
  assert.equal(report.hookScore, undefined);
  assert.equal(check(report, 'Texto').severity, 'fail');
});

test('humanização preserva joiners, português, emoji tags e URLs literalmente', () => {
  const emojiFlag =
    '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}';
  const original = `👩‍💻 می‌روم ação ${emojiFlag}\nhttps://example.com/leverage—curly?q=foster#tag me@leverage.com`;
  assert.equal(cleanText(original), original);
  assert.equal(
    cleanText('\u0000URL0\u0000 https://example.com/leverage'),
    '\u0000URL0\u0000 https://example.com/leverage'
  );
});

test('humanização remove artefatos estreitos e usa o léxico existente apenas em palavras inteiras', () => {
  assert.equal(
    cleanText('We\u200b leverage\u00a0robust tools — they work…'),
    'We use solid tools, they work...'
  );
  assert.equal(cleanText('LEVERAGE our work.'), 'LEVERAGE our work.');
  assert.equal(
    cleanText('Um sistema robusto para 25 clientes.'),
    'Um sistema robusto para 25 clientes.'
  );
  assert.equal(
    cleanText('R$ 10\u202f000 em 5–10 dias.'),
    'R$ 10 000 em 5-10 dias.'
  );
});

test('o léxico não traduz homógrafos portugueses nem renomeia pessoas e empresas', () => {
  assert.equal(
    cleanText('Esse ajuste é vital para nós.'),
    'Esse ajuste é vital para nós.'
  );
  assert.equal(
    cleanText('Dr. Foster atende 25 clientes.'),
    'Dr. Foster atende 25 clientes.'
  );
  assert.equal(cleanText('Nome: Foster'), 'Nome: Foster');
  assert.equal(
    cleanText('Our team and Foster serve 25 clients.'),
    'Our team and Foster serve 25 clients.'
  );
  assert.equal(
    cleanText('We use our software, esse ajuste é vital.'),
    'We use our software, esse ajuste é vital.'
  );
  assert.equal(
    cleanText('We leverage our work.\nEsse ajuste é vital para nós.'),
    'We use our work.\nEsse ajuste é vital para nós.'
  );
});

test('revisão humana informa o limite do léxico e não oferece prova de detector', () => {
  const report = analyzeText('ig-human', 'We leverage our work.');
  assert.equal(report.cleanedText, 'We use our work.');
  assert.equal(report.hookScore, undefined);
  assert.match(
    check(report, 'Revisão de linguagem').detail,
    /não é um detector de autoria/u
  );
  assert.match(
    check(report, 'Revisão de linguagem').detail,
    /textos em português/u
  );
});

test('TSV preserva células com tab, aspas escapadas e quebras de linha', () => {
  const source =
    '\ufeffaccount\tviews\tmedian\thook\r\n@a\t1200\t100\t"Meu \"\"erro\"\"\tde 2 horas\ncontinua"\r\n';
  const [row] = parseReferenceRows(source);
  assert.deepEqual(row, {
    account: '@a',
    views: 1200,
    median: 100,
    multiple: 12,
    hook: 'Meu "erro"\tde 2 horas\ncontinua',
  });
});

test('CSV suporta ganchos com vírgulas e separador português', () => {
  assert.equal(
    parseReferenceRows(
      'account,views,median,hook\n@a,"12,500",100,"Gancho, com vírgula"'
    )[0].views,
    12500
  );
  const [portuguese] = parseReferenceRows(
    'PERFIL;VISUALIZAÇÕES;MEDIANA;GANCHO\n@b;1,2M;12.500;"Eu perdi 2 horas; veja por quê"'
  );
  assert.deepEqual(portuguese, {
    account: '@b',
    views: 1200000,
    median: 12500,
    multiple: 96,
    hook: 'Eu perdi 2 horas; veja por quê',
  });
});

test('contagens abreviadas não perdem grandezas ou precisão decimal', () => {
  for (const [input, expected] of [
    ['1.2K', 1200],
    ['1,2K', 1200],
    ['1.001K', 1001],
    ['3M', 3000000],
    ['1.234,5K', 1234500],
    ['12.500', 12500],
    ['12,500', 12500],
    ['0', 0],
  ] as const) {
    assert.equal(
      parseReferenceRows(
        `account;views;median;hook\n@a;${input};100;Gancho real`
      )[0].views,
      expected,
      input
    );
  }
});

test('referências ordenam múltiplos reais antes de bases ausentes, mantendo empates', () => {
  const rows = parseReferenceRows(
    'account\tviews\tmedian\tfollowers\thook\n@unknown\t9999999\t\t1\tSem base\n@a\t100\t10\t1\tPrimeiro empate\n@b\t200\t20\t1\tSegundo empate\n@zero\t0\t100\t1\tZero visualizações'
  );
  assert.deepEqual(
    rows.map(row => row.account),
    ['@a', '@b', '@zero', '@unknown']
  );
  assert.equal(rows[2].multiple, 0);
  assert.equal(rows[3].median, null);
  assert.equal(rows[3].multiple, null);
  assert.equal(
    parseReferenceRows('account,views,hook\n@a,500,Sem mediana')[0].multiple,
    null
  );
  const report = analyzeText(
    'ig-viral',
    'account,views,hook\n@a,500,Sem mediana'
  );
  assert.equal(check(report, 'Base de comparação').severity, 'warn');
  assert.equal(report.rankings?.[0].multiple, null);
});

test('medianas zero, negativas ou inválidas ficam ausentes e nunca viram seguidores', () => {
  for (const median of ['', '0', '-5', 'NaN', 'Infinity', 'erro']) {
    const [row] = parseReferenceRows(
      `account;views;median;followers;hook\n@a;500;${median};10;Gancho real`
    );
    assert.equal(row.median, null, median);
    assert.equal(row.multiple, null, median);
  }
});

test('dados de visualizações inválidos e tabelas malformadas falham sem inventar linhas', () => {
  for (const views of [
    '',
    '-1',
    'NaN',
    'Infinity',
    '1e9',
    '9007199254740993',
    '1,2',
    'falso',
  ]) {
    assert.throws(
      () => parseReferenceRows(`account;views;hook\n@a;${views};Gancho`),
      /número válido de visualizações/u,
      views
    );
  }
  assert.throws(() => parseReferenceRows(''), /Adicione as referências/u);
  assert.throws(() => parseReferenceRows('Texto sem tabela'), /CSV ou TSV/u);
  assert.throws(() => parseReferenceRows('views,hook\n100,Gancho'), /account/u);
  assert.throws(
    () => parseReferenceRows('account,views,hook\n@a,100,"Sem fechamento'),
    /aspas sem fechamento/u
  );
  assert.throws(
    () => parseReferenceRows('account,views,hook\n@a,100,Gancho,sem aspas'),
    /quantidade de células/u
  );
  assert.throws(
    () =>
      parseReferenceRows('account,views,visualizações,hook\n@a,100,200,Gancho'),
    /mais de uma vez/u
  );
  assert.throws(
    () =>
      parseReferenceRows(
        `account,views,hook\n${'@a,100,Gancho\n'.repeat(501)}`
      ),
    /500 referências/u
  );
});

test('verificações de perfil e carrossel usam campos identificados, sem confundir texto total', () => {
  assert.equal(
    check(
      analyzeText(
        'ig-profile',
        `Nome: Meu negócio\nBio: ${'a'.repeat(151)}\nDestaques: ${'b'.repeat(300)}`
      ),
      'Bio do perfil'
    ).severity,
    'fail'
  );
  assert.equal(
    check(
      analyzeText(
        'ig-profile',
        `Bio: Uma bio curta.\nContexto: ${'b'.repeat(3000)}`
      ),
      'Bio do perfil'
    ).severity,
    'pass'
  );
  assert.equal(
    check(
      analyzeText(
        'ig-profile',
        `Bio: ${'a'.repeat(100)}\n${'b'.repeat(100)}\nDestaques: Preços`
      ),
      'Bio do perfil'
    ).severity,
    'fail'
  );
  assert.equal(
    check(analyzeText('ig-profile', 'Bio:\nDestaques: Preços'), 'Bio do perfil')
      .severity,
    'fail'
  );
  const carousel = analyzeText(
    'ig-carousel',
    Array.from(
      { length: 21 },
      (_, index) => `Slide ${index + 1}: uma ideia`
    ).join('\n')
  );
  assert.equal(check(carousel, 'Slides identificados').severity, 'fail');
});

test('perfil e gancho das referências respeitam os limites de armazenamento', () => {
  assert.equal(
    parseReferenceRows(
      `account;views;hook\n${'a'.repeat(100)};100;${'😀'.repeat(2000)}`
    ).length,
    1
  );
  assert.throws(
    () =>
      parseReferenceRows(`account;views;hook\n${'a'.repeat(101)};100;Gancho`),
    /perfil pode ter no máximo 100 caracteres/u
  );
  assert.throws(
    () =>
      parseReferenceRows(
        `account;views;hook\n@perfil;100;${'😀'.repeat(2001)}`
      ),
    /gancho pode ter no máximo 2\.000 caracteres/u
  );
});
