// @ts-nocheck -- upstream tests, vendored verbatim.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  AppError,
  assertPayloadSize,
  parseCredentials,
  parseDraftInput,
  parseDraftPatch,
  parseGenerated,
  parseOptions,
  parseProfile,
  requireObject,
  stringValue,
  validateDate,
} from '@/lib/core/domain';
import { EMPTY_PROFILE } from '@/lib/core/types';

function rejects400(callback: () => unknown): void {
  assert.throws(
    callback,
    (error: unknown) => error instanceof AppError && error.status === 400
  );
}

test('objects require plain records; arrays, primitives and instances are rejected', () => {
  for (const value of [undefined, null, [], 'text', 42, true, new Date()]) {
    rejects400(() => requireObject(value));
  }
  const object = { content: 'real text' };
  assert.equal(requireObject(object), object);
  assert.equal(requireObject(Object.create(null)).content, undefined);
});

test('strings preserve facts and Unicode; limits count code points without truncation', () => {
  const fact = '  €12.450,00 — receita de 2025\nNÃO promessa.  ';
  assert.equal(stringValue(fact, 'conteúdo', 100, true), fact);
  assert.equal(stringValue('🧑🏽‍💻'.repeat(50), 'título', 200), '🧑🏽‍💻'.repeat(50));
  assert.equal(stringValue('😀'.repeat(200), 'título', 200), '😀'.repeat(200));
  rejects400(() => stringValue('😀'.repeat(201), 'título', 200));
  rejects400(() => stringValue(' \n\t ', 'conteúdo', 100, true));
  assert.equal(stringValue(undefined, 'opcional', 100), '');
  for (const value of [null, 123, true, ['text'], { toString: () => 'text' }]) {
    rejects400(() => stringValue(value, 'conteúdo', 100));
  }
});

test('credentials are strict, bounded and never echoed in authentication errors', () => {
  const valid = {
    workspaceId: 'workspace_123',
    accessKey: 'abcdef01'.repeat(8),
  };
  assert.deepEqual(parseCredentials({ ...valid, admin: true }), valid);
  for (const value of [
    undefined,
    null,
    [],
    'bad',
    {},
    { ...valid, workspaceId: 'tiny' },
    { ...valid, workspaceId: 'a'.repeat(101) },
    { ...valid, workspaceId: 'with space' },
    { ...valid, accessKey: valid.accessKey.toUpperCase() },
    { ...valid, accessKey: 'f'.repeat(63) },
    { ...valid, accessKey: 123 },
    { ...valid, workspaceId: 12345678 },
  ]) {
    assert.throws(
      () => parseCredentials(value),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.status, 401);
        assert.ok(!error.message.includes(valid.accessKey));
        return true;
      }
    );
  }
});

test('generation options use defaults and reject coercion, nonfinite values and invalid bounds', () => {
  assert.deepEqual(parseOptions(undefined), {
    duration: 30,
    wpm: 165,
    intent: '',
    keywords: '',
  });
  assert.deepEqual(
    parseOptions({
      duration: 5,
      wpm: 260,
      intent: 'Salvar',
      keywords: 'modelo',
    }),
    { duration: 5, wpm: 260, intent: 'Salvar', keywords: 'modelo' }
  );
  for (const duration of ['30', null, NaN, Infinity, -Infinity, 4.99, 180.01]) {
    rejects400(() => parseOptions({ duration }));
  }
  for (const wpm of ['165', null, NaN, Infinity, 79, 261])
    rejects400(() => parseOptions({ wpm }));
  for (const value of [null, [], 'options'])
    rejects400(() => parseOptions(value));
  rejects400(() => parseOptions({ intent: 'a'.repeat(201) }));
  rejects400(() => parseOptions({ keywords: 'a'.repeat(301) }));
});

test('profiles allow only known fields and retain user language, examples and exact proof', () => {
  assert.deepEqual(parseProfile(undefined), EMPTY_PROFILE);
  const profile = parseProfile({
    language: 'en-GB',
    brandName: 'Ana',
    proof: 'Paid £1,250; returned £300. No profit claim.',
    examples: '“Our trial lasted 17 days.”\nSource: my notes.',
    workspaceId: 'other',
    accessKey: 'secret',
    admin: true,
    aiInstructions: 'Invent proof',
  });
  assert.equal(profile.language, 'en-GB');
  assert.equal(profile.proof, 'Paid £1,250; returned £300. No profit claim.');
  assert.equal(
    profile.examples,
    '“Our trial lasted 17 days.”\nSource: my notes.'
  );
  assert.deepEqual(
    Object.keys(profile).sort(),
    Object.keys(EMPTY_PROFILE).sort()
  );
  assert.equal(parseProfile({ language: '' }).language, 'pt-BR');
  assert.equal(parseProfile({}).tone, EMPTY_PROFILE.tone);
});

