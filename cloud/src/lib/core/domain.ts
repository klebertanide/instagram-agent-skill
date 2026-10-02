// @ts-nocheck -- vendored verbatim (upstream compiles without noUncheckedIndexedAccess); covered by src/test/core.
// Adapted from klebertanide/instagram-agent-skill web/ @6c91976 (MIT, Jake Schincariol).
import { getSkill } from './catalog';
import {
  EMPTY_PROFILE,
  type DraftPatch,
  type DraftRecord,
  type DraftStatus,
  type GenerateOptions,
  type Generation,
  type ScheduleItem,
  type Slide,
  type VoiceProfile,
  type WorkspaceCredentials,
} from './types';

export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new AppError('Envie um objeto válido.', 400);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new AppError('Envie um objeto válido.', 400);
  }
  return value as Record<string, unknown>;
}

export function stringValue(
  value: unknown,
  label: string,
  max: number,
  required = false
): string {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') {
    throw new AppError(`O campo ${label} deve ser texto.`, 400);
  }
  if (required && value.trim() === '') {
    throw new AppError(`Preencha o campo ${label}.`, 400);
  }
  // Count code points, so an emoji does not consume two characters. Preserve
  // the original text: normalizing, trimming or truncating can change facts.
  if ([...value].length > max) {
    throw new AppError(`O campo ${label} aceita até ${max} caracteres.`, 400);
  }
  return value;
}

export function assertPayloadSize(value: unknown, maxBytes = 160000): void {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new AppError('O conteúdo deve ser um JSON válido.', 400);
  }
  if (serialized === undefined) {
    throw new AppError('O conteúdo deve ser um JSON válido.', 400);
  }
  if (new TextEncoder().encode(serialized).byteLength > maxBytes) {
    throw new AppError(
      'O conteúdo está muito grande. Reduza o texto e tente novamente.',
      400
    );
  }
}

export function parseCredentials(value: unknown): WorkspaceCredentials {
  const invalid = () =>
    new AppError('Acesso ao espaço inválido. Abra seu espaço novamente.', 401);
  let object: Record<string, unknown>;
  try {
    object = requireObject(value);
  } catch {
    throw invalid();
  }
  const { workspaceId, accessKey } = object;
  if (
    typeof workspaceId !== 'string' ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(workspaceId) ||
    typeof accessKey !== 'string' ||
    !/^[a-f0-9]{64}$/.test(accessKey)
  ) {
    throw invalid();
  }
  return { workspaceId, accessKey };
}

function boundedNumber(
  value: unknown,
  label: string,
  fallback: number,
  min: number,
  max: number
): number {
  if (value === undefined) return fallback;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new AppError(
      `O campo ${label} deve ser um número entre ${min} e ${max}.`,
      400
    );
  }
  return value;
}

export function parseOptions(value: unknown): GenerateOptions {
  const object = value === undefined ? {} : requireObject(value);
  return {
    duration: boundedNumber(object.duration, 'duração', 30, 5, 180),
    wpm: boundedNumber(object.wpm, 'ritmo', 165, 80, 260),
    intent: stringValue(object.intent, 'objetivo', 200),
    keywords: stringValue(object.keywords, 'palavras-chave', 300),
  };
}

export function parseProfile(value: unknown): VoiceProfile {
  const object = value === undefined ? {} : requireObject(value);
  const profile = {} as VoiceProfile;
  for (const key of Object.keys(EMPTY_PROFILE) as (keyof VoiceProfile)[]) {
    profile[key] =
      object[key] === undefined
        ? EMPTY_PROFILE[key]
        : stringValue(
            object[key],
            key,
            key === 'examples' || key === 'proof' ? 4000 : 2000
          );
  }
  if (profile.language.trim() === '') profile.language = EMPTY_PROFILE.language;
  assertPayloadSize(profile, 16000);
  return profile;
}

