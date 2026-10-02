# Instagram Studio — aplicativo na nuvem

Use o aplicativo em **https://instagram-studio.lovable.app**. Ele oferece treze ferramentas editoriais, perfil de voz, biblioteca de rascunhos, calendário e exportação de carrosséis como PNG. O usuário usa o navegador; a instalação das skills do Codex continua independente em [`../README.pt-BR.md`](../README.pt-BR.md).

O site é público. Cada espaço de trabalho é privado e acessível pelo seu código `workspaceId.accessKey`, sem conta ou login. O navegador conserva esse código; o servidor guarda seu hash SHA-256 e verifica o acesso antes de ler ou alterar perfil e rascunhos. Guarde uma cópia do código para recuperar o espaço em outro navegador. Quem possui o código pode abrir o espaço.

## Uso

1. Em **Minha voz**, informe público, tom, exemplos de escrita e fatos confirmados.
2. Em **Criar**, escolha a ferramenta, forneça contexto e gere ou revise o conteúdo.
3. Confira texto e observações, copie ou baixe o resultado e salve um rascunho.
4. Em **Biblioteca**, edite conteúdo, status e data planejada; acompanhe os rascunhos em **Calendário**.
5. Em **Seu espaço**, copie o código ou abra um espaço existente.

A IA deve usar os fatos fornecidos, sem inventar métricas, clientes ou resultados. A revisão determinística calcula verificações editoriais e compara referências com as medianas informadas. Esses cálculos orientam a revisão; não prometem alcance ou aprovação por detectores de IA. A publicação no Instagram é manual.

## Arquitetura

- **TanStack Start, React e TypeScript**: rotas, componentes e funções de servidor.
- **Tailwind CSS e componentes Radix/shadcn**: interface responsiva.
- **Lovable Cloud/Supabase**: persistência do perfil e dos rascunhos. Tabelas com RLS e sem políticas públicas; acesso pelo servidor com service-role, após validar a credencial do espaço.
- **IA no servidor**: Responses API pelo gateway do Lovable, em `src/lib/ai.server.ts`. Credenciais de IA e service-role não são enviadas ao navegador.
- **Núcleo editorial**: `src/lib/core/` preserva o código do pacote de skills; adaptações ficam em `src/lib/core-adapter.ts`. Análises e testes puros funcionam sem banco ou IA.
- **Exportação**: texto e PNG são produzidos no navegador. O aplicativo não publica posts, comentários ou mensagens.

## Desenvolvimento e validação

Use Node.js 24 e Bun 1.4.2. O lockfile desta fonte é `bun.lock`.

```sh
cd cloud
bun install --frozen-lockfile
bun run test
bunx tsc --noEmit
bun run build
```

Esses quatro comandos foram validados sem arquivos de ambiente ou credenciais: **66 testes passaram**, o TypeScript passou e o build de produção passou. Os testes cobrem análise, domínio, fundamentação factual, adaptação editorial e regressões. Fluxos completos com banco e IA dependem de um ambiente Cloud configurado.

Para desenvolver em um ambiente configurado, use `bun run dev`. Os scripts também incluem `test:watch`, `preview` e `lint`. O lint original possui erros de formatação, inclusive no núcleo vendorizado; não integra o conjunto de verificações verdes acima. Evite `format` ou correções automáticas sobre `src/lib/core/` e `src/test/core/`, que devem permanecer comparáveis à fonte original.

O `.env` do projeto não foi lido nem exportado. Para executar o aplicativo completo fora do Lovable, configure seu próprio backend e suas próprias variáveis. Apenas os nomes necessários estão documentados aqui:

| Ambiente | Variáveis |
| --- | --- |
| Cliente, configuração pública | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Servidor | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` |
| Operação separada de migração | `LOVABLE_DB_MIGRATION_URL` |

Mantenha service-role, chave de IA e URL de migração apenas no servidor. As migrações SQL estão em `drizzle/migrations/`; migrações não fazem parte dos testes ou do CI padrão e podem alterar o banco.

## Origem desta exportação

Fonte do projeto Lovable `bb8f79c5-e028-4e65-9cee-488adc28a7e6`, commit **`91bd17b24e6cb27d1206ff94eb5610847c8c6899`**. A leitura usou essa revisão fixa para todos os arquivos.

O README original foi preservado como [`README.lovable.md`](README.lovable.md). Ajustes exclusivos da exportação: este README, metadados em [`EXPORT.json`](EXPORT.json), ignores de arquivos de ambiente e remoção de `src/test/app-routing.test.tsx`. Esse teste do scaffold verificava apenas um contêiner não vazio e falhava com a raiz HTML do TanStack Start; os 66 testes editoriais e de regressão foram mantidos. O favicon público foi preservado em formato binário, obtido diretamente pelo navegador do aplicativo publicado.

O núcleo editorial deriva do [instagram-agent-skill de Jakeschincariol](https://github.com/Jakeschincariol/instagram-agent-skill), adaptado para Codex em [klebertanide/instagram-agent-skill](https://github.com/klebertanide/instagram-agent-skill). O crédito e a licença MIT estão preservados em [`src/lib/core/LICENSE`](src/lib/core/LICENSE) e na [licença do repositório](../LICENSE).

Leia [`AGENTS.md`](AGENTS.md) antes de alterar esta fonte. O projeto conectado ao Lovable não deve ter seu histórico publicado reescrito; alterações no núcleo vendorizado devem ser feitas por adaptação, preservando a fonte original.