test('profile field limits allow 4000-character proof/examples and 2000-character other fields', () => {
  assert.equal(
    parseProfile({ proof: 'p'.repeat(4000), examples: 'e'.repeat(4000) }).proof
      .length,
    4000
  );
  rejects400(() => parseProfile({ proof: 'p'.repeat(4001) }));
  rejects400(() => parseProfile({ examples: 'e'.repeat(4001) }));
  rejects400(() => parseProfile({ niche: 'n'.repeat(2001) }));
  rejects400(() => parseProfile({ proof: 4000 }));
  rejects400(() => parseProfile(null));
  rejects400(() => parseProfile({ proof: '😀'.repeat(4000) }));
});

test('serialized profile limit is aggregate UTF8 bytes including JSON escaping', () => {
  const boundary = parseProfile({
    proof: 'x'.repeat(4000),
    examples: 'y'.repeat(4000),
    brandName: 'b'.repeat(2000),
    niche: 'n'.repeat(2000),
    audience: 'a'.repeat(2000),
  });
  assert.ok(
    new TextEncoder().encode(JSON.stringify(boundary)).byteLength < 16000
  );
  rejects400(() => parseProfile({ ...boundary, handle: 'h'.repeat(2000) }));
  rejects400(() =>
    parseProfile({ proof: '\n'.repeat(4000), examples: '\n'.repeat(4000) })
  );
  rejects400(() =>
    parseProfile({ proof: 'é'.repeat(4000), examples: 'é'.repeat(4000) })
  );
});

test('dates are strict real calendar dates independent of timezone', () => {
  for (const date of [
    '2026-10-02',
    '2028-02-29',
    '2000-02-29',
    '2026-12-31',
    '0001-01-01',
  ]) {
    assert.equal(validateDate(date), date);
  }
  assert.equal(validateDate(null), null);
  assert.equal(validateDate(''), null);
  for (const date of [
    '2026-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-10-00',
    '0000-01-01',
    '2026-1-01',
    '2026-10-2',
    '2026-10-02T00:00:00Z',
    ' 2026-10-02',
    '2026-10-02 ',
    '02/10/2026',
    undefined,
    20261002,
    new Date(),
  ]) {
    rejects400(() => validateDate(date));
  }
});

test('generation parsing drops untrusted fields and supplies only optional array defaults', () => {
  assert.deepEqual(
    parseGenerated({
      title: 'Roteiro',
      content: 'Custa R$ 83,50.',
      checks: { pass: true },
      accessKey: 'secret',
      status: 'published',
    }),
    {
      title: 'Roteiro',
      content: 'Custa R$ 83,50.',
      notes: [],
      slides: [],
      schedule: [],
    }
  );
  for (const value of [
    null,
    [],
    'JSON text',
    {},
    { content: 123 },
    { content: '   ' },
  ]) {
    rejects400(() => parseGenerated(value));
  }
  rejects400(() => parseGenerated({ content: 'ok', notes: null }));
  rejects400(() => parseGenerated({ content: 'ok', notes: [42] }));
  rejects400(() => parseGenerated({ content: 'ok', notes: Array(1) }));
  rejects400(() => parseGenerated({ content: 'ok', slides: ['text'] }));
  rejects400(() => parseGenerated({ content: 'ok', schedule: [null] }));
});

test('generation arrays and individual strings reject oversized content without truncating', () => {
  const base = { content: 'Ready.' };
  rejects400(() => parseGenerated({ ...base, title: 't'.repeat(201) }));
  rejects400(() => parseGenerated({ content: 'a'.repeat(50001) }));
  rejects400(() => parseGenerated({ ...base, notes: Array(21).fill('note') }));
  rejects400(() => parseGenerated({ ...base, notes: ['n'.repeat(1001)] }));
  rejects400(() =>
    parseGenerated({
      ...base,
      slides: Array(21).fill({ title: 'a', body: 'b' }),
    })
  );
  rejects400(() =>
    parseGenerated({
      ...base,
      slides: [{ title: 't'.repeat(161), body: 'b' }],
    })
  );
  rejects400(() =>
    parseGenerated({
      ...base,
      slides: [{ title: 'a', body: 'b'.repeat(1001) }],
    })
  );
  rejects400(() => parseGenerated({ ...base, schedule: Array(15).fill({}) }));
  rejects400(() =>
    parseGenerated({ ...base, schedule: [{ date: '2026-02-29' }] })
  );
  const parsed = parseGenerated({
    ...base,
    slides: [{ title: 'Capa', body: 'Fato real.', admin: true }],
    schedule: [
      {
        date: '2028-02-29',
        day: 'Terça',
        title: 'Processo',
        format: 'Reel',
        idea: 'Minha experiência.',
        publish: true,
      },
    ],
  });
  assert.deepEqual(parsed.slides, [{ title: 'Capa', body: 'Fato real.' }]);
  assert.deepEqual(parsed.schedule, [
    {
      date: '2028-02-29',
      day: 'Terça',
      title: 'Processo',
      format: 'Reel',
      idea: 'Minha experiência.',
    },
  ]);
});

