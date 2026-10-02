// Adapted from klebertanide/instagram-agent-skill web/ @6c91976 (MIT, Jake Schincariol).
// Curated web workflows; formula and rubric data remain from the MIT-licensed skill pack.
import type { SkillId } from './types';

export const SKILL_GUIDES: Record<SkillId, string> = {
  'ig-audit': [
    'Analise somente os resultados de publicações que o usuário informou como publicados. Separe dados observados, cálculos sustentados por esses dados e hipóteses editoriais.',
    'Quando os dados permitirem, compare desempenho relativo à mediana do próprio perfil, envios por alcance, seguidores por alcance e retenção. Se faltar o denominador, diga que a comparação não pode ser calculada; não estime um valor.',
    'Identifique padrões entre conteúdos mais fortes e mais fracos por tema, formato, abertura e desenvolvimento. Relacione cada conclusão à evidência fornecida e destaque limitações de uma amostra pequena.',
    'Entregue diagnóstico e prioridades práticas: o que continuar, ajustar e deixar de repetir. Não invente histórico, métricas, causas certas ou promessas de alcance. Não transforme a auditoria em um calendário.',
  ].join(' '),
  'ig-caption': [
    'Escreva uma legenda coerente com a publicação e o objetivo informado. Se o vídeo já entrega a história, complemente sem recontar tudo; se a imagem exige contexto, explique o ponto principal.',
    'Abra com uma frase concreta que faça sentido antes do corte do feed. Use parágrafos curtos, termos de busca naturais e uma única chamada para ação pertinente.',
    'Use no máximo cinco hashtags específicas ao assunto ou nenhuma. Evite etiquetas genéricas de alcance e não prometa que um link no corpo será clicável.',
    'Preserve os fatos e a voz do perfil. Entregue a legenda pronta para revisar; as contagens, a prévia do feed e os avisos são calculados pelo servidor. Não escreva uma certificação de aprovação nem uma pontuação nas notas.',
  ].join(' '),
  'ig-carousel': [
    'Transforme uma ideia com sequência em um carrossel: capa curta com uma promessa sustentada pelo contexto, motivo para continuar, desenvolvimento, recapitulação e uma única chamada para ação.',
    'Cada slide apresenta uma ideia e deve ser legível no celular. Prefira títulos curtos e pouco texto de apoio. A segunda página precisa fazer sentido como uma nova entrada para o assunto.',
    'Preencha slides com os títulos e textos completos. Use content para a legenda complementar; não duplique o carrossel como um bloco extenso de texto. Pode sugerir texto alternativo e escolhas visuais nas notas.',
    'Use somente resultados, preços, depoimentos e exemplos fornecidos. Uma ilustração genérica não pode parecer uma experiência real do usuário. As imagens são exportadas pelo aplicativo; não afirme ter criado ou publicado arquivos.',
  ].join(' '),
  'ig-comment': [
    'Leia a publicação fornecida e escolha intervenções específicas: acrescentar um dado confirmado, apontar uma condição ausente, discordar com respeito, desenvolver uma frase, fazer uma pergunta real, relatar uma experiência fornecida, corrigir um fato verificável, mudar o enquadramento ou fazer uma observação breve pertinente.',
    'Entregue duas opções de tipos diferentes e indique nas notas qual melhor acrescenta à conversa. Em uma lista de publicações, escreva um comentário adequado a cada uma sem confundir seus contextos.',
    'Use linguagem curta e natural, uma ideia por comentário, sem elogio genérico, repetição da publicação, venda ou emoji como resposta inteira.',
    'Não invente experiência pessoal, relação com o autor, estatísticas ou correções sem evidência. Não afirme ter visto material que não foi fornecido nem ter publicado o comentário.',
  ].join(' '),
  'ig-dm': [
    'Escreva para uma pessoa e um motivo concreto informados no contexto. Distinga entrega por palavra-chave, resposta a uma interação, conversa já iniciada e proposta de colaboração.',
    'Na entrega de um material prometido, ofereça o material ou link fornecido antes de qualquer pergunta. Se o material estiver ausente, identifique a lacuna sem fabricar um destino.',
    'Em uma abordagem com contexto, faça referência somente à interação relatada e proponha um próximo passo pequeno. Em uma colaboração, explique a ideia, o benefício para a outra pessoa e a contribuição esperada de cada parte.',
    'Quando solicitados, prepare no máximo dois acompanhamentos: um acrescentando algo útil e outro encerrando sem pressão. Não invente prazos, intimidade, disponibilidade ou taxas de resposta. Entregue mensagens para envio manual, sem afirmar que já foram enviadas.',
  ].join(' '),
  'ig-human': [
    'Reescreva o texto para ficar natural na voz e no idioma do perfil, preservando integralmente significado, fatos, nomes, números, links e intenções.',
    'Remova fórmulas vazias, preâmbulos dispensáveis e vocabulário artificial. Varie a construção quando isso melhorar a leitura, sem acrescentar histórias ou dados para produzir uma aparência de especificidade.',
    'Mantenha caracteres necessários ao idioma, às marcas e aos emoji. Não apague junções ou sinais legítimos como se fossem prova de autoria automática.',
    'Entregue o texto revisado completo em content e observações breves sobre mudanças relevantes ou trechos que exigem informação do usuário. Não atribua score humano, veredito de detector, selo de aprovação ou garantia de indetectabilidade.',
  ].join(' '),
  'ig-plan': [
    'Planeje os próximos dias a partir da oferta, público, disponibilidade, temas e acontecimentos reais informados. Distribua ideias específicas entre ensino, opinião, história, prova e oferta quando houver material para cada propósito.',
    'Varie os formatos conforme a ideia: processos que precisam ser relidos podem virar carrosséis; histórias e demonstrações podem virar Reels; bastidores e conversas podem virar Stories.',
    'Preencha schedule somente com o plano desta ferramenta, usando datas válidas ancoradas na data atual e no fuso fornecidos pelo servidor. Para cada item, indique formato, título e ideia executável. Use content para explicar o plano e suas prioridades.',
    'Sugira relacionamento com perfis apenas quando eles forem fornecidos; caso contrário, descreva critérios para escolher esses perfis. Não invente contas, resultados, horários ideais ou histórico de publicações. Planejar não significa publicar ou agendar no Instagram.',
  ].join(' '),
  'ig-profile': [
    'Avalie o perfil somente a partir da descrição fornecida: nome pesquisável, bio, destinatário da oferta, prova, chamada para ação, link, destaques, publicações fixadas e leitura da grade.',
    'Use os critérios e pesos de PROFILE_RUBRIC fornecidos pelo servidor. Justifique cada avaliação com um trecho ou elemento observado; marque os aspectos ausentes como não avaliáveis e não atribua pontos com base em suposições.',
    'Priorize as mudanças com maior impacto sobre a clareza: nome, abertura da bio, destino do link e papéis dos conteúdos fixados. Entregue versões de texto prontas para adaptar à informação conhecida.',
    'Não invente credenciais, promessas, depoimentos, resultados ou uma inspeção visual que não ocorreu. Diferencie uma avaliação editorial da medição real de conversão; não copie pontuações prontas nem certifique melhora de desempenho.',
  ].join(' '),
  'ig-reel': [
    'Desenvolva uma única ideia verdadeira em um roteiro que possa ser falado naturalmente. A primeira frase deve apresentar a promessa ou tensão; o desenvolvimento entrega o que foi prometido e termina com uma única ação pertinente.',
    'Use as fórmulas de abertura fornecidas como estruturas, preenchendo-as apenas com os fatos do contexto e do perfil. Prepare três aberturas de estruturas diferentes nas notes e escolha uma para iniciar content.',
    'Content contém somente o roteiro falado, uma fala por linha. Notes pode sugerir texto curto para aparecer na tela, mudanças de imagem e uma retomada da abertura no final, sem fingir que existe filmagem fornecida.',
    'Não inclua percentuais derivados, receita, clientes, histórias ou resultados que não foram informados. Não gere slides nem plano semanal nesta ferramenta. Não declare duração exata, pontuação de gancho, STRONG, score humano ou PASS: a aplicação calcula somente as verificações que realmente executar.',
  ].join(' '),
  'ig-reply': [
    'Organize apenas os comentários fornecidos em palavras-chave, oportunidades de ajuda, contribuições substantivas, perguntas, apoio e ruído. Preserve a identificação de cada pessoa e responda em ordem de utilidade.',
    'Entregue respostas prontas que atendam à questão real. Uma palavra-chave deve receber o material ou orientação prometidos quando fornecidos; uma pessoa com um problema deve receber ajuda pública antes de um convite opcional para conversar.',
    'Reconheça a parte válida de uma crítica antes de esclarecer o restante. Para apoio, use uma resposta breve; para spam ou provocação, pode recomendar não responder. Não atribua comportamento ou intenção como fato sem evidência.',
    'Destaque nas notas perguntas que podem render um conteúdo próprio, sem produzir automaticamente esse Reel. Não invente comentários, nomes, quantidades, curtidas, links ou histórias do usuário. As respostas são rascunhos, não mensagens publicadas.',
  ].join(' '),
  'ig-repurpose': [
    'Leia o material fornecido e extraia afirmações, números existentes, cenas, mecanismos, erros relatados e frases que possam funcionar de forma independente. Preserve a atribuição e o sentido de cada trecho.',
    'Proponha peças completas com entradas variadas: uma história ou afirmação pode virar Reel, um processo pode virar carrossel e uma frase ou bastidor pode virar Story. Não substitua esse trabalho por um resumo genérico da fonte.',
    'Escreva as peças solicitadas em content e use notes para explicar formatos e trechos de origem. Se não houver conteúdo suficiente para várias peças distintas, diga isso sem preencher com fatos novos.',
    'Não invente transcrição, duração, contagem de palavras, posições em vídeo, reações, números ou cenas. Não abra calendário nem preencha slides ou schedule para esta ferramenta; essas estruturas pertencem às respectivas ferramentas de criação.',
  ].join(' '),
  'ig-story': [
    'Crie uma sequência curta de quadros a partir da situação informada: abertura com contexto real, desenvolvimento, interação pertinente e fechamento. Descreva em content o que aparece na tela, a fala e o recurso sugerido em cada quadro.',
    'Use uma ideia por quadro e linguagem de conversa com uma pessoa. Escolha enquete para uma escolha simples, caixa de perguntas para ouvir a linguagem do público, quiz para ensinar ou link apenas quando houver um destino fornecido.',
    'Uma oferta deve ter contexto e prova disponível antes do convite. Não invente bastidor, reação, urgência, prazo, evento ou resultado para tornar a história interessante.',
    'Explique como responder às interações nas notes sem presumir respostas já recebidas. A conversa pode começar com quem interagiu, mas não proponha envios indiscriminados. Não preencha slides de carrossel nem um plano semanal.',
  ].join(' '),
  'ig-viral': [
    'Interprete somente os dados de referências fornecidos e os rankings calculados pelo servidor. Compare visualizações à mediana recente de cada próprio perfil, preservando o indicador quando a mediana estiver ausente.',
    'Explique a diferença entre volume bruto e desempenho relativo. Observe padrões nos ganchos e assuntos dos exemplos fornecidos, diferenciando observação, hipótese e limitação da amostra.',
    'Entregue uma síntese útil e sugestões de adaptação aos fatos conhecidos do usuário. Uma fórmula de abertura pode ser sugerida, mas não se pode copiar um resultado alheio como se fosse do usuário.',
    'Não invente contas, vídeos, datas, medianas, múltiplos, pontuações, URLs ou coleta na internet. Não declare que um formato vai viralizar. Use content e notes, sem slides nem calendário semanal.',
  ].join(' '),
};

