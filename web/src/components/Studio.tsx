import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlignLeft,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  Clapperboard,
  Cloud,
  Copy,
  FileText,
  FolderOpen,
  Instagram,
  Layers,
  LoaderCircle,
  Menu,
  MessageSquare,
  MessagesSquare,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  UserRound,
  WandSparkles,
  X,
  ChartNoAxesCombined,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SKILLS, getSkill } from '../../shared/catalog';
import type {
  AnalysisReport,
  DraftPatch,
  DraftRecord,
  DraftStatus,
  Generation,
  GenerateOptions,
  SkillId,
  Slide,
  VoiceProfile,
  WorkspaceCredentials,
} from '../../shared/types';
import { EMPTY_PROFILE } from '../../shared/types';
import {
  bootstrapWorkspace,
  createWorkspace,
  openWorkspace,
  readCredentials,
  rememberCredentials,
  studioApi,
} from '../lib/client';

type View = 'create' | 'calendar' | 'library' | 'voice' | 'space';
type Notice = { kind: 'error' | 'success'; text: string } | null;

const NAVIGATION: { view: View; label: string; icon: LucideIcon }[] = [
  { view: 'create', label: 'Criar', icon: Sparkles },
  { view: 'calendar', label: 'Calendário', icon: CalendarDays },
  { view: 'library', label: 'Biblioteca', icon: FolderOpen },
  { view: 'voice', label: 'Minha voz', icon: UserRound },
  { view: 'space', label: 'Seu espaço', icon: ShieldCheck },
];
const ICONS: Record<string, LucideIcon> = {
  Clapperboard,
  AlignLeft,
  Layers,
  CirclePlay,
  CalendarDays,
  WandSparkles,
  MessageSquare,
  MessagesSquare,
  Send,
  Repeat2,
  UserRound,
  ChartNoAxesCombined,
  TrendingUp,
};
const STATUS_LABELS: Record<DraftStatus, string> = {
  draft: 'Rascunho',
  ready: 'Pronto',
  scheduled: 'Planejado',
};
const DEFAULT_OPTIONS: GenerateOptions = {
  duration: 30,
  wpm: 165,
  intent: 'Ensinar algo útil',
  keywords: '',
};
const TIME_ZONE = 'America/Sao_Paulo';

function todayKey(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function dateKey(value: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const valueOf = (type: string) =>
    parts.find(part => part.type === type)?.value ?? '';
  return `${valueOf('year')}-${valueOf('month')}-${valueOf('day')}`;
}

function utcDate(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

function moveDay(key: string, count: number): string {
  const date = utcDate(key);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function formatDate(key: string, long = false): string {
  if (!key) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: long ? 'long' : 'short',
    ...(long ? { year: 'numeric' } : {}),
  }).format(utcDate(key));
}

function fileName(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'instagram-studio'
  );
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* Browsers without clipboard permissions use the selection fallback. */
    }
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.focus();
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied)
    throw new Error(
      'Não foi possível copiar automaticamente. Selecione o texto e copie pelo seu navegador.'
    );
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  width: number
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if (context.measureText(word).width > width) {
        if (line) {
          lines.push(line);
          line = '';
        }
        let fragment = '';
        for (const character of word) {
          if (
            context.measureText(fragment + character).width > width &&
            fragment
          ) {
            lines.push(fragment);
            fragment = '';
          }
          fragment += character;
        }
        line = fragment;
      } else if (context.measureText(`${line} ${word}`).width > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    lines.push(line);
  }
  return lines;
}