test('payload cap measures UTF8 serialized bytes and includes escaped content', () => {
  assertPayloadSize({ a: '😀'.repeat(39995) });
  rejects400(() => assertPayloadSize({ a: '😀'.repeat(40000) }));
  rejects400(() => parseGenerated({ content: '😀'.repeat(40000) }));
  rejects400(() =>
    parseGenerated({
      content: 'real',
      notes: Array(20).fill('\u0000'.repeat(1000)),
      slides: Array(20).fill({ title: 'slide', body: '\u0000'.repeat(1000) }),
    })
  );
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  rejects400(() => assertPayloadSize(cycle));
});

test('draft scheduling requires an explicit date and never adopts AI suggested dates', () => {
  const draft = parseDraftInput({
    skillId: 'ig-reel',
    content: 'My real story.',
    schedule: [{ date: '2028-02-29', idea: 'Suggestion' }],
    checks: {},
    workspaceId: 'other',
    id: 'injected',
  });
  assert.equal(draft.status, 'draft');
  assert.equal(draft.scheduledFor, null);
  assert.ok(!('id' in draft));
  assert.ok(!('checks' in draft));
  const scheduled = parseDraftInput({
    skillId: 'ig-reel',
    content: 'My real story.',
    status: 'scheduled',
    scheduledFor: '2026-10-02',
  });
  assert.equal(scheduled.status, 'scheduled');
  assert.equal(scheduled.scheduledFor, '2026-10-02');
  for (const skillId of ['unknown', '/ig-reel', '../ig-reel', undefined, 42]) {
    rejects400(() => parseDraftInput({ skillId, content: 'Real.' }));
  }
  rejects400(() =>
    parseDraftInput({
      skillId: 'ig-reel',
      content: 'Real.',
      status: 'published',
    })
  );
  rejects400(() =>
    parseDraftInput({
      skillId: 'ig-reel',
      content: 'Real.',
      status: 'scheduled',
    })
  );
  rejects400(() =>
    parseDraftInput({
      skillId: 'ig-reel',
      content: 'Real.',
      status: 'scheduled',
      scheduledFor: '',
    })
  );
});

test('draft patches allow only edit fields and never change identity, checks or scheduling implicitly', () => {
  assert.deepEqual(
    parseDraftPatch({
      title: 'Updated',
      id: 'evil',
      workspaceId: 'other',
      accessKey: 'secret',
      createdAt: 'bad',
      slides: [],
      checks: {},
      skillId: 'ig-audit',
    }),
    { title: 'Updated' }
  );
  assert.deepEqual(parseDraftPatch({ scheduledFor: '2026-10-02' }), {
    scheduledFor: '2026-10-02',
  });
  assert.deepEqual(parseDraftPatch({ scheduledFor: '' }), {
    scheduledFor: null,
  });
  assert.deepEqual(parseDraftPatch({ scheduledFor: null }), {
    scheduledFor: null,
  });
  // Scheduling validity is checked after the server merges this with its saved
  // record. A patch can retain an existing user-selected calendar date.
  assert.deepEqual(parseDraftPatch({ status: 'scheduled' }), {
    status: 'scheduled',
  });
  for (const patch of [
    {},
    { id: 'evil' },
    { title: null },
    { title: undefined },
    { content: '' },
    { content: 123 },
    { status: 'published' },
    { status: undefined },
    { scheduledFor: undefined },
    { scheduledFor: '2026-04-31' },
  ]) {
    rejects400(() => parseDraftPatch(patch));
  }
  rejects400(() => parseDraftPatch({ title: 't'.repeat(201) }));
  rejects400(() => parseDraftPatch({ content: 'c'.repeat(50001) }));
  rejects400(() => parseDraftPatch({ content: '😀'.repeat(40000) }));
});
