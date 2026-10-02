// @ts-nocheck -- upstream tests, vendored verbatim.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  sanitizeGeneration,
  UnsupportedClaimError,
} from '@/lib/core/grounding';
import type { Generation } from '@/lib/core/types';

const output = (content: string): Omit<Generation, 'checks'> => ({
  title: 'Um modelo para propostas',
  content,
  notes: [],
  slides: [],
  schedule: [],
});

test('90% novo e quantidades de resultado sem fonte são rejeitados claramente', () => {
  assert.throws(
    () =>
      sanitizeGeneration(
        'ig-reel',
        output('Meu modelo resolve 90% dos casos.'),
        'Reduzimos de 5 horas para 20 minutos.',
      ),
    (error: unknown) =>
      error instanceof UnsupportedClaimError && /90%/u.test(error.message),
  );
  assert.throws(
    () =>
      sanitizeGeneration(
        'ig-caption',
        output('Atendemos 20 clientes.'),
        'O trabalho leva 20 minutos.',
      ),
    UnsupportedClaimError,
  );
});

test('5h e 20min passam com números escritos, conversão de unidades e valores conhecidos', () => {
  const source =
    'As propostas levavam 5h e agora levam 20min. O serviço custa R$ 1.000. A redução informada foi 5%.';
  const generated = output(
    'Antes eram cinco horas, ou 300 minutos. Agora são vinte minutos. O serviço custa mil reais. A redução foi cinco por cento.',
  );
  assert.equal(
    sanitizeGeneration('ig-reel', generated, source).content,
    generated.content,
  );
});

test('enumerações, datas, slides e orientações de gravação não viram falsas métricas', () => {
  const generated = output(
    '1. Separe os blocos.\n2. Revise o texto.\nReserve 10 minutos para revisar.\nPlano de 7 dias.\nEm 2026-10-15, grave seu Reel.\nGancho: 3 segundos.',
  );
  generated.slides = [{ title: '90% inventado', body: 'Mais 25 clientes.' }];
  generated.schedule = [
    {
      date: '2026-10-15',
      day: 'quinta',
      title: '50 vendas',
      format: 'Reel',
      idea: '20 mil seguidores',
    },
  ];
  const sanitized = sanitizeGeneration(
    'ig-reel',
    generated,
    'Organize seu modelo.',
  );
  assert.deepEqual(sanitized.slides, []);
  assert.deepEqual(sanitized.schedule, []);
  assert.equal(sanitized.content, generated.content);
  assert.equal(
    generated.slides.length,
    1,
    'A sanitização não deve modificar a resposta original.',
  );
});

test('provas de detector, scores e tempos fabricados saem das notas, mantendo dicas úteis', () => {
  const generated = output(
    'As propostas caíram de cinco horas para vinte minutos.',
  );
  generated.notes = [
    'REEL READY: hook scored 88 STRONG; human score 84 PASS.',
    'length: 27.2s across 8 beats.',
    'Duração: 27,2 segundos.',
    'Pontuação do gancho: 88.',
    'O tempo de 27.2s é uma estimativa baseada em 165 palavras/min.',
    'Leia em voz alta e mantenha o seu ritmo.',
    'Texto na tela: 5 horas → 20 minutos.',
  ];
  const result = sanitizeGeneration(
    'ig-reel',
    generated,
    'Antes 5h, depois 20min.',
  );
  assert.deepEqual(result.notes, [
    'Leia em voz alta e mantenha o seu ritmo.',
    'Texto na tela: 5 horas → 20 minutos.',
  ]);
});

test('unidades, moedas e períodos não emprestam números de outros fatos', () => {
  const source =
    'Atendemos 25 clientes, temos 1,2K seguidores, 10.000 visualizações e 50 vendas. O faturamento é R$ 1.000 por mês.';
  assert.doesNotThrow(() =>
    sanitizeGeneration(
      'ig-caption',
      output(
        'São vinte e cinco clientes, 1200 followers, dez mil views e cinquenta vendas. Faturamos 1000 reais por mês.',
      ),
      source,
    ),
  );
  assert.throws(
    () =>
      sanitizeGeneration(
        'ig-caption',
        output('Faturamos US$ 1.000 por mês.'),
        source,
      ),
    UnsupportedClaimError,
  );
  assert.throws(
    () =>
      sanitizeGeneration(
        'ig-caption',
        output('Faturamos R$ 1.000 por dia.'),
        source,
      ),
    UnsupportedClaimError,
  );
  assert.throws(
    () =>
      sanitizeGeneration('ig-caption', output('Temos 25 seguidores.'), source),
    UnsupportedClaimError,
  );
  assert.doesNotThrow(() =>
    sanitizeGeneration(
      'ig-caption',
      output('We serve 25 clients.'),
      'Clients: 25.',
    ),
  );
});

test('números explicitamente proibidos na fonte não autorizam afirmações', () => {
  assert.throws(
    () =>
      sanitizeGeneration(
        'ig-reel',
        output('Meu modelo atende 90% dos casos.'),
        'Não cite 90% dos casos. Use apenas o resultado de 5h para 20min.',
      ),
    UnsupportedClaimError,
  );
  assert.throws(
    () =>
      sanitizeGeneration(
        'ig-reel',
        output('Meu modelo atende 90% dos casos.'),
        'https://example.com/2026-10-15 Não cite 90% dos casos.',
      ),
    UnsupportedClaimError,
  );
});