async function exportSlide(
  slide: Slide,
  index: number,
  total: number,
  handle: string,
  dark: boolean
): Promise<void> {
  if (document.fonts) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context)
    throw new Error(
      'Este navegador não conseguiu criar a imagem. Tente novamente em outro navegador.'
    );
  context.fillStyle = dark ? '#211b35' : '#f6f2ff';
  context.fillRect(0, 0, 1080, 1350);
  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, dark ? '#403062' : '#ece2ff');
  gradient.addColorStop(1, dark ? '#211b35' : '#fffaf3');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1350);
  context.fillStyle = dark ? '#b7a2ff' : '#7954ee';
  context.fillRect(120, 134, 72, 7);
  context.font = '600 30px Arial, sans-serif';
  context.fillText(
    `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    120,
    212
  );
  let titleSize = 78;
  let bodySize = 38;
  let titleLines: string[] = [];
  let bodyLines: string[] = [];
  let height = 0;
  do {
    context.font = `700 ${titleSize}px Arial, sans-serif`;
    titleLines = wrapText(context, slide.title, 840);
    context.font = `400 ${bodySize}px Arial, sans-serif`;
    bodyLines = wrapText(context, slide.body, 840);
    height =
      titleLines.length * titleSize * 1.12 +
      50 +
      bodyLines.length * bodySize * 1.45;
    if (height <= 770) break;
    titleSize -= 2;
    bodySize -= 1;
  } while (titleSize >= 46 && bodySize >= 30);
  if (height > 770)
    throw new Error(
      `O slide ${index + 1} tem texto demais para ficar legível. Crie uma versão mais curta antes de exportar.`
    );
  let y = 335;
  context.fillStyle = dark ? '#ffffff' : '#292235';
  context.font = `700 ${titleSize}px Arial, sans-serif`;
  for (const line of titleLines) {
    context.fillText(line, 120, y);
    y += titleSize * 1.12;
  }
  y += 50;
  context.fillStyle = dark ? '#e5def7' : '#625a72';
  context.font = `400 ${bodySize}px Arial, sans-serif`;
  for (const line of bodyLines) {
    context.fillText(line, 120, y);
    y += bodySize * 1.45;
  }
  context.strokeStyle = dark ? '#615477' : '#d9d0e8';
  context.beginPath();
  context.moveTo(120, 1168);
  context.lineTo(960, 1168);
  context.stroke();
  context.fillStyle = dark ? '#d1c5ed' : '#6e6283';
  context.font = '400 28px Arial, sans-serif';
  context.fillText(handle || 'Seu conteúdo, sua voz.', 120, 1230);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      value =>
        value
          ? resolve(value)
          : reject(
              new Error('A imagem não pôde ser exportada. Tente novamente.')
            ),
      'image/png'
    );
  });
  downloadBlob(blob, `carrossel-${fileName(slide.title)}-${index + 1}.png`);
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-loading">
      <LoaderCircle size={17} className="spin" />
      {label}
    </span>
  );
}

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="studio-dialog"
      aria-label={title}
      onCancel={onClose}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar janela"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Checks({ report }: { report: AnalysisReport }) {
  return (
    <section className="checks-panel" aria-label="Revisão do conteúdo">
      <div className="section-title">
        <CheckCheck size={18} />
        <h3>Um último olhar</h3>
        <span>Revisão do texto</span>
      </div>
      <div className="check-metrics">
        <span>
          <strong>{report.words}</strong> palavras
        </span>
        <span>
          <strong>{report.characters}</strong> caracteres
        </span>
        {report.durationSeconds > 0 && (
          <span>
            <strong>~{Math.round(report.durationSeconds)}s</strong> de fala
          </span>
        )}
        {report.hashtagCount > 0 && (
          <span>
            <strong>{report.hashtagCount}</strong> hashtags
          </span>
        )}
      </div>
      {report.issues.map((issue, index) => (
        <div
          key={`${issue.label}-${index}`}
          className={`check-row ${issue.severity}`}
        >
          <span className="check-dot">
            {issue.severity === 'pass' ? (
              <Check size={13} />
            ) : (
              <CircleHelp size={13} />
            )}
          </span>
          <div>
            <strong>{issue.label}</strong>
            <p>{issue.detail}</p>
          </div>
        </div>
      ))}
      {!!report.rankings?.length && (
        <div className="rankings">
          <h4>Referências pelos dados fornecidos</h4>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Perfil e gancho</th>
                  <th>Visualizações</th>
                  <th>Mediana</th>
                  <th>Múltiplo</th>
                </tr>
              </thead>
              <tbody>
                {report.rankings.map((row, index) => (
                  <tr key={`${row.account}-${index}`}>
                    <td>
                      <strong>{row.account}</strong>
                      <small>{row.hook}</small>
                    </td>
                    <td>{row.views.toLocaleString('pt-BR')}</td>
                    <td>
                      {row.median?.toLocaleString('pt-BR') ?? 'Não informada'}
                    </td>
                    <td>
                      <strong>
                        {row.multiple === null
                          ? 'Não calculado'
                          : `${row.multiple.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×`}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function CarouselPreview({
  slides,
  handle,
  onError,
}: {
  slides: Slide[];
  handle: string;
  onError: (text: string) => void;
}) {
  const [dark, setDark] = useState(false);
  const [exporting, setExporting] = useState<number | null>(null);
  const [exportError, setExportError] = useState('');
  return (
    <section className="carousel-preview" aria-label="Slides do carrossel">
      <div className="section-title">
        <Layers size={18} />
        <h3>Seu carrossel</h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={dark}
            onChange={event => setDark(event.target.checked)}
          />
          Fundo escuro
        </label>
      </div>
      <p className="muted small">
        Imagens PNG em 1080 × 1350. Baixe cada slide na ordem.
      </p>
      <div className="slides-grid">
        {slides.map((slide, index) => (
          <article className="slide-item" key={`${index}-${slide.title}`}>
            <div className={`slide-image ${dark ? 'dark' : ''}`}>
              <span className="slide-number">
                {String(index + 1).padStart(2, '0')} /{' '}
                {String(slides.length).padStart(2, '0')}
              </span>
              <div>
                <h4>{slide.title}</h4>
                <p>{slide.body}</p>
              </div>
              <span className="slide-handle">
                {handle || 'Seu conteúdo, sua voz.'}
              </span>
            </div>
            <button
              type="button"
              className="button secondary full"
              disabled={exporting !== null}
              onClick={async () => {
                setExporting(index);
                setExportError('');
                try {
                  await exportSlide(slide, index, slides.length, handle, dark);
                } catch (error) {
                  setExportError((error as Error).message);
                  onError((error as Error).message);
                } finally {
                  setExporting(null);
                }
              }}
            >
              {exporting === index ? (
                <Spinner label="Preparando PNG…" />
              ) : (
                <>
                  <ArrowDownToLine size={15} />
                  Baixar slide {index + 1}
                </>
              )}
            </button>
          </article>
        ))}
      </div>
      {exportError && (
        <p className="inline-error" role="alert">
          {exportError}
        </p>
      )}
    </section>
  );
}

function ContentText({ text }: { text: string }) {
  return (
    <div className="content-text">
      {text.split('\n').map((line, index) => {
        if (/^#{1,4}\s/.test(line))
          return <h3 key={index}>{line.replace(/^#{1,4}\s+/, '')}</h3>;
        if (/^[-*]\s/.test(line))
          return (
            <p className="content-bullet" key={index}>
              • {line.replace(/^[-*]\s+/, '')}
            </p>
          );
        return <p key={index}>{line || '\u00a0'}</p>;
      })}
    </div>
  );
}

interface DraftEditorProps {
  draft: DraftRecord;
  pending: boolean;
  onClose: () => void;
  onSave: (id: string, changes: DraftPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCopy: (text: string) => Promise<boolean>;
  onError: (text: string) => void;
  handle: string;
}

function DraftEditor({
  draft,
  pending,
  onClose,
  onSave,
  onDelete,
  onCopy,
  onError,
  handle,
}: DraftEditorProps) {
  const [title, setTitle] = useState(draft.title);
  const [content, setContent] = useState(draft.content);
  const [status, setStatus] = useState(draft.status);
  const [date, setDate] = useState(dateKey(draft.scheduledFor));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [validation, setValidation] = useState('');
  const [copied, setCopied] = useState(false);
  return (
    <Dialog title="Seu rascunho" onClose={onClose}>
      <form
        onSubmit={event => {
          event.preventDefault();
          if (!title.trim() || !content.trim()) {
            setValidation('Preencha o título e o conteúdo para salvar.');
            return;
          }
          if (status === 'scheduled' && !date) {
            setValidation('Escolha uma data para esse conteúdo planejado.');
            return;
          }
          setValidation('');
          void onSave(draft.id, {
            title: title.trim(),
            content,
            status,
            scheduledFor: date || null,
          }).catch((error: Error) => setValidation(error.message));
        }}
      >
        <label className="field">
          <span>Título</span>
          <input
            maxLength={180}
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Conteúdo</span>
          <textarea
            className="draft-content-editor"
            maxLength={24000}
            value={content}
            onChange={event => setContent(event.target.value)}
          />
        </label>
        <div className="form-grid two">
          <label className="field">
            <span>Status</span>
            <select
              value={status}
              onChange={event => setStatus(event.target.value as DraftStatus)}
            >
              <option value="draft">Rascunho</option>
              <option value="ready">Pronto</option>
              <option value="scheduled">Planejado</option>
            </select>
          </label>
          <label className="field">
            <span>Data planejada</span>
            <input
              type="date"
              value={date}
              onChange={event => {
                setDate(event.target.value);
                if (event.target.value) setStatus('scheduled');
              }}
            />
          </label>
        </div>
        <p className="small muted">
          A data organiza seu calendário. A publicação no Instagram fica com
          você.
        </p>
        {!!draft.slides.length && (
          <p className="small muted">
            As imagens abaixo são os slides originais. Editar o texto deste
            rascunho não altera as imagens.
          </p>
        )}
        {validation && (
          <p className="inline-error" role="alert">
            {validation}
          </p>
        )}
        <div className="dialog-actions">
          <button type="submit" className="button primary" disabled={pending}>
            {pending ? (
              <Spinner label="Salvando…" />
            ) : (
              <>
                <Cloud size={16} />
                Salvar alterações
              </>
            )}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              void onCopy(content).then(success => {
                setCopied(success);
                if (!success)
                  setValidation(
                    'Não conseguimos copiar. Selecione o conteúdo e copie pelo seu navegador.'
                  );
              })
            }
          >
            <Copy size={16} />
            Copiar texto
          </button>
          <button
            type="button"
            className="icon-button danger"
            aria-label="Excluir rascunho"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={18} />
          </button>
        </div>
        {copied && (
          <p className="small muted" role="status">
            Texto copiado.
          </p>
        )}
        {confirmDelete && (
          <div className="delete-confirmation" role="alert">
            <strong>Excluir este rascunho?</strong>
            <p>Ele será removido da biblioteca e do calendário.</p>
            <div>
              <button
                type="button"
                className="button danger-filled"
                disabled={pending}
                onClick={() =>
                  void onDelete(draft.id).catch((error: Error) =>
                    setValidation(error.message)
                  )
                }
              >
                Excluir definitivamente
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Manter rascunho
              </button>
            </div>
          </div>
        )}
      </form>
      <Checks report={draft.checks} />
      {!!draft.slides.length && (
        <CarouselPreview
          slides={draft.slides}
          handle={handle}
          onError={onError}
        />
      )}
    </Dialog>
  );
}

function Calendar({
  drafts,
  onOpen,
  onCreate,
}: {
  drafts: DraftRecord[];
  onOpen: (draft: DraftRecord) => void;
  onCreate: () => void;
}) {
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(todayKey());
  const date = utcDate(anchor);
  const monthFirst = `${anchor.slice(0, 7)}-01`;
  const offset = (utcDate(monthFirst).getUTCDay() + 6) % 7;
  const start =
    mode === 'week'
      ? moveDay(anchor, -((date.getUTCDay() + 6) % 7))
      : moveDay(monthFirst, -offset);
  const days = Array.from({ length: mode === 'week' ? 7 : 42 }, (_, index) =>
    moveDay(start, index)
  );
  const navigate = (direction: number) => {
    if (mode === 'week') setAnchor(moveDay(anchor, direction * 7));
    else {
      const next = utcDate(monthFirst);
      next.setUTCMonth(next.getUTCMonth() + direction);
      setAnchor(next.toISOString().slice(0, 10));
    }
  };
  return (
    <section className="panel calendar-panel">
      <div className="calendar-toolbar">
        <div>
          <h2>
            {new Intl.DateTimeFormat('pt-BR', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(date)}
          </h2>
          <span className="muted small">
            Horário de São Paulo · conteúdo planejado
          </span>
        </div>
        <div className="calendar-controls">
          <div className="segmented">
            <button
              className={mode === 'week' ? 'active' : ''}
              onClick={() => setMode('week')}
            >
              Semana
            </button>
            <button
              className={mode === 'month' ? 'active' : ''}
              onClick={() => setMode('month')}
            >
              Mês
            </button>
          </div>
          <button
            className="icon-button"
            aria-label="Período anterior"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="button secondary compact"
            onClick={() => setAnchor(todayKey())}
          >
            Hoje
          </button>
          <button
            className="icon-button"
            aria-label="Próximo período"
            onClick={() => navigate(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className={`calendar-grid ${mode}`}>
        {days.map(day => {
          const planned = drafts.filter(
            draft => dateKey(draft.scheduledFor) === day
          );
          const isToday = day === todayKey();
          return (
            <section
              key={day}
              className={`calendar-day ${isToday ? 'today' : ''} ${mode === 'month' && day.slice(0, 7) !== anchor.slice(0, 7) ? 'outside' : ''}`}
              aria-label={formatDate(day, true)}
            >
              <div className="calendar-day-heading">
                <span>
                  {new Intl.DateTimeFormat('pt-BR', {
                    weekday: 'short',
                    timeZone: 'UTC',
                  })
                    .format(utcDate(day))
                    .replace('.', '')}
                </span>
                <strong>{Number(day.slice(8))}</strong>
              </div>
              {planned.map(draft => (
                <button
                  className="calendar-entry"
                  key={draft.id}
                  onClick={() => onOpen(draft)}
                >
                  <span>{getSkill(draft.skillId)?.label}</span>
                  <strong>{draft.title}</strong>
                </button>
              ))}
              {mode === 'week' && planned.length === 0 && (
                <span className="calendar-empty">
                  Um espaço para uma ideia.
                </span>
              )}
            </section>
          );
        })}
      </div>
      {!drafts.some(draft => draft.scheduledFor) && (
        <div className="calendar-tip">
          <CalendarDays size={20} />
          <p>
            Seu calendário começa com uma ideia. Salve um rascunho e escolha a
            data na biblioteca.
          </p>
          <button className="button secondary" onClick={onCreate}>
            Criar uma ideia
            <ArrowUpRight size={15} />
          </button>
        </div>
      )}
    </section>
  );
}

const PROFILE_FIELDS: {
  key: keyof VoiceProfile;
  label: string;
  hint: string;
  multiline?: boolean;
}[] = [
  {
    key: 'brandName',
    label: 'Seu nome ou nome da marca',
    hint: 'Como você quer se apresentar?',
  },
  { key: 'handle', label: 'Seu perfil no Instagram', hint: '@seuperfil' },
  {
    key: 'niche',
    label: 'O que você faz ou oferece',
    hint: 'Ex.: fotografia de famílias em São Paulo',
  },
  {
    key: 'audience',
    label: 'Com quem você quer conversar',
    hint: 'Quem é seu público e do que ele precisa?',
  },
  {
    key: 'tone',
    label: 'Como você quer soar',
    hint: 'Ex.: direto, acolhedor, com humor',
  },
  {
    key: 'cta',
    label: 'O convite que você costuma fazer',
    hint: 'Ex.: salvar o post ou mandar a palavra GUIA',
  },
  {
    key: 'examples',
    label: 'Textos que têm a sua voz',
    hint: 'Cole suas próprias legendas, roteiros ou expressões favoritas.',
    multiline: true,
  },
  {
    key: 'proof',
    label: 'Fatos e resultados que podemos usar',
    hint: 'Inclua apenas números, histórias e experiências reais.',
    multiline: true,
  },
  {
    key: 'avoid',
    label: 'O que devemos evitar',
    hint: 'Palavras, assuntos, nomes ou informações que não devem aparecer.',
    multiline: true,
  },
];

export default function Studio() {
  const [view, setView] = useState<View>('create');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [credentials, setCredentials] = useState<WorkspaceCredentials | null>(
    null
  );
  const [profile, setProfile] = useState<VoiceProfile>({ ...EMPTY_PROFILE });
  const [profileForm, setProfileForm] = useState<VoiceProfile>({
    ...EMPTY_PROFILE,
  });
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState('');
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [skillId, setSkillId] = useState<SkillId>('ig-reel');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<GenerateOptions>(DEFAULT_OPTIONS);
  const [resultOptions, setResultOptions] =
    useState<GenerateOptions>(DEFAULT_OPTIONS);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [review, setReview] = useState<AnalysisReport | null>(null);
  const [reviewedText, setReviewedText] = useState('');
  const [savedResult, setSavedResult] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<DraftRecord | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [confirmNew, setConfirmNew] = useState(false);
  const activeWorkspace = useRef<string | null>(null);
  const selectedSkill = getSkill(skillId)!;
  const resultText =
    generation?.content ?? (review ? (review.cleanedText ?? reviewedText) : '');

  function applyWorkspace(workspace: {
    credentials: WorkspaceCredentials;
    profile: VoiceProfile;
  }) {
    activeWorkspace.current = workspace.credentials.workspaceId;
    setCredentials(workspace.credentials);
    setProfile(workspace.profile);
    setProfileForm(workspace.profile);
    setStorageUnavailable(!rememberCredentials(workspace.credentials));
    setInitError('');
    setDrafts([]);
    setNextToken(undefined);
    setDraftsLoaded(false);
    setDraftsLoading(false);
    setDraftsError('');
    setGeneration(null);
    setReview(null);
    setSavedResult(null);
    setEditing(null);
    setInput('');
    setSearch('');
    setStatusFilter('all');
    setOptions(DEFAULT_OPTIONS);
  }

  async function initialize() {
    setInitializing(true);
    setInitError('');
    try {
      applyWorkspace(await bootstrapWorkspace());
    } catch (error) {
      setInitError((error as Error).message);
    } finally {
      setInitializing(false);
    }
  }

  useEffect(() => {
    void initialize();
  }, []);

  async function loadDrafts(append = false) {
    if (!credentials || draftsLoading) return;
    const workspaceId = credentials.workspaceId;
    setDraftsLoading(true);
    setDraftsError('');
    try {
      const page = await studioApi.listDrafts(
        credentials,
        append ? nextToken : undefined
      );
      if (activeWorkspace.current !== workspaceId) return;
      setDrafts(previous =>
        append
          ? [
              ...previous,
              ...page.items.filter(
                item => !previous.some(existing => existing.id === item.id)
              ),
            ]
          : page.items
      );
      setNextToken(page.nextToken);
      setDraftsLoaded(true);
    } catch (error) {
      if (activeWorkspace.current === workspaceId)
        setDraftsError((error as Error).message);
    } finally {
      if (activeWorkspace.current === workspaceId) setDraftsLoading(false);
    }
  }

  useEffect(() => {
    if (
      (view === 'library' || view === 'calendar') &&
      credentials &&
      !draftsLoaded
    )
      void loadDrafts();
  }, [view, credentials, draftsLoaded]);

  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    setNotice(null);
  }
  function showError(text: string) {
    setNotice({ kind: 'error', text });
  }
  async function copy(
    text: string,
    success = 'Texto copiado. Pronto para usar.'
  ) {
    try {
      await copyText(text);
      setNotice({ kind: 'success', text: success });
      return true;
    } catch (error) {
      showError((error as Error).message);
      return false;
    }
  }

  async function generate() {
    if (!credentials || busy) return;
    if (!input.trim()) {
      showError('Conte sua ideia ou cole o texto para começar.');
      return;
    }
    setBusy('generate');
    setNotice(null);
    const requestedOptions = { ...options };
    try {
      const result = await studioApi.generate(
        credentials,
        skillId,
        input.trim(),
        requestedOptions
      );
      setResultOptions(requestedOptions);
      setGeneration(result);
      setReview(null);
      setSavedResult(null);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function analyze() {
    if (!credentials || busy) return;
    if (!input.trim()) {
      showError('Cole um texto ou dados para fazer a revisão.');
      return;
    }
    setBusy('analyze');
    setNotice(null);
    const requestedOptions = { ...options };
    try {
      const report = await studioApi.analyze(
        credentials,
        skillId,
        input,
        requestedOptions
      );
      setResultOptions(requestedOptions);
      setReview(report);
      setReviewedText(input);
      setGeneration(null);
      setSavedResult(null);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function saveResult() {
    if (!credentials || (!generation && !review) || busy || savedResult) return;
    setBusy('save-result');
    setNotice(null);
    try {
      const result: Generation = generation ?? {
        title: `${selectedSkill.label}: revisão do seu conteúdo`,
        content: review?.cleanedText ?? reviewedText,
        notes: [],
        slides: [],
        schedule: [],
        checks: review!,
      };
      const { draft } = await studioApi.createDraft(credentials, {
        ...result,
        skillId,
        status: 'draft',
        scheduledFor: null,
        analysisOptions: resultOptions,
      });
      setDrafts(current => [
        draft,
        ...current.filter(item => item.id !== draft.id),
      ]);
      setSavedResult(draft.id);
      setNotice({
        kind: 'success',
        text: 'Rascunho salvo na sua biblioteca, disponível neste espaço em qualquer navegador.',
      });
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function updateDraft(id: string, changes: DraftPatch) {
    if (!credentials || busy) return;
    setBusy('draft');
    setNotice(null);
    try {
      const { draft } = await studioApi.updateDraft(credentials, id, changes);
      setDrafts(current =>
        current.map(item => (item.id === id ? draft : item))
      );
      setEditing(null);
      setNotice({ kind: 'success', text: 'Alterações salvas no seu espaço.' });
    } catch (error) {
      showError((error as Error).message);
      throw error;
    } finally {
      setBusy('');
    }
  }

  async function deleteDraft(id: string) {
    if (!credentials || busy) return;
    setBusy('draft');
    setNotice(null);
    try {
      await studioApi.deleteDraft(credentials, id);
      setDrafts(current => current.filter(item => item.id !== id));
      setEditing(null);
      setNotice({
        kind: 'success',
        text: 'Rascunho excluído da biblioteca e do calendário.',
      });
    } catch (error) {
      showError((error as Error).message);
      throw error;
    } finally {
      setBusy('');
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!credentials || busy) return;
    setBusy('profile');
    setNotice(null);
    try {
      const result = await studioApi.saveProfile(credentials, profileForm);
      setProfile(result.profile);
      setProfileForm(result.profile);
      setNotice({
        kind: 'success',
        text: 'Sua voz foi salva. Os próximos conteúdos já vão considerar esse perfil.',
      });
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function refreshProfile() {
    if (!credentials || busy) return;
    setBusy('profile');
    setNotice(null);
    try {
      const result = await studioApi.readProfile(credentials);
      setProfile(result.profile);
      setProfileForm(result.profile);
      setNotice({
        kind: 'success',
        text: 'Perfil atualizado com a versão salva no seu espaço.',
      });
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function switchWorkspace(create = false) {
    if (busy) return;
    setBusy('workspace');
    setNotice(null);
    try {
      const workspace = create
        ? await createWorkspace()
        : await openWorkspace(accessCode);
      applyWorkspace(workspace);
      setAccessCode('');
      setConfirmNew(false);
      setNotice({
        kind: 'success',
        text: create
          ? 'Novo espaço criado. Guarde o código de acesso para encontrá-lo depois.'
          : 'Seu espaço foi aberto. Sua voz e seus rascunhos estão na nuvem.',
      });
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  const filteredDrafts = drafts.filter(
    draft =>
      (statusFilter === 'all' || draft.status === statusFilter) &&
      `${draft.title} ${draft.content}`
        .toLocaleLowerCase('pt-BR')
        .includes(search.toLocaleLowerCase('pt-BR'))
  );

  const titles: Record<
    View,
    { eyebrow: string; title: string; detail: string }
  > = {
    create: {
      eyebrow: 'SEU ESTÚDIO DE CONTEÚDO',
      title: 'Sua próxima boa ideia começa aqui.',
      detail: 'Você traz a história. A gente ajuda a dar forma.',
    },
    calendar: {
      eyebrow: 'UM POUCO DE DIREÇÃO',
      title: 'Mais espaço para criar. Menos improviso.',
      detail: 'Organize seus rascunhos no ritmo que funciona para você.',
    },
    library: {
      eyebrow: 'IDEIAS QUE VALE GUARDAR',
      title: 'Seu conteúdo, em um só lugar.',
      detail:
        'Rascunhos salvos na nuvem, prontos para continuar de onde você parou.',
    },
    voice: {
      eyebrow: 'O QUE TORNA SEU CONTEÚDO SEU',
      title: 'Antes de escrever, vamos conhecer sua voz.',
      detail: 'Um perfil que acompanha você em cada novo conteúdo.',
    },
    space: {
      eyebrow: 'SEU CANTO NA NUVEM',
      title: 'Crie aqui. Continue de qualquer lugar.',
      detail:
        'O mesmo perfil e a mesma biblioteca, no navegador que você escolher.',
    },
  };

  return (
    <div className="studio-shell">
      {mobileMenu && (
        <button
          className="mobile-scrim"
          aria-label="Fechar menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileMenu ? 'open' : ''}`}
        aria-label="Navegação principal"
      >
        <a
          className="brand"
          href="#"
          onClick={event => {
            event.preventDefault();
            navigate('create');
          }}
        >
          <span className="brand-icon">
            <Instagram size={23} />
          </span>
          <span>
            instagram<span className="brand-subtitle">STUDIO</span>
          </span>
        </a>
        <button
          className="sidebar-close icon-button"
          aria-label="Fechar menu"
          onClick={() => setMobileMenu(false)}
        >
          <X size={20} />
        </button>
        <div className="sidebar-caption">SEU ESPAÇO CRIATIVO</div>
        <nav>
          {NAVIGATION.map(({ view: item, label, icon: Icon }) => (
            <button
              key={item}
              className={`nav-item ${view === item ? 'active' : ''}`}
              aria-current={view === item ? 'page' : undefined}
              onClick={() => navigate(item)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {item === 'create' && <span className="nav-plus">+</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-spark">
            <Sparkles size={17} />
          </span>
          <h3>Do seu jeito.</h3>
          <p>
            Treze ferramentas.
            <br />
            Uma voz: a sua.
          </p>
          <button onClick={() => navigate('voice')}>
            Personalizar minha voz
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="cloud-dot" />
          <span>Seu conteúdo na nuvem</span>
          <Cloud size={15} />
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              aria-label="Abrir menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Seu espaço<span>/</span>
              <strong>
                {NAVIGATION.find(item => item.view === view)?.label}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="private-label">
              <ShieldCheck size={14} />
              Espaço privado
            </span>
            <button
              className="avatar"
              aria-label="Abrir minha voz"
              onClick={() => navigate('voice')}
            >
              {(profile.brandName || 'Você')
                .slice(0, 1)
                .toLocaleUpperCase('pt-BR')}
            </button>
          </div>
        </header>
        <main className="main-content">
          <header className="page-heading">
            <span className="eyebrow">{titles[view].eyebrow}</span>
            <h1>{titles[view].title}</h1>
            <p>{titles[view].detail}</p>
          </header>
          {notice && (
            <div
              className={`notice ${notice.kind}`}
              role={notice.kind === 'error' ? 'alert' : 'status'}
            >
              <span>
                {notice.kind === 'success' ? (
                  <Check size={18} />
                ) : (
                  <CircleHelp size={18} />
                )}
                {notice.text}
              </span>
              <button
                aria-label="Fechar aviso"
                className="icon-button"
                onClick={() => setNotice(null)}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {storageUnavailable && (
            <div className="notice error" role="status">
              <span>
                Seu navegador não está guardando o acesso. Copie seu código em
                Seu espaço para poder voltar depois.
              </span>
              <button className="text-button" onClick={() => navigate('space')}>
                Guardar meu acesso
              </button>
            </div>
          )}
          {initializing && (
            <div className="initializing panel" role="status">
              <Spinner label="Abrindo seu espaço criativo…" />
            </div>
          )}
          {initError && (
            <div className="panel bootstrap-error">
              <Cloud size={32} />
              <h2>Vamos reconectar seu espaço.</h2>
              <p role="alert">{initError}</p>
              <div>
                <button
                  className="button primary"
                  onClick={() => void initialize()}
                >
                  Tentar novamente
                </button>
                <button
                  className="button secondary"
                  onClick={() => navigate('space')}
                >
                  Usar meu código de acesso
                </button>
              </div>
            </div>
          )}
          {!initializing && (!initError || view === 'space') && (
            <>
              {view === 'create' && (
                <>
                  <section className="inspiration-banner">
                    <div>
                      <span className="banner-label">
                        <Sparkles size={14} />
                        DA IDEIA À PUBLICAÇÃO
                      </span>
                      <h2>O melhor conteúdo tem um pouco de você.</h2>
                      <p>
                        Uma experiência real, uma dica útil, uma história que
                        merece sair do papel.
                      </p>
                    </div>
                    <div className="banner-art" aria-hidden="true">
                      <div className="art-card back">
                        <Layers size={25} />
                        <span>uma boa ideia</span>
                      </div>
                      <div className="art-card front">
                        <Clapperboard size={28} />
                        <span>sua voz</span>
                        <div className="art-lines">
                          <i />
                          <i />
                        </div>
                      </div>
                      <Sparkles className="art-spark" size={27} />
                    </div>
                  </section>
                  <div className="section-heading">
                    <div>
                      <h2>O que vamos criar hoje?</h2>
                      <p>Escolha um formato para dar o primeiro passo.</p>
                    </div>
                    <span className="tool-count">
                      13 ferramentas, muitas possibilidades
                    </span>
                  </div>
                  <div
                    className="tool-grid"
                    aria-label="Ferramentas de conteúdo"
                  >
                    {SKILLS.map(skill => {
                      const Icon = ICONS[skill.icon];
                      return (
                        <button
                          key={skill.id}
                          className={`tool-card ${skill.id === skillId ? 'selected' : ''}`}
                          aria-pressed={skill.id === skillId}
                          disabled={!!busy}
                          onClick={() => {
                            setSkillId(skill.id);
                            setGeneration(null);
                            setReview(null);
                            setSavedResult(null);
                          }}
                        >
                          <span className="tool-icon">
                            <Icon size={20} />
                          </span>
                          <span className="tool-label">{skill.label}</span>
                          {skill.id === skillId && (
                            <span className="selected-dot" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="composer-layout">
                    <section className="panel composer-panel">
                      <div className="panel-heading">
                        <div className="panel-icon">
                          <Sparkles size={18} />
                        </div>
                        <div>
                          <h2>{selectedSkill.subtitle}</h2>
                          <p>{selectedSkill.description}</p>
                        </div>
                      </div>
                      <label className="field idea-field">
                        <span>{selectedSkill.inputLabel}</span>
                        <textarea
                          value={input}
                          maxLength={24000}
                          placeholder={selectedSkill.placeholder}
                          onChange={event => setInput(event.target.value)}
                        />
                        <span className="input-counter">
                          {input.length.toLocaleString('pt-BR')} / 24.000
                        </span>
                      </label>
                      <div className="form-grid two">
                        <label className="field">
                          <span>Objetivo do conteúdo</span>
                          <select
                            value={options.intent}
                            onChange={event =>
                              setOptions({
                                ...options,
                                intent: event.target.value,
                              })
                            }
                          >
                            <option>Ensinar algo útil</option>
                            <option>Compartilhar uma história</option>
                            <option>Mostrar um resultado</option>
                            <option>Iniciar uma conversa</option>
                            <option>Apresentar uma oferta</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Duração do Reel</span>
                          <select
                            value={options.duration}
                            onChange={event =>
                              setOptions({
                                ...options,
                                duration: Number(event.target.value),
                              })
                            }
                          >
                            <option value={15}>15 segundos</option>
                            <option value={30}>30 segundos</option>
                            <option value={45}>45 segundos</option>
                            <option value={60}>60 segundos</option>
                            <option value={90}>90 segundos</option>
                          </select>
                        </label>
                      </div>
                      {(skillId === 'ig-reel' ||
                        skillId === 'ig-caption' ||
                        skillId === 'ig-human') && (
                        <div className="form-grid two">
                          <label className="field">
                            <span>
                              Termos de busca <em>opcional</em>
                            </span>
                            <input
                              placeholder="Ex.: fotografia de família, São Paulo"
                              maxLength={300}
                              value={options.keywords}
                              onChange={event =>
                                setOptions({
                                  ...options,
                                  keywords: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Ritmo da fala</span>
                            <select
                              value={options.wpm}
                              onChange={event =>
                                setOptions({
                                  ...options,
                                  wpm: Number(event.target.value),
                                })
                              }
                            >
                              <option value={140}>
                                Calmo · 140 palavras/min
                              </option>
                              <option value={165}>
                                Natural · 165 palavras/min
                              </option>
                              <option value={190}>
                                Rápido · 190 palavras/min
                              </option>
                            </select>
                          </label>
                        </div>
                      )}
                      <button
                        className="voice-context"
                        onClick={() => navigate('voice')}
                      >
                        <span>
                          <UserRound size={16} />
                          {profile.brandName
                            ? `Com a voz de ${profile.brandName}`
                            : 'Deixe o conteúdo ainda mais seu'}
                        </span>
                        <ArrowRight size={16} />
                      </button>
                      <div className="composer-actions">
                        <button
                          className="button primary"
                          disabled={!!busy || !credentials}
                          onClick={() => void generate()}
                        >
                          {busy === 'generate' ? (
                            <Spinner label="Criando seu conteúdo…" />
                          ) : (
                            <>
                              <Sparkles size={17} />
                              Criar conteúdo
                              <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                        <button
                          className="button secondary"
                          disabled={!!busy || !credentials}
                          onClick={() => void analyze()}
                        >
                          {busy === 'analyze' ? (
                            <Spinner label="Revisando…" />
                          ) : (
                            <>
                              <CheckCheck size={16} />
                              Revisar texto
                            </>
                          )}
                        </button>
                      </div>
                      <p className="composer-footnote">
                        <ShieldCheck size={13} />
                        Seus fatos e sua voz. Sem resultados inventados.
                      </p>
                    </section>
                    <section
                      className={`panel result-panel ${generation || review ? 'has-result' : ''}`}
                      aria-label="Seu conteúdo"
                      aria-busy={busy === 'generate' || busy === 'analyze'}
                    >
                      <div className="result-heading">
                        <span>
                          <FileText size={17} />
                          Seu conteúdo
                        </span>
                        <span className="quiet-badge">
                          {generation
                            ? 'Rascunho'
                            : review
                              ? 'Revisão'
                              : 'Próximo passo'}
                        </span>
                      </div>
                      {busy === 'generate' || busy === 'analyze' ? (
                        <div className="result-empty generating" role="status">
                          <span className="empty-symbol">
                            <LoaderCircle size={30} className="spin" />
                          </span>
                          <h3>
                            {busy === 'generate'
                              ? 'Dando forma à sua ideia.'
                              : 'Olhando para cada detalhe.'}
                          </h3>
                          <p>
                            {busy === 'generate'
                              ? 'Estamos considerando seu contexto e sua voz. Pode levar alguns instantes.'
                              : 'Contando, conferindo e identificando o que merece atenção.'}
                          </p>
                        </div>
                      ) : !generation && !review ? (
                        <div className="result-empty">
                          <div
                            className="empty-illustration"
                            aria-hidden="true"
                          >
                            <div className="empty-paper">
                              <Sparkles size={22} />
                              <i />
                              <i />
                              <i />
                            </div>
                            <span className="empty-floating">
                              <Clapperboard size={18} />
                            </span>
                          </div>
                          <h3>Sua ideia vai ganhar forma aqui.</h3>
                          <p>
                            Escolha uma ferramenta, conte um pouco
                            <br className="desktop-only" /> do contexto e deixe
                            o primeiro rascunho com a gente.
                          </p>
                          <span className="empty-hint">
                            Você pode editar tudo depois.
                          </span>
                        </div>
                      ) : (
                        <div className="result-body">
                          <h2>{generation?.title ?? 'Revisão do seu texto'}</h2>
                          <ContentText text={resultText} />
                          <div className="result-actions">
                            <button
                              className="button secondary compact"
                              onClick={() => void copy(resultText)}
                            >
                              <Copy size={15} />
                              Copiar texto
                            </button>
                            <button
                              className="button secondary compact"
                              onClick={() =>
                                downloadBlob(
                                  new Blob([resultText], {
                                    type: 'text/plain;charset=utf-8',
                                  }),
                                  `${fileName(generation?.title ?? 'revisao-do-texto')}.txt`
                                )
                              }
                            >
                              <ArrowDownToLine size={15} />
                              Baixar texto
                            </button>
                            {(generation || review) && (
                              <button
                                className="button primary compact"
                                disabled={!!busy || !!savedResult}
                                onClick={() => void saveResult()}
                              >
                                {savedResult ? (
                                  <>
                                    <Check size={15} />
                                    Salvo na biblioteca
                                  </>
                                ) : busy === 'save-result' ? (
                                  <Spinner label="Salvando…" />
                                ) : (
                                  <>
                                    <Plus size={15} />
                                    Salvar rascunho
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          {!!generation?.notes.length && (
                            <div className="result-notes">
                              <h3>Para levar com você</h3>
                              <ul>
                                {generation.notes.map((note, index) => (
                                  <li key={index}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <Checks report={generation?.checks ?? review!} />
                          {!!generation?.slides.length && (
                            <CarouselPreview
                              slides={generation.slides}
                              handle={profile.handle}
                              onError={showError}
                            />
                          )}
                          {!!generation?.schedule.length && (
                            <div className="generated-schedule">
                              <h3>Ideias para a semana</h3>
                              {generation.schedule.map((item, index) => (
                                <article key={index}>
                                  <span>
                                    {item.day}
                                    {item.date
                                      ? ` · ${formatDate(dateKey(item.date))}`
                                      : ''}
                                  </span>
                                  <strong>{item.title}</strong>
                                  <p>
                                    {item.format} · {item.idea}
                                  </p>
                                </article>
                              ))}
                              <p className="small muted">
                                Este plano é uma sugestão. Defina as datas dos
                                rascunhos na biblioteca para organizá-los no
                                calendário.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
              {(view === 'library' || view === 'calendar') && (
                <>
                  {draftsError && (
                    <div className="notice error" role="alert">
                      <span>{draftsError}</span>
                      <button
                        className="text-button"
                        onClick={() => void loadDrafts()}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}
                  {view === 'calendar' ? (
                    <Calendar
                      drafts={drafts}
                      onOpen={setEditing}
                      onCreate={() => navigate('create')}
                    />
                  ) : (
                    <>
                      <div className="library-toolbar">
                        <label className="search-field">
                          <Search size={18} />
                          <input
                            aria-label="Buscar rascunhos"
                            placeholder="Encontre uma ideia…"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                          />
                        </label>
                        <select
                          aria-label="Filtrar por status"
                          value={statusFilter}
                          onChange={event =>
                            setStatusFilter(event.target.value)
                          }
                        >
                          <option value="all">Todos os status</option>
                          <option value="draft">Rascunhos</option>
                          <option value="ready">Prontos</option>
                          <option value="scheduled">Planejados</option>
                        </select>
                        <button
                          className="button secondary"
                          disabled={draftsLoading}
                          onClick={() => void loadDrafts()}
                        >
                          <RefreshCw size={16} />
                          Atualizar
                        </button>
                        <button
                          className="button primary"
                          onClick={() => navigate('create')}
                        >
                          <Plus size={17} />
                          Nova ideia
                        </button>
                      </div>
                      {!draftsLoading && !filteredDrafts.length && (
                        <div className="panel library-empty">
                          <span className="empty-symbol">
                            <FolderOpen size={29} />
                          </span>
                          <h2>
                            {drafts.length
                              ? 'Ainda não encontramos essa ideia.'
                              : 'Toda boa biblioteca começa com uma ideia.'}
                          </h2>
                          <p>
                            {drafts.length
                              ? 'Tente outro termo ou status.'
                              : 'Crie seu primeiro conteúdo e salve o rascunho para continuar depois.'}
                          </p>
                          {!drafts.length && (
                            <button
                              className="button primary"
                              onClick={() => navigate('create')}
                            >
                              <Sparkles size={17} />
                              Criar meu primeiro conteúdo
                            </button>
                          )}
                        </div>
                      )}
                      <div className="draft-grid">
                        {filteredDrafts.map(draft => {
                          const skill = getSkill(draft.skillId);
                          const Icon =
                            ICONS[skill?.icon ?? 'FileText'] ?? FileText;
                          return (
                            <article className="draft-card" key={draft.id}>
                              <div className="draft-card-top">
                                <span className="draft-format">
                                  <Icon size={16} />
                                  {skill?.label}
                                </span>
                                <span
                                  className={`status-badge ${draft.status}`}
                                >
                                  {STATUS_LABELS[draft.status]}
                                </span>
                              </div>
                              <h2>{draft.title}</h2>
                              <p>
                                {draft.content.slice(0, 170)}
                                {draft.content.length > 170 ? '…' : ''}
                              </p>
                              <div className="draft-card-bottom">
                                <span>
                                  {draft.scheduledFor ? (
                                    <>
                                      <CalendarDays size={13} />
                                      {formatDate(dateKey(draft.scheduledFor))}
                                    </>
                                  ) : (
                                    <>
                                      Criado em{' '}
                                      {formatDate(dateKey(draft.createdAt))}
                                    </>
                                  )}
                                </span>
                                <button
                                  className="text-button"
                                  aria-label={`Abrir rascunho: ${draft.title}`}
                                  onClick={() => setEditing(draft)}
                                >
                                  Abrir
                                  <ArrowUpRight size={15} />
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>                  )}
                  {draftsLoading && (
                    <div className="list-loading" role="status">
                      <Spinner label="Buscando seus rascunhos…" />
                    </div>
                  )}
                  {nextToken && (
                    <div className="load-more">
                      <p>
                        Há mais rascunhos no seu espaço. Carregue-os para
                        incluir as próximas ideias
                        {view === 'calendar' ? ' no calendário' : ''}.
                      </p>
                      <button
                        className="button secondary"
                        disabled={draftsLoading}
                        onClick={() => void loadDrafts(true)}
                      >
                        Carregar mais rascunhos
                        <ArrowDownToLine size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {view === 'voice' && (
                <section className="panel voice-panel">
                  <div className="panel-heading">
                    <div className="panel-icon">
                      <UserRound size={20} />
                    </div>
                    <div>
                      <h2>Um conteúdo que parece seu.</h2>
                      <p>
                        Preencha o que fizer sentido. Você pode voltar e mudar
                        depois.
                      </p>
                    </div>
                  </div>
                  <form onSubmit={event => void saveProfile(event)}>
                    <div className="form-grid two">
                      {PROFILE_FIELDS.map(field => (
                        <label
                          className={`field ${field.multiline ? 'span-two' : ''}`}
                          key={field.key}
                        >
                          <span>{field.label}</span>
                          {field.multiline ? (
                            <textarea
                              maxLength={
                                field.key === 'examples' ||
                                field.key === 'proof'
                                  ? 4000
                                  : 2000
                              }
                              placeholder={field.hint}
                              value={profileForm[field.key]}
                              onChange={event =>
                                setProfileForm({
                                  ...profileForm,
                                  [field.key]: event.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              maxLength={field.key === 'handle' ? 80 : 1000}
                              placeholder={field.hint}
                              value={profileForm[field.key]}
                              onChange={event =>
                                setProfileForm({
                                  ...profileForm,
                                  [field.key]: event.target.value,
                                })
                              }
                            />
                          )}
                        </label>
                      ))}
                      <label className="field">
                        <span>Idioma dos seus conteúdos</span>
                        <select
                          value={profileForm.language}
                          onChange={event =>
                            setProfileForm({
                              ...profileForm,
                              language: event.target.value,
                            })
                          }
                        >
                          <option value="pt-BR">Português (Brasil)</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          {!['pt-BR', 'en', 'es'].includes(
                            profileForm.language
                          ) && (
                            <option value={profileForm.language}>
                              {profileForm.language}
                            </option>
                          )}
                        </select>
                      </label>
                    </div>
                    <div className="profile-footer">
                      <p>
                        <Cloud size={16} />
                        Salvo na nuvem. Usado nos seus próximos conteúdos.
                      </p>
                      <div>
                        <button
                          type="button"
                          className="button secondary"
                          disabled={!!busy}
                          onClick={() => void refreshProfile()}
                        >
                          <RefreshCw size={16} />
                          Atualizar perfil
                        </button>
                        <button
                          type="submit"
                          className="button primary"
                          disabled={!!busy || !credentials}
                        >
                          {busy === 'profile' ? (
                            <Spinner label="Salvando…" />
                          ) : (
                            <>
                              <Check size={17} />
                              Salvar minha voz
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </section>
              )}
              {view === 'space' && (
                <div className="space-layout">
                  <section className="panel space-panel">
                    <span className="space-icon">
                      <Cloud size={29} />
                    </span>
                    <h2>Seu conteúdo vai com você.</h2>
                    <p>
                      Sua voz e seus rascunhos ficam neste espaço privado na
                      nuvem. O navegador guarda apenas o acesso, para reconhecer
                      você quando voltar.
                    </p>
                    <div className="privacy-card">
                      <ShieldCheck size={21} />
                      <div>
                        <strong>Guarde seu código em um lugar seguro.</strong>
                        <p>
                          Ele abre este mesmo espaço em outro navegador ou
                          dispositivo. Quem tiver o código pode acessar seus
                          conteúdos.
                        </p>
                      </div>
                    </div>
                    <button
                      className="button primary"
                      disabled={!credentials}
                      onClick={() => {
                        if (credentials)
                          void copy(
                            `${credentials.workspaceId}.${credentials.accessKey}`,
                            'Código de acesso copiado. Guarde-o em um lugar privado.'
                          );
                      }}
                    >
                      <Copy size={17} />
                      Copiar código de acesso
                    </button>
                    <p className="small muted">
                      Seu código só é copiado quando você solicita. Não o
                      compartilhe publicamente.
                    </p>
                    {!credentials && readCredentials() && (
                      <p className="small muted">
                        O acesso salvo neste navegador foi preservado. Tente
                        reconectar ou abra um espaço com um código válido.
                      </p>
                    )}
                  </section>
                  <section className="panel space-panel">
                    <span className="space-icon soft">
                      <ArrowRight size={26} />
                    </span>
                    <h2>Já criou conteúdo em outro lugar?</h2>
                    <p>
                      Cole o código daquele espaço para abrir o mesmo perfil e a
                      mesma biblioteca aqui.
                    </p>
                    <form
                      onSubmit={event => {
                        event.preventDefault();
                        void switchWorkspace();
                      }}
                    >
                      <label className="field">
                        <span>Código de acesso de outro espaço</span>
                        <input
                          type="password"
                          autoComplete="off"
                          value={accessCode}
                          placeholder="Cole seu código completo"
                          onChange={event => setAccessCode(event.target.value)}
                        />
                      </label>
                      <button
                        type="submit"
                        className="button secondary full"
                        disabled={!!busy || !accessCode.trim()}
                      >
                        {busy === 'workspace' ? (
                          <Spinner label="Abrindo seu espaço…" />
                        ) : (
                          <>
                            <FolderOpen size={16} />
                            Abrir meu espaço
                          </>
                        )}
                      </button>
                    </form>
                    <div className="new-space">
                      <h3>Quer começar um espaço diferente?</h3>
                      <p>
                        O atual continua na nuvem. Guarde o código antes de
                        trocar.
                      </p>
                      <button
                        className="text-button"
                        disabled={!!busy}
                        onClick={() => setConfirmNew(true)}
                      >
                        <Plus size={15} />
                        Criar outro espaço
                      </button>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>Feito para criar com intenção.</span>
            <span>
              Você cria aqui. Publica no seu tempo.
              <ArrowUpRight size={13} />
            </span>
          </footer>
        </main>
      </div>
      {editing && (
        <DraftEditor
          key={editing.id}
          draft={editing}
          pending={busy === 'draft'}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
          onSave={updateDraft}
          onDelete={deleteDraft}
          onCopy={text => copy(text)}
          onError={showError}
          handle={profile.handle}
        />
      )}
      {confirmNew && (
        <Dialog
          title="Criar outro espaço?"
          onClose={() => setConfirmNew(false)}
        >
          <p className="muted">
            O espaço atual continua salvo na nuvem. Para voltar a ele, você
            precisa guardar seu código de acesso antes de trocar.
          </p>
          <div className="dialog-actions">
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => void switchWorkspace(true)}
            >
              {busy === 'workspace' ? (
                <Spinner label="Criando espaço…" />
              ) : (
                'Criar novo espaço'
              )}
            </button>
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() => setConfirmNew(false)}
            >
              <ArrowLeft size={16} />
              Ficar neste espaço
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
