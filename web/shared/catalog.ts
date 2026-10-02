import type { SkillId } from './types';

export interface SkillDefinition {
  id: SkillId;
  label: string;
  subtitle: string;
  description: string;
  icon: string;
  group: 'Criar' | 'Conversar' | 'Analisar';
  inputLabel: string;
  placeholder: string;
}

export const SKILLS: SkillDefinition[] = [
  {
    id: 'ig-reel',
    label: 'Reel',
    subtitle: 'Uma ideia. Um bom começo.',
    description: 'Ganchos, roteiro falado e texto na tela, no seu ritmo.',
    icon: 'Clapperboard',
    group: 'Criar',
    inputLabel: 'Qual é a sua ideia?',
    placeholder:
      'Conte o que aconteceu, a quem e qual foi o resultado. Ex.: reduzimos o tempo de proposta de 5 horas para 20 minutos com um único modelo.',
  },
  {
    id: 'ig-caption',
    label: 'Legenda',
    subtitle: 'Palavras que merecem o toque.',
    description: 'Abertura, contexto e uma chamada para ação.',
    icon: 'AlignLeft',
    group: 'Criar',
    inputLabel: 'O que acompanha essa publicação?',
    placeholder:
      'Descreva o vídeo ou a imagem, o que você quer comunicar e a ação que espera de quem lê.',
  },
  {
    id: 'ig-carousel',
    label: 'Carrossel',
    subtitle: 'Uma ideia por slide.',
    description: 'Capa, sequência e slides para baixar em PNG.',
    icon: 'Layers',
    group: 'Criar',
    inputLabel: 'O que você quer explicar?',
    placeholder:
      'Descreva o processo, a lista ou a transformação que deve virar um carrossel. Inclua fatos e exemplos que você pode usar.',
  },
  {
    id: 'ig-story',
    label: 'Stories',
    subtitle: 'Uma conversa por dia.',
    description: 'Sequência de frames, stickers e respostas.',
    icon: 'CirclePlay',
    group: 'Criar',
    inputLabel: 'O que está acontecendo hoje?',
    placeholder:
      'Conte uma situação do seu dia, um bastidor ou uma oferta. Que conversa você quer iniciar com seu público?',
  },
  {
    id: 'ig-plan',
    label: 'Plano da semana',
    subtitle: 'Um pouco de direção.',
    description: 'Temas, formatos e ideias para os próximos dias.',
    icon: 'CalendarDays',
    group: 'Criar',
    inputLabel: 'O que merece espaço nesta semana?',
    placeholder:
      'Descreva sua oferta, público, temas principais e acontecimentos recentes. Inclua os dias em que você pode criar conteúdo.',
  },
  {
    id: 'ig-human',
    label: 'Revisar texto',
    subtitle: 'Mais você, menos fórmula.',
    description: 'Limpeza e revisão, preservando o que você quis dizer.',
    icon: 'WandSparkles',
    group: 'Analisar',
    inputLabel: 'Cole o texto que quer revisar',
    placeholder:
      'Cole seu roteiro, legenda ou mensagem. Vamos remover ruídos e manter sua voz e os fatos.',
  },
  {
    id: 'ig-comment',
    label: 'Comentário',
    subtitle: 'Tenha algo a acrescentar.',
    description: 'Duas opções de comentários específicos e naturais.',
    icon: 'MessageSquare',
    group: 'Conversar',
    inputLabel: 'A qual publicação você quer responder?',
    placeholder:
      'Cole o conteúdo da publicação, o perfil e o seu ponto de vista. Inclua somente experiências e números reais seus.',
  },
  {
    id: 'ig-reply',
    label: 'Respostas',
    subtitle: 'Cuide de quem chegou.',
    description: 'Organização dos comentários e respostas prioritárias.',
    icon: 'MessagesSquare',
    group: 'Conversar',
    inputLabel: 'Cole os comentários recebidos',
    placeholder:
      'Inclua o contexto da publicação e os comentários com nomes ou @perfis. Diga se algum comentário contém uma palavra-chave combinada.',
  },
  {
    id: 'ig-dm',
    label: 'Mensagem',
    subtitle: 'Comece pelo motivo.',
    description: 'Mensagens, colaboração e até dois follow-ups.',
    icon: 'Send',
    group: 'Conversar',
    inputLabel: 'Qual é o contexto da conversa?',
    placeholder:
      'Quem é a pessoa, o que motivou a mensagem hoje e o que você quer propor? Inclua a palavra-chave ou o link prometido, quando houver.',
  },
  {
    id: 'ig-repurpose',
    label: 'Reaproveitar',
    subtitle: 'Seu conteúdo vai mais longe.',
    description: 'Um material longo em ideias que funcionam sozinhas.',
    icon: 'Repeat2',
    group: 'Criar',
    inputLabel: 'Cole o conteúdo original',
    placeholder:
      'Cole um artigo, newsletter, roteiro ou transcrição. Identificaremos histórias, números e ideias que podem virar novas publicações.',
  },
  {
    id: 'ig-profile',
    label: 'Perfil',
    subtitle: 'Faça a primeira impressão contar.',
    description: 'Avaliação da bio, destaques e publicações fixadas.',
    icon: 'UserRound',
    group: 'Analisar',
    inputLabel: 'Como está o seu perfil hoje?',
    placeholder:
      'Cole seu @perfil, nome, bio, destino do link, nomes dos destaques e descrição dos posts fixados e capas. Diga quem você quer atrair.',
  },
  {
    id: 'ig-audit',
    label: 'Resultados',
    subtitle: 'Aprenda com o que aconteceu.',
    description: 'Análise dos dados reais das suas publicações.',
    icon: 'ChartNoAxesCombined',
    group: 'Analisar',
    inputLabel: 'Cole seus resultados',
    placeholder:
      'Inclua por publicação: tema, formato, visualizações, alcance, envios, salvamentos e retenção, quando disponíveis. Dados ausentes serão identificados.',
  },
  {
    id: 'ig-viral',
    label: 'Referências',
    subtitle: 'Encontre o que vale estudar.',
    description: 'Ranking de Reels pelos dados que você fornecer.',
    icon: 'TrendingUp',
    group: 'Analisar',
    inputLabel: 'Cole os dados das suas referências',
    placeholder:
      'Cole uma tabela CSV ou TSV com: account, views, median, hook. Uma linha por Reel. A median é a mediana recente daquele perfil; não substituímos dados ausentes por números inventados.',
  },
];

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILLS.find(skill => skill.id === id);
}
