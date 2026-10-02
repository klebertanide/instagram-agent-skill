# Instagram Studio

**Primeira implantação AppDeploy:** https://instagram-studio-h5j8fs.v2.appdeploy.ai/

**Estado observado em 02/10/2026 (UTC):** a plataforma passou a responder
`402 APP_TEMPORARILY_UNAVAILABLE`, inclusive no healthcheck. A nova revisão de
prompts e validação factual está neste repositório e ainda não foi implantada:
o AppDeploy bloqueou novos deploys por créditos até 03/10/2026 às 00:00 UTC.
Uma hospedagem alternativa está sendo preparada no Lovable.

Os dados públicos de implantação ficam em [deployment.json](deployment.json).

Interface em português para criar e organizar conteúdo de Instagram no navegador.
O aplicativo oferece as 13 ferramentas do pacote de skills, perfil de voz,
revisão de texto, biblioteca e calendário. A pessoa que usa o aplicativo não
precisa instalar o Codex, abrir um terminal, conectar o Instagram ou fornecer
uma chave de API. O conteúdo é preparado para revisão e publicação manual.

Esta pasta contém um aplicativo complementar. As skills, os scripts Python e
o instalador do repositório continuam disponíveis e independentes. O aplicativo
web não executa o Codex nem sincroniza automaticamente arquivos `voice.md`.

## Uso

1. Em **Minha voz**, salve sua marca, público, tom, exemplos e fatos confirmados.
2. Em **Criar**, escolha uma ferramenta e forneça contexto. A geração usa seu
   perfil; a revisão apresenta verificações executadas no servidor sobre o
   texto informado.
3. Revise o resultado, copie ou baixe o texto e salve o rascunho na biblioteca.
   Carrosséis também permitem baixar imagens PNG de 1080×1350 por slide.
4. Em **Biblioteca**, edite título e conteúdo, escolha o status e uma data
   planejada. **Calendário** organiza os rascunhos; ele não agenda publicações
   no Instagram. Datas são tratadas em `America/Sao_Paulo`.
5. Em **Seu espaço**, guarde seu código de acesso se quiser recuperar os dados
   em outro navegador. O código permite abrir esse espaço e deve permanecer
   privado. A recuperação não exige conta, email ou senha do Instagram.

Cada visitante recebe um espaço anônimo com uma credencial opaca. Sem o código
de acesso, outro navegador inicia um espaço separado. O perfil e os rascunhos
ficam na nuvem; o navegador conserva a credencial do espaço e produz os arquivos
que você escolhe baixar. Criar outro espaço não exclui o anterior.

Os prompts usam somente guias editoriais e templates, sem fatos preenchidos de
exemplo. Uma verificação conservadora rejeita quantidades factuais sem apoio no
contexto ou em `proof`, e o servidor tenta reescrever uma vez. Isso não prova a
veracidade completa da narrativa: a pessoa deve revisar o conteúdo. Arrays de
slides e plano semanal são limitados às ferramentas correspondentes.

Os resultados devem preservar o idioma e os fatos fornecidos. Números, clientes e
resultados desconhecidos devem permanecer identificados como informações
ausentes. **Referências** analisa dados que você fornecer; não coleta Reels nem
afirma ter pesquisado o Instagram. Os indicadores de escrita são heurísticas,
não previsões de alcance nem certificação de que um texto foi escrito por uma
pessoa.

## Arquitetura

O frontend usa React/Vite e chama exclusivamente o transporte `api` de
`@appdeploy/client`. O backend Node/TypeScript usa `router`, `json`, `error`,
`ai` e `db` de `@appdeploy/sdk`. O AppDeploy fornece esses pacotes durante a
execução; eles não são dependências publicadas em `package.json`.

A geração por IA, as análises determinísticas e a persistência executam no
servidor. O catálogo e os tipos compartilhados ficam em `shared/`. O navegador
apresenta os resultados e renderiza os slides para exportação PNG; ele não
guarda chaves de provedores de IA. Cada operação verifica a credencial do espaço
antes de ler ou escrever dados, e os registros são separados por espaço. As
leituras são paginadas e os tamanhos de entrada e registros são limitados.

| Família de rota | Responsabilidade |
| --- | --- |
| `POST /api/workspace` | Criar um espaço ou abrir um existente com seu código. |
| `POST /api/profile` | Ler e salvar o perfil de voz do espaço. |
| `POST /api/generate` | Gerar conteúdo para a ferramenta escolhida usando IA no servidor. |
| `POST /api/analyze` | Revisar texto e ordenar referências a partir dos dados fornecidos. |
| `POST /api/drafts` | Listar, criar, atualizar e excluir rascunhos do espaço. |

O endpoint de saúde pertence à infraestrutura e não é um fluxo de produto.
O aplicativo não publica, comenta, segue perfis nem envia mensagens no
Instagram. Copiar e exportar entregam arquivos e texto para uso manual.

## Desenvolvimento e verificação

O frontend parte do scaffold `react-vite` do AppDeploy; o deploy precisa usar
`frontend+backend`. Consulte [AGENTS.md](AGENTS.md), `shared/types.ts` e os
contratos atuais do SDK antes de alterar integrações. Build e execução precisam
de um ambiente que forneça os pacotes do AppDeploy; um `npm install` isolado
não substitui essa integração nem o backend.

```bash
# Em um ambiente com os pacotes AppDeploy fornecidos:
cd web
npm install
npm run build
```

Os testes do motor podem ser executados sem os SDKs da plataforma com `npm ci` e
`npm test`. Eles cobrem limites, datas, Unicode, voz e análise de texto/dados.

Os cenários de QA de produto ficam em [tests/tests.json](tests/tests.json), no
formato nativo do AppDeploy. Os cinco cenários são independentes e cobrem:

- Análise determinística e rascunho conservado na nuvem, como cenário prioritário.
- Perfil de voz e biblioteca, recuperação entre navegadores, credencial inválida
  e isolamento entre espaços.
- Geração de Reel, cópia, download, edição, planejamento e exclusão confirmada.
- Navegação pelas 13 ferramentas e exportação de imagens PNG de carrossel.
- Entrada vazia e erro de geração com nova tentativa no celular.

Somente um cenário tem `sanity: true`. O teste de falha usa `qa_faults` para
injetar uma resposta 503; ele verifica a nova tentativa e a preservação do
contexto, sem exigir sucesso enquanto a falha estiver ativa. Os testes não
exigem atrasos artificiais nem estados transitórios de carregamento.

Antes de publicar, execute as verificações de TypeScript/build, os testes
significativos do backend e a QA nativa. Confira também as rotas, a credencial
por espaço, a paginação, os downloads reais e os controles no celular. O
AppDeploy mantém o snapshot implantado como fonte do aplicativo em execução;
atualizações devem incluir somente arquivos alterados e preservar os testes
JSON.
