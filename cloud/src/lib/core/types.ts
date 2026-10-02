// Adapted from klebertanide/instagram-agent-skill web/ @6c91976 (MIT, Jake Schincariol).
export type SkillId =
  | 'ig-reel'
  | 'ig-caption'
  | 'ig-carousel'
  | 'ig-story'
  | 'ig-plan'
  | 'ig-human'
  | 'ig-comment'
  | 'ig-reply'
  | 'ig-dm'
  | 'ig-repurpose'
  | 'ig-profile'
  | 'ig-audit'
  | 'ig-viral';

export interface WorkspaceCredentials {
  workspaceId: string;
  accessKey: string;
}

export interface VoiceProfile {
  brandName: string;
  handle: string;
  niche: string;
  audience: string;
  tone: string;
  examples: string;
  proof: string;
  avoid: string;
  cta: string;
  language: string;
}

export const EMPTY_PROFILE: VoiceProfile = {
  brandName: '',
  handle: '',
  niche: '',
  audience: '',
  tone: 'Direto e próximo',
  examples: '',
  proof: '',
  avoid: '',
  cta: '',
  language: 'pt-BR',
};

export interface GenerateOptions {
  duration: number;
  wpm: number;
  intent: string;
  keywords: string;
}

export interface CheckIssue {
  label: string;
  detail: string;
  severity: 'pass' | 'warn' | 'fail';
}

export interface RankedReel {
  account: string;
  hook: string;
  views: number;
  median: number | null;
  multiple: number | null;
}

export interface AnalysisReport {
  characters: number;
  words: number;
  hashtagCount: number;
  preview: string;
  durationSeconds: number;
  issues: CheckIssue[];
  hookScore?: number;
  cleanedText?: string;
  rankings?: RankedReel[];
}

export interface Slide {
  title: string;
  body: string;
}

export interface ScheduleItem {
  date: string;
  day: string;
  title: string;
  format: string;
  idea: string;
}

export interface Generation {
  title: string;
  content: string;
  notes: string[];
  slides: Slide[];
  schedule: ScheduleItem[];
  checks: AnalysisReport;
}

export type DraftStatus = 'draft' | 'ready' | 'scheduled';

export interface DraftRecord extends Generation {
  analysisOptions?: GenerateOptions;
  id: string;
  skillId: SkillId;
  status: DraftStatus;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DraftPatch {
  title?: string;
  content?: string;
  status?: DraftStatus;
  scheduledFor?: string | null;
}

export interface DraftPage {
  items: DraftRecord[];
  nextToken?: string;
}