export const HOOK_FORMULAS = [
  {
    id: 1,
    name: 'Cost Confession',
    template: '{Specific amount} is what {one mistake} cost me.',
    example: '$18,000 is what one missing clause cost me.',
    on_screen: '$18,000 MISTAKE',
    best_for:
      'Trust, fast. People finish the videos where you are the one who looks bad.',
    trap: "A fake cost. 'It cost me my peace of mind' is not a number and everybody can hear that.",
    match:
      '\\$\\s?\\d[\\d,]*\\s+(?:is|was) what\\b|\\bcost (?:me|us|him|her|them)\\b|\\blost\\b[^.!?]{0,20}\\$\\s?\\d',
  },
  {
    id: 2,
    name: 'Negative Command',
    template: 'Stop {common action}. Do {alternative} instead.',
    example:
      'Stop posting three times a day. Post twice and reply to every comment for an hour.',
    on_screen: 'STOP POSTING DAILY',
    best_for:
      'Saves and arguments. The imperative gets attention that a statement does not.',
    trap: 'Telling people to stop doing something nobody does. The habit has to be one the viewer recognises in themselves.',
    match:
      "^\\s*(?:stop|quit|never|don'?t|dont|please)\\b[^.!?]{0,30}\\b(?:do|be|make|buy|use|start|say|post|send|take|charge)?\\b|\\b(?:do not|don'?t|dont|never) (?:do|be|make|buy|use|start|say|post|take)\\b|\\bquit your\\b",
  },
  {
    id: 3,
    name: 'Nobody Tells You',
    template:
      'Nobody tells you that {uncomfortable truth about the thing they want}.',
    example: 'Nobody tells you that your first 30 reels are supposed to flop.',
    on_screen: 'YOUR FIRST 30 WILL FLOP',
    best_for:
      'New audiences. It positions you as the person who says the quiet part.',
    trap: 'Picking a truth everybody already says. If the comments are agreeing before you finish, it was not a secret.',
    match:
      '\\b(?:nobody|no one|nobody ever)\\s+(?:ever\\s+)?(?:tells|told|talks|talked|says|said|mentions|teaches)\\b|\\bwhat (?:nobody|no one) (?:tells|says)\\b',
  },
  {
    id: 4,
    name: 'The Replacement',
    template: '{This thing} replaced {expensive thing} for {price}.',
    example: 'This $12 tool replaced the editor I was paying $2,000 a month.',
    on_screen: '$2,000 -> $12',
    best_for: 'Demos and tool videos. The price gap does the work.',
    trap: 'Overstating the replacement. If it replaced 60% of the job, say 60%, or the comments will say it for you.',
    match:
      '\\breplaced?\\b[^.!?]*\\$\\s?\\d|\\$\\s?\\d[^.!?]*\\breplaced?\\b|\\binstead of (?:paying|hiring)\\b',
  },
  {
    id: 5,
    name: 'Time Collapse',
    template: 'This used to take me {long time}. It now takes {short time}.',
    example:
      'Proposals used to take me five hours. They take twenty minutes now.',
    on_screen: '5 HOURS -> 20 MIN',
    best_for:
      'Process videos where the payoff is speed. Reads instantly on screen.',
    trap: 'A ratio nobody believes. 40 hours to 4 seconds gets treated as a lie even when it is true.',
    match:
      '\\bused to take\\b|\\bnow (?:it )?(?:only )?takes?\\b|\\btakes? (?:me )?\\d+\\s*(?:sec|second|min|minute|hour|hr)',
  },
  {
    id: 6,
    name: 'The Receipt',
    template: 'I {did thing} for {N days}. Here are the actual numbers.',
    example:
      'I posted one reel a day for 60 days. Here is what it did to my DMs.',
    on_screen: '60 DAYS. REAL NUMBERS.',
    best_for:
      'Experiments. Pairs with a screen recording of the real dashboard, which is the whole value.',
    trap: 'Not showing the screen. A numbers video with no screen recording is a numbers claim.',
    match:
      "\\bi\\s+\\w+(?:ed)?\\s+[^.!?]{0,30}\\bfor\\s+\\d+\\s+(?:days?|weeks?|months?|years?)\\b|\\bhere (?:are|is) (?:the|my)\\b[^.!?]*\\bnumbers\\b|\\bwe(?:'ll| will)? do \\$\\s?\\d",
  },
  {
    id: 7,
    name: 'Wrong Way, Right Way',
    template:
      'You are doing {thing} wrong, and it is not your fault. {The fix}.',
    example:
      'You are writing captions wrong, and it is not your fault. Instagram hides everything after line one.',
    on_screen: 'YOUR CAPTIONS ARE CUT',
    best_for:
      "Teaching. The 'not your fault' half stops it reading as an insult, which is what kills this one.",
    trap: "Skipping the absolution. 'You are doing it wrong' on its own makes people leave rather than learn.",
    match:
      "\\b(?:big(?:gest)?|common|the) mistake\\b|\\bmistake (?:that|people|i)\\b|\\byou'?(?:re| are) doing\\b[^.!?]*\\bwrong\\b|\\bdoing (?:it|this) wrong\\b",
  },
  {
    id: 8,
    name: 'Insider Leak',
    template:
      'I spent {N years} {inside the thing}. Here is what we never said out loud.',
    example:
      'I spent six years selling agency retainers. Here is what we never put in the proposal.',
    on_screen: '6 YEARS INSIDE',
    best_for:
      'Authority without a credential slide. Works only if the years are real.',
    trap: 'Promising a secret and delivering the brochure. The comments are merciless about this one.',
    match:
      '\\bi (?:spent|worked|ran|was|have been)\\b[^.!?]*\\b\\d+\\s*\\+?\\s*years?\\b|\\bwe never (?:told|said|showed)\\b|\\bnobody (?:puts|tells you about)\\b|\\bi (?:sell|sold|run)\\b[^.!?]*\\$\\s?\\d',
  },
  {
    id: 9,
    name: 'The Steal',
    template: 'Steal this {artifact}. It took me {time} to get right.',
    example:
      'Steal this four-line follow-up. It took me two years and a lot of dead leads.',
    on_screen: 'STEAL THIS',
    best_for:
      'Saves and sends, which are the two metrics that move reach the most.',
    trap: 'The artifact not being on screen. If they cannot screenshot it, there is nothing to steal.',
    match:
      "^\\s*steal\\b|\\bsteal (?:this|these|my)\\b|^\\s*(?:here'?s|this is) (?:the|my) (?:exact|literal)\\b",
  },
  {
    id: 10,
    name: 'If This, Then Watch',
    template: 'If you {specific situation}, this {short time} fixes it.',
    example:
      'If your reels get views and no followers, the next 40 seconds fix it.',
    on_screen: 'VIEWS BUT NO FOLLOWERS?',
    best_for:
      'Qualifying hard. Fewer people stay, and the ones who do are the ones who buy.',
    trap: "A situation so broad it qualifies nobody. 'If you want to grow' is not a situation.",
    match: '^\\s*if (?:you|i|we|your|my|they)\\b',
  },
  {
    id: 11,
    name: 'Numbered With A Favourite',
    template: '{N} {things} that {outcome}. Number {k} is the one nobody uses.',
    example:
      'Five caption edits that double saves. Number four is the one nobody does.',
    on_screen: '5 EDITS. #4 IS THE ONE.',
    best_for:
      'Retention through the middle: naming a favourite gives people a reason to stay past three.',
    trap: 'N above seven. Nobody believes you have nine good ones, and you do not.',
    match:
      '^\\s*(?:here are\\s+)?\\d+\\s+\\w+|\\bnumber \\d+\\b|\\b(?:three|four|five|seven|ten)\\s+\\w+\\s+(?:every|that|you)\\b',
  },
  {
    id: 12,
    name: 'The Objection',
    template:
      '"{Objection they actually say}." Fine. Here is the version that works anyway.',
    example:
      '"I don\'t want to be on camera." Fine. Here is the faceless version that still sells.',
    on_screen: '"I HATE BEING ON CAMERA"',
    best_for: 'Selling to the people who already said no once.',
    trap: 'Inventing the objection. Pull it verbatim from a DM or a comment, including the bad grammar.',
    match:
      '^\\s*[\\"“\'][^\\"”\']{5,120}[\\"”\'][,.]?\\s*(?:fine|ok|okay|sure|right|here)',
  },
  {
    id: 13,
    name: 'Before And After, On Screen',
    template:
      '{Show the old thing}. {Show the new thing}. {One sentence on the lever}.',
    example:
      'This was my profile in March. This is it now. I changed the name field, nothing else.',
    on_screen: 'MARCH  /  NOW',
    best_for:
      'Anything visual. The cut between the two frames is the hook, the words are secondary.',
    trap: 'Three levers. Name one thing that changed or the transformation stops being believable.',
    match:
      '\\b(?:this|that) was\\b[^.!?]*[.!?]\\s*(?:this|that) is\\b|\\bbefore\\b[^.!?]*\\bafter\\b|\\bi (?:look|looked) back at\\b',
  },
  {
    id: 14,
    name: 'The Callout',
    template: '{Specific group}, this is the one you have been ignoring.',
    example:
      'Photographers charging under $2,000: this is the pricing page you have been avoiding.',
    on_screen: 'PHOTOGRAPHERS UNDER $2K',
    best_for:
      'Cutting a broad audience down to the one that converts. Send rate goes up because people tag each other.',
    trap: "A group so large it is not a callout. 'Entrepreneurs' is not a group.",
    match:
      '^\\s*(?:every|all|any)\\s+\\w+|^\\s*[a-z][\\w ]{2,28}(?:ers|ists|ors|ants)\\b\\s*[,:]|^\\s*for (?:viewers|people|anyone|those|everyone)\\b|^\\s*(?:attention|listen up)\\b',
  },
  {
    id: 15,
    name: 'The Flop Record',
    template:
      'My first {N} {attempts} did nothing. Here is what changed on {N+1}.',
    example:
      'My first 47 reels averaged 300 views. Number 48 did 400,000. One thing was different.',
    on_screen: '47 FLOPS, THEN THIS',
    best_for:
      'People at the start, which is most of the audience. High comment rate.',
    trap: "Making the change sound like luck. If the answer is 'I got lucky', there is no video.",
    match:
      '\\bmy first\\s+\\d+\\b|\\bfirst\\s+\\d+\\s+(?:reels?|videos?|posts?|clients?|months?)\\b',
  },
  {
    id: 16,
    name: 'The Verbatim Question',
    template: '"{Question exactly as it was asked}" - I get this every week.',
    example:
      '"How do I post consistently without hating it?" I get this one every week.',
    on_screen: 'ASKED EVERY WEEK',
    best_for:
      'Search. A question typed the way people type it is what Instagram search is matching against.',
    trap: 'Tidying the question up. The value is that it is in their words, typos and all.',
    match:
      "^\\s*[\\\"“']?(?:how|what|what'?s|why|when|where|who|which|can|should|do|does|did|is|are|have you|would you)\\b[^?]{3,110}\\?",
  },
  {
    id: 17,
    name: 'Head To Head',
    template:
      '{A} versus {B}. I ran both for {time} and one of them was not close.',
    example:
      'Carousels versus reels. I ran both for 90 days and it was not close.',
    on_screen: 'CAROUSELS vs REELS',
    best_for:
      'Comments. People arrive already holding an opinion, which is the point.',
    trap: 'Refusing to pick. A comparison with a diplomatic ending is a video with no ending.',
    match:
      '\\b(?:vs\\.?|versus)\\b|\\bdifferences? between\\b|\\b(?:a|the) or (?:b|the)\\b',
  },
  {
    id: 18,
    name: 'Cold Open Demo',
    template:
      '{Start mid-action, already doing the thing.} Watch what this does.',
    example:
      "Watch what happens when I paste a competitor's caption into this.",
    on_screen: 'WATCH THIS',
    best_for:
      'Screen recordings and anything with a visible result. No setup at all, the hand is already moving.',
    trap: 'A result that takes twelve seconds to arrive. If the payoff is slow, cut to it and show the wait afterwards.',
    match:
      '^\\s*watch (?:what|this|me)\\b|^\\s*(?:let me|lemme) show you\\b|^\\s*repeat after me\\b',
  },
  {
    id: 19,
    name: 'The Deadline',
    template: '{Thing} changes on {date}. Do {action} before then.',
    example:
      'Your top nine grid crops change the second you post a reel. Fix the covers first.',
    on_screen: 'BEFORE YOU POST AGAIN',
    best_for:
      'Urgency that is real. Platform changes, seasonal windows, policy updates.',
    trap: 'Manufactured urgency. One fake deadline and every future one is discounted.',
    match:
      '\\bbefore (?:you|it|they|the)\\b[^.!?]*\\b(?:change|changes|end|ends|close|closes|expires|goes)\\b|\\bchanges on\\b|\\bby 20\\d\\d\\b',
  },
  {
    id: 20,
    name: 'Permission',
    template: 'You do not need {the thing everyone says you need}.',
    example: 'You do not need a niche. You need one person you can name.',
    on_screen: "YOU DON'T NEED A NICHE",
    best_for:
      'Relief. Very high save rate, because it removes a blocker rather than adding a task.',
    trap: 'Removing the blocker and putting nothing in its place. The second half is the whole video.',
    match:
      "\\byou (?:do not|don'?t|dont) need\\b|\\bstop (?:trying to|worrying about)\\b",
  },
  {
    id: 21,
    name: 'Mid-Sentence Start',
    template: '{...and that is when {the turn}.}',
    example:
      '...and that is when the client asked for the money back. Three days after approving it.',
    on_screen: 'HE ASKED FOR A REFUND',
    best_for:
      'Stories. Starting mid-scene makes the viewer feel they arrived late, which is a reason to stay.',
    trap: 'Never going back to fill in the gap. Deliver the setup by second eight or it reads as a mistake.',
    match:
      "^\\s*(?:\\.\\.\\.|…)|^\\s*(?:and (?:that'?s|that is|then) when|so (?:he|she|they) (?:said|asked))\\b|^\\s*(?:uh|um)\\b",
  },
  {
    id: 22,
    name: 'Contrarian Flip',
    template: '{Well-known saying, inverted.}',
    example: 'Nice guys finish first.',
    on_screen: 'NICE GUYS FINISH FIRST',
    best_for:
      'Comments. The viewer has to stop and check whether they misheard you.',
    trap: 'Flipping a saying nobody says. The original has to be a reflex, or the inversion is just a sentence.',
    match:
      "^\\s*[A-Za-z][\\w' ]{2,34}\\b(?:finish|finishes|win|wins|lose|loses|beats?|is|are)\\s+(?:first|last|dead|wrong|right|better|overrated|underrated)\\b",
  },
  {
    id: 23,
    name: 'The Statistic',
    template: '{N}% of {group} {surprising fact}.',
    example: '33% of high school graduates never read another book.',
    on_screen: '33% NEVER READ AGAIN',
    best_for:
      'Sends. A number a person can repeat at dinner gets sent to somebody.',
    trap: 'A statistic you cannot source. Say where it came from in the video or do not use it.',
    match: '^\\s*\\d[\\d,.]*\\s?%|\\b\\d[\\d,.]*\\s?%\\s+of\\b',
  },
  {
    id: 24,
    name: 'The Reveal',
    template: 'This is the new {thing}.',
    example:
      'This is the new Sony point and shoot, and it fixes the one thing I hated.',
    on_screen: 'THE NEW ONE',
    best_for:
      'Anything physical or visual. The object is the hook and the words are captions on it.',
    trap: 'Holding the thing up without saying what it changes. A reveal with no stake is an advert.',
    match:
      '^\\s*(?:so,?\\s+)?(?:this|these|here) (?:is|are)\\s+(?:the\\s+)?(?:new|my new)\\b|^\\s*(?:so,?\\s+)?this (?:new|tiny|little)\\b|^\\s*this \\w+ has (?:the|a)\\b',
  },
  {
    id: 25,
    name: "Someone Else's Result",
    template: 'There was one {person} who {outcome} in {time}.',
    example:
      'There was one creator who grew a million subscribers in a single month.',
    on_screen: '1M SUBS IN ONE MONTH',
    best_for:
      'Proof when the user does not have their own number yet. Third-person is allowed if it is true.',
    trap: 'No name and no link. An anonymous miracle is a rumour.',
    match:
      '\\bthere (?:was|is) (?:one|a|this)\\b|\\b(?:one|a) (?:guy|girl|creator|student|founder|kid|client|friend) (?:i know |who |that )(?:\\w+ed|grew|made|built|went|took|got|hit)\\b|\\bwe had a new\\b',
  },
  {
    id: 26,
    name: 'The Superlative',
    template: 'The {fastest / biggest / only} {thing} is {the answer}.',
    example:
      'The fastest way to get confident is to build evidence you cannot argue with.',
    on_screen: 'THE FASTEST WAY',
    best_for:
      'One-claim videos with no story attached. It is the most common shape in the wild and the easiest to write badly.',
    trap: "A superlative with a soft answer. If the second half is 'consistency', you have said nothing and the comments will tell you.",
    match:
      '^\\s*(?:the\\s+)?(?:fastest|quickest|best|worst|biggest|greatest|easiest|hardest|only|number one|#1|most important)\\s+\\w+|\\bthe (?:fastest|best|worst|biggest|greatest|only) way to\\b',
  },
];

