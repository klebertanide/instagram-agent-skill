import { api } from '@appdeploy/client';
import type {
  AnalysisReport,
  DraftPage,
  DraftPatch,
  DraftRecord,
  Generation,
  GenerateOptions,
  SkillId,
  VoiceProfile,
  WorkspaceCredentials,
} from '../../shared/types';

const STORAGE_KEY = 'instagram-studio-workspace-v1';

export interface WorkspaceResponse {
  credentials: WorkspaceCredentials;
  profile: VoiceProfile;
}

function apiMessage(error: unknown): string {
  const candidate = error as {
    message?: string;
    statusCode?: number;
    responseText?: string;
    response?: { status?: number; data?: { message?: string; error?: string } };
  };
  const status = candidate?.statusCode ?? candidate?.response?.status;
  if (status === 402)
    return 'O serviço está temporariamente indisponível. Tente novamente mais tarde; seus rascunhos salvos estão preservados.';
  if (status === 429)
    return 'Seu espaço está recebendo muitas solicitações. Aguarde um momento e tente novamente.';
  if (status === 401 || status === 403)
    return 'Não foi possível abrir este espaço. Confira seu código de acesso e tente novamente.';
  let message =
    candidate?.response?.data?.message ?? candidate?.response?.data?.error;
  if (!message && candidate?.responseText) {
    try {
      const body = JSON.parse(candidate.responseText) as {
        message?: string;
        error?: string;
      };
      message = body.message ?? body.error;
    } catch {
      /* A non-JSON transport error gets the clear fallback below. */
    }
  }
  if (typeof message === 'string' && message.length < 400) return message;
  return 'Não conseguimos concluir agora. Verifique sua conexão e tente novamente; seu conteúdo continua aqui.';
}

async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    const response = await api.post(path, body);
    return response.data as T;
  } catch (error) {
    throw new Error(apiMessage(error));
  }
}

export function readCredentials(): WorkspaceCredentials | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<WorkspaceCredentials>;
    if (
      typeof parsed.workspaceId !== 'string' ||
      typeof parsed.accessKey !== 'string'
    )
      return null;
    return { workspaceId: parsed.workspaceId, accessKey: parsed.accessKey };
  } catch {
    return null;
  }
}

export function rememberCredentials(
  credentials: WorkspaceCredentials,
): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    return true;
  } catch {
    return false;
  }
}

let bootstrapPromise: Promise<WorkspaceResponse> | null = null;

export function bootstrapWorkspace(): Promise<WorkspaceResponse> {
  if (!bootstrapPromise) {
    const credentials = readCredentials();
    try {
      if (!credentials && localStorage.getItem(STORAGE_KEY)) {
        return Promise.reject(
          new Error(
            'O acesso salvo neste navegador não pôde ser lido. Use seu código de acesso em Seu espaço; o acesso anterior foi preservado.',
          ),
        );
      }
    } catch {
      /* Private browsing can prevent storage reads; keep the new access in memory. */
    }
    bootstrapPromise = post<WorkspaceResponse>(
      '/api/workspace',
      credentials ? { action: 'open', credentials } : { action: 'create' },
    )
      .then((workspace) => {
        rememberCredentials(workspace.credentials);
        return workspace;
      })
      .catch((error) => {
        bootstrapPromise = null;
        throw error;
      });
  }
  return bootstrapPromise;
}

export async function openWorkspace(code: string): Promise<WorkspaceResponse> {
  const parts = code.trim().split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      'Cole o código completo do seu espaço, incluindo o ponto entre as duas partes.',
    );
  }
  const credentials = { workspaceId: parts[0], accessKey: parts[1] };
  const workspace = await post<WorkspaceResponse>('/api/workspace', {
    action: 'open',
    credentials,
  });
  // Commit only after the server verifies the replacement credentials.
  rememberCredentials(workspace.credentials);
  bootstrapPromise = Promise.resolve(workspace);
  return workspace;
}

export async function createWorkspace(): Promise<WorkspaceResponse> {
  const workspace = await post<WorkspaceResponse>('/api/workspace', {
    action: 'create',
  });
  rememberCredentials(workspace.credentials);
  bootstrapPromise = Promise.resolve(workspace);
  return workspace;
}

export const studioApi = {
  async readProfile(credentials: WorkspaceCredentials) {
    return post<{ profile: VoiceProfile }>('/api/profile', {
      credentials,
      action: 'read',
    });
  },
  async saveProfile(credentials: WorkspaceCredentials, profile: VoiceProfile) {
    return post<{ profile: VoiceProfile }>('/api/profile', {
      credentials,
      action: 'save',
      profile,
    });
  },
  async generate(
    credentials: WorkspaceCredentials,
    skillId: SkillId,
    input: string,
    options: GenerateOptions,
  ) {
    return post<Generation>('/api/generate', {
      credentials,
      skillId,
      input,
      options,
    });
  },
  async analyze(
    credentials: WorkspaceCredentials,
    skillId: SkillId,
    text: string,
    options: GenerateOptions,
  ) {
    return post<AnalysisReport>('/api/analyze', {
      credentials,
      skillId,
      text,
      options,
    });
  },
  async listDrafts(credentials: WorkspaceCredentials, nextToken?: string) {
    return post<DraftPage>('/api/drafts', {
      credentials,
      action: 'list',
      nextToken,
    });
  },
  async createDraft(
    credentials: WorkspaceCredentials,
    draft: Generation & {
      skillId: SkillId;
      status: DraftRecord['status'];
      scheduledFor: string | null;
      analysisOptions?: GenerateOptions;
    },
  ) {
    return post<{ draft: DraftRecord }>('/api/drafts', {
      credentials,
      action: 'create',
      draft,
    });
  },
  async updateDraft(
    credentials: WorkspaceCredentials,
    id: string,
    changes: DraftPatch,
  ) {
    return post<{ draft: DraftRecord }>('/api/drafts', {
      credentials,
      action: 'update',
      id,
      changes,
    });
  },
  async deleteDraft(credentials: WorkspaceCredentials, id: string) {
    return post<{ deleted: true }>('/api/drafts', {
      credentials,
      action: 'delete',
      id,
    });
  },
};
