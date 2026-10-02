export type ToolId =
  | "reel"
  | "caption"
  | "carousel"
  | "stories"
  | "weekplan"
  | "review"
  | "comment"
  | "replies"
  | "dm"
  | "repurpose"
  | "profile"
  | "results"
  | "references";

export type ToolDef = {
  id: ToolId;
  name: string;
  description: string;
  contextLabel: string;
  placeholder: string;
  fields: ("goal" | "duration" | "wpm" | "keywords")[];
  ai: boolean;
};

export const TOOLS: ToolDef[] = [
  { id: "reel", name: "Reel", description: "Roteiro falado para Reels, com três direções de gancho.", contextLabel: "Sobre o que é o Reel?", placeholder: "Ex.: mostrar como reduzi a criação de proposta de 5 horas para 20 minutos.", fields: ["goal", "duration", "wpm"], ai: true },
  { id: "caption", name: "Legenda", description: "Legenda pronta para post, dentro de 2.200 caracteres e até 5 hashtags.", contextLabel: "Do que trata o post?", placeholder: "Cole a ideia, a foto descrita ou o rascunho.", fields: ["goal", "keywords"], ai: true },
  { id: "carousel", name: "Carrossel", description: "Sequência de 6 a 10 slides, exportável em PNG 1080×1350.", contextLabel: "Qual é o assunto do carrossel?", placeholder: "Ex.: 7 passos do meu processo de onboarding.", fields: ["goal", "keywords"], ai: true },
  { id: "stories", name: "Stories", description: "Sequência de stories com fala e texto de tela.", contextLabel: "O que você quer contar nos stories?", placeholder: "Ex.: bastidores do lançamento de hoje.", fields: ["goal", "wpm"], ai: true },
  { id: "weekplan", name: "Plano da semana", description: "Plano de 7 dias com formato e ideia por dia.", contextLabel: "Temas, ofertas e limites da semana", placeholder: "Ex.: semana de abertura de turma, sem gravar vídeo na quarta.", fields: ["goal"], ai: true },
  { id: "review", name: "Revisar texto", description: "Revisa clareza mantendo fatos, links e emojis; mostra checagens objetivas.", contextLabel: "Cole o texto a revisar", placeholder: "Seu texto aqui. Fatos, URLs e emojis serão preservados.", fields: ["goal"], ai: true },
  { id: "comment", name: "Comentário", description: "Comentário de valor para deixar no post de outra pessoa.", contextLabel: "Cole o post em que vai comentar", placeholder: "Texto do post ou resumo dele.", fields: ["goal"], ai: true },
  { id: "replies", name: "Respostas", description: "Respostas para comentários recebidos no seu post.", contextLabel: "Cole os comentários recebidos", placeholder: "Um comentário por linha.", fields: ["goal"], ai: true },
  { id: "dm", name: "Mensagem", description: "Mensagem direta respeitosa, sem script agressivo.", contextLabel: "Para quem e por quê?", placeholder: "Ex.: responder quem pediu o preço da mentoria.", fields: ["goal"], ai: true },
  { id: "repurpose", name: "Reaproveitar", description: "Transforma um conteúdo existente em outro formato.", contextLabel: "Cole o conteúdo original", placeholder: "Texto de newsletter, podcast transcrito, post antigo…", fields: ["goal", "duration", "wpm"], ai: true },
  { id: "profile", name: "Perfil", description: "Bio e destaques sugeridos a partir da sua voz.", contextLabel: "O que deve mudar no perfil?", placeholder: "Bio atual e o que você quer comunicar.", fields: ["goal", "keywords"], ai: true },
  { id: "results", name: "Resultados", description: "Leitura dos números que você colar, sem previsões.", contextLabel: "Cole os números dos seus posts", placeholder: "Post, views, salvamentos, compartilhamentos…", fields: ["goal"], ai: true },
  { id: "references", name: "Referências", description: "Compara views com a mediana das contas a partir do CSV/TSV enviado.", contextLabel: "Cole ou envie o CSV/TSV", placeholder: "account,views,median,hook\n@a,400000,10000,\"Gancho…\"", fields: [], ai: false },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, ToolDef>;

export const KIND_LABEL: Record<string, string> = Object.fromEntries(TOOLS.map((t) => [t.id, t.name]));

export const STATUS_LABEL: Record<string, string> = { draft: "Rascunho", ready: "Pronto", planned: "Planejado" };

export const LIMITS = { context: 8000, goal: 500, keywords: 300, references: 200_000, content: 20000, title: 200 };

export const VOICE_FIELDS = [
  { key: "brandName", label: "Nome da marca", multiline: false },
  { key: "handle", label: "@ do Instagram", multiline: false },
  { key: "niche", label: "Nicho", multiline: false },
  { key: "audience", label: "Público", multiline: true },
  { key: "tone", label: "Tom de voz", multiline: true },
  { key: "examples", label: "Exemplos de textos seus", multiline: true },
  { key: "proof", label: "Provas e números reais (únicos números que a IA pode citar)", multiline: true },
  { key: "avoid", label: "Evitar", multiline: true },
  { key: "cta", label: "Chamada para ação preferida", multiline: false },
  { key: "language", label: "Idioma", multiline: false },
] as const;

export type VoiceProfile = Record<(typeof VOICE_FIELDS)[number]["key"], string>;

export const EMPTY_VOICE: VoiceProfile = {
  brandName: "", handle: "", niche: "", audience: "", tone: "", examples: "", proof: "", avoid: "", cta: "", language: "Português (Brasil)",
};