export const PROFILE_RUBRIC = {
  version: '1.0',
  total: 100,
  note: 'Twelve items. Score each honestly - a generous score helps nobody. Most first-pass profiles land in the 30s and 40s. The weighting is deliberate: the name field, the first bio line and the pinned three are worth more than the photo, because they are what a stranger who arrived from one reel actually processes before deciding to follow.',
  items: [
    {
      id: 'name_field',
      points: 12,
      full_marks:
        "The name field (30 characters, the bold line, not the handle) carries the name plus what they do in words people search: 'Dana Ruiz | Proposal templates'. This field is indexed by Instagram search and most accounts waste it on a name alone.",
      common_fail: 'Just a name, or a name with an emoji.',
    },
    {
      id: 'bio_first_line',
      points: 12,
      full_marks:
        'Line one names who this is for and what changes for them, in their words. Not a job title, not a list of adjectives, not three emoji separated by bars.',
      common_fail: "'Entrepreneur | Coffee lover | Dog dad'.",
    },
    {
      id: 'bio_body',
      points: 8,
      full_marks:
        'The rest of the 150 characters carries one piece of proof or one specific offer, and reads as sentences rather than a pipe-separated list.',
      common_fail: 'Keyword soup, or blank space.',
    },
    {
      id: 'pinned_three',
      points: 10,
      full_marks:
        'Three posts pinned to the top of the grid, doing three different jobs: the best proof, the clearest explanation of the offer, and the best introduction to the person. Not the three highest-view posts by accident.',
      common_fail:
        'Nothing pinned, so the top of the grid is whatever was posted last.',
    },
    {
      id: 'link',
      points: 8,
      full_marks:
        'One destination that matches what the bio just promised. Up to five links are allowed; more than two is a menu, and a menu converts worse than a door.',
      common_fail: 'A link tree with eleven options, or no link at all.',
    },
    {
      id: 'highlights',
      points: 8,
      full_marks:
        'Four to six highlights named for the questions a buyer actually asks: Pricing, Results, How it works, About. Covers consistent. Nothing older than a year sitting at the front.',
      common_fail: "'Random', 'Life', 'Faves', or 14 highlights in no order.",
    },
    {
      id: 'grid_legibility',
      points: 8,
      full_marks:
        'The first nine covers are legible at thumbnail size and say what the account is about without a single tap. Reel covers are chosen deliberately, not left as frame one.',
      common_fail: 'Nine covers of a face mid-word with no text.',
    },
    {
      id: 'photo',
      points: 6,
      full_marks:
        'Face fills roughly 60% of a circle that renders at about 40 pixels. Eyes visible, shot in the last two years, background not competing.',
      common_fail:
        "A full-body shot, a logo for a personal brand, or a photo taken at arm's length in a dark room.",
    },
    {
      id: 'handle',
      points: 6,
      full_marks:
        'Readable, sayable out loud, and the same handle as the other platforms. No stacked underscores or numbers standing in for letters.',
      common_fail: 'A handle nobody can spell after hearing it once.',
    },
    {
      id: 'category_contact',
      points: 6,
      full_marks:
        'Professional account with a category that matches the offer, and contact buttons that work. Email that is checked, not the one from 2019.',
      common_fail:
        'Personal account, so there are no insights and no contact button.',
    },
    {
      id: 'recent_activity',
      points: 10,
      full_marks:
        'Posted in the last seven days and replied to comments on the most recent post. An account that last posted in March reads as closed.',
      common_fail: 'A five-week gap, or a wall of unanswered comments.',
    },
    {
      id: 'story_presence',
      points: 6,
      full_marks:
        'A story up right now, or at least most days. It is the difference between a profile and a person.',
      common_fail: 'No ring, ever.',
    },
  ],
};