export function validateDate(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('Use uma data válida no formato AAAA-MM-DD.', 400);
  }
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    throw new AppError('Use uma data que exista no calendário.', 400);
  }
  return value;
}

function optionalArray(value: unknown, label: string, max: number): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new AppError(`O campo ${label} deve ser uma lista.`, 400);
  }
  if (value.length > max) {
    throw new AppError(`O campo ${label} aceita até ${max} itens.`, 400);
  }
  return Array.from(value);
}

export function parseGenerated(value: unknown): Omit<Generation, 'checks'> {
  const object = requireObject(value);
  assertPayloadSize(object);
  const notes = optionalArray(object.notes, 'observações', 20).map(note => {
    if (typeof note !== 'string')
      throw new AppError('Cada observação deve ser texto.', 400);
    return stringValue(note, 'observação', 1000);
  });
  const slides: Slide[] = optionalArray(object.slides, 'slides', 20).map(
    value => {
      const slide = requireObject(value);
      return {
        title: stringValue(slide.title, 'título do slide', 160),
        body: stringValue(slide.body, 'texto do slide', 1000),
      };
    }
  );
  const schedule: ScheduleItem[] = optionalArray(
    object.schedule,
    'plano',
    14
  ).map(value => {
    const item = requireObject(value);
    const date = stringValue(item.date, 'data do plano', 10);
    return {
      date: validateDate(date) ?? '',
      day: stringValue(item.day, 'dia do plano', 40),
      title: stringValue(item.title, 'título do plano', 200),
      format: stringValue(item.format, 'formato do plano', 100),
      idea: stringValue(item.idea, 'ideia do plano', 2000),
    };
  });
  const generated = {
    title: stringValue(object.title, 'título', 200),
    content: stringValue(object.content, 'conteúdo', 50000, true),
    notes,
    slides,
    schedule,
  };
  assertPayloadSize(generated);
  return generated;
}

function parseStatus(value: unknown): DraftStatus {
  if (value !== 'draft' && value !== 'ready' && value !== 'scheduled') {
    throw new AppError('Escolha um estado válido para o rascunho.', 400);
  }
  return value;
}

export type DraftInput = Omit<Generation, 'checks'> &
  Pick<DraftRecord, 'skillId' | 'status' | 'scheduledFor'>;

export function parseDraftInput(value: unknown): DraftInput {
  const object = requireObject(value);
  const skillId = stringValue(object.skillId, 'ferramenta', 100, true);
  const skill = getSkill(skillId);
  if (!skill) throw new AppError('Escolha uma ferramenta válida.', 400);
  const status =
    object.status === undefined ? 'draft' : parseStatus(object.status);
  const scheduledFor =
    object.scheduledFor === undefined
      ? null
      : validateDate(object.scheduledFor);
  if (status === 'scheduled' && scheduledFor === null) {
    throw new AppError('Escolha uma data para agendar o rascunho.', 400);
  }
  const draft: DraftInput = {
    ...parseGenerated(object),
    skillId: skill.id,
    status,
    scheduledFor,
  };
  assertPayloadSize(draft);
  return draft;
}

export function parseDraftPatch(value: unknown): DraftPatch {
  const object = requireObject(value);
  assertPayloadSize(object);
  const patch: DraftPatch = {};
  const has = (key: string) =>
    Object.prototype.hasOwnProperty.call(object, key);
  if (has('title')) {
    if (object.title === undefined)
      throw new AppError('O campo título deve ser texto.', 400);
    patch.title = stringValue(object.title, 'título', 200);
  }
  if (has('content'))
    patch.content = stringValue(object.content, 'conteúdo', 50000, true);
  if (has('status')) patch.status = parseStatus(object.status);
  if (has('scheduledFor'))
    patch.scheduledFor = validateDate(object.scheduledFor);
  if (Object.keys(patch).length === 0) {
    throw new AppError(
      'Escolha pelo menos um campo do rascunho para alterar.',
      400
    );
  }
  assertPayloadSize(patch);
  return patch;
}
