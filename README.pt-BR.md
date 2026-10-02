# Instagram Agent para Codex

Adaptação para Codex mantida por [Kleber Tanide](https://github.com/klebertanide),
baseada no [pacote original de Jake Schincariol](https://github.com/Jakeschincariol/instagram-agent-skill).

As 13 skills funcionam no Codex e continuam compatíveis com o Claude. Elas
criam roteiros, legendas, carrosséis, stories, planos, comentários e mensagens,
além de analisar dados que você fornecer. Os seis scripts Python executam
localmente, sem dependências externas ou chave da API do Instagram.

O pacote prepara o conteúdo. Você publica no Instagram.

## Use pelo navegador

Abra o [Instagram Studio](https://instagram-studio.lovable.app).
As 13 ferramentas estão disponíveis em um site com IA e revisão no servidor,
perfil de voz, biblioteca privada, calendário e exportação de carrosséis PNG.
Você não precisa instalar nada, usar o terminal ou configurar uma chave de API.

Comece em **Minha voz**, depois escolha uma ferramenta em **Criar**.
Em **Seu espaço**, guarde o código de acesso para abrir seus dados em outro
navegador. O conteúdo fica na nuvem; você revisa e publica no Instagram.

O código do site está em [cloud/](cloud/README.md). A hospedagem, o banco de
dados e a IA usam Lovable Cloud, na conta do mantenedor. O consumo segue os
limites e créditos da plataforma. A instalação das skills no Codex abaixo
continua disponível de forma independente.

A implementação anterior para AppDeploy está em [web/](web/README.md);
seu servidor ficou indisponível (HTTP 402) e não é a hospedagem atual.

## Instalação

Você precisa de Python 3.10 ou superior e de um cliente Codex com suporte a
skills. Clone este fork e execute o instalador:

```bash
git clone https://github.com/klebertanide/instagram-agent-skill.git
cd instagram-agent-skill
python3 scripts/install.py
```

No Windows, use `python` se esse for o nome do seu interpretador. O instalador
copia as 13 skills para `~/.agents/skills/` e cria seu perfil de voz em
`~/.agents/instagram/voice.md`, preservando arquivos existentes.

Abra uma nova sessão do Codex. No campo de mensagem, use:

```text
$ig-reel Crie um Reel sobre como reduzimos o tempo de proposta de 5 horas para 20 minutos.
```

O `$ig-reel` é uma chamada no **prompt do Codex**, não um comando de terminal.
Você também pode usar o seletor `/skills`, quando disponível, ou pedir a tarefa
em linguagem natural. No Claude, a chamada continua sendo `/ig-reel`.

Para instalar somente em um projeto:

```bash
python3 scripts/install.py --project /caminho/do/projeto
```

Nesse caso, as skills ficam em `.agents/skills/` e os dados em `.instagram/`.
Adicione `.instagram/` ao `.gitignore` do projeto se guardar informações privadas.
Os scripts funcionam mesmo quando o projeto ou a pasta instalada contém espaços.

Outras opções:

```bash
python3 scripts/install.py --dry-run
python3 scripts/install.py --force
python3 scripts/install.py --migrate-claude
python3 scripts/install.py --data-dir /caminho/do/perfil
python3 scripts/install.py --agent claude
```

`--dry-run` mostra o que será instalado. `--force` substitui skills existentes,
mas nunca seu perfil ou outros dados. `--migrate-claude` copia os arquivos
Markdown de `~/.claude/instagram/`, sem alterar a origem e sem sobrescrever o
destino. Instale o pacote inteiro: a pesquisa usa recursos da skill de Reels.

Uma atualização com `--force` mantém o diretório de dados configurado, inclusive
perfis personalizados. `--data-dir` e `INSTAGRAM_AGENT_HOME` permitem escolher
outro diretório. Configurações antigas inválidas ou conflitantes interrompem a
instalação antes de alterar arquivos e pedem um `--data-dir` explícito.

## Instalação como plugin

O pacote também inclui um manifesto nativo e um marketplace local. Em uma versão
atual do Codex CLI, execute na pasta deste checkout adaptado:

```bash
codex plugin marketplace add .
codex plugin add instagram-agent@instagram-agent-skill
```

Pelo plugin, a chamada inclui o namespace: `$instagram-agent:ig-reel`. Na
instalação direta por skills, use `$ig-reel`.

Também é possível instalar pelo diretório de plugins de um cliente desktop
compatível. Escolha a instalação por skills ou por plugin para evitar entradas
duplicadas. O plugin não executa o instalador Python: copie `templates/voice.md`
para `~/.agents/instagram/voice.md` ou peça ao Codex para criar seu perfil.
Instalações pelo endereço do GitHub recebem a versão publicada naquele endereço;
esta adaptação local precisa ser publicada para aparecer na instalação remota.

## Uso

Preencha o perfil de voz em português ou forneça exemplos do seu conteúdo e peça
ao Codex para preenchê-lo. Você não precisa repetir informações já fornecidas.

| Skill | O que faz |
| --- | --- |
| `$ig-reel` | Ganchos, roteiro, texto na tela e estimativa de duração. |
| `$ig-caption` | Legenda, prévia do corte, hashtags e termos de busca. |
| `$ig-carousel` | Texto dos slides e imagens, quando houver um renderizador. |
| `$ig-story` | Sequência de stories e stickers. |
| `$ig-plan` | Plano semanal de conteúdo e interação. |
| `$ig-profile` | Avaliação e revisão do perfil. |
| `$ig-human` | Limpeza de texto e revisão de sinais de escrita artificial. |
| `$ig-comment` | Sugestões de comentários em outros perfis. |
| `$ig-reply` | Organização e respostas aos comentários recebidos. |
| `$ig-dm` | Rascunhos de mensagens e follow-ups. |
| `$ig-repurpose` | Transformação de conteúdo longo em posts independentes. |
| `$ig-audit` | Análise dos resultados de posts anteriores. |
| `$ig-viral` | Pesquisa e ranking dos dados disponíveis sobre Reels. |

Os dados são resolvidos nesta ordem: `INSTAGRAM_AGENT_HOME`, a pasta
`.instagram/` mais próxima no projeto, o `instagram-config.json` gravado pelo
instalador e, por fim, `~/.agents/instagram/` no Codex. Arquivos antigos do Claude
podem ser lidos como alternativa, sem serem alterados. Logs diferenciam conteúdo
aprovado de conteúdo que você confirmou ter publicado.

As heurísticas de vocabulário e de pontuação foram feitas para inglês. O Codex
preserva seu português e revisa esses sinais com esse limite em mente. Textos
com menos de 25 palavras exigem revisão manual. A ferramenta não promete passar
em detectores de IA. Emoji e caracteres necessários a outros idiomas são
preservados; `humanize.py --strip-joiners` permite remoção explícita dos joiners.

Pesquisa depende das ferramentas disponíveis ou de dados fornecidos por você.
Sem acesso ao navegador ou transcrição, o Codex pede o conteúdo. Sem um
renderizador, entrega o HTML e o texto do carrossel, identificando o que falta
para exportar PNG/JPEG. Não informa que criou imagens que não existem.

## Verificação

```bash
python3 -m unittest discover -s tests -v
python3 scripts/check_codex.py
python3 scripts/check_codex.py --install-plugin
```

O primeiro comando testa o instalador, o pacote e os scripts. Os seguintes
exigem Codex CLI e verificam o carregamento nativo das 13 skills e do plugin em
uma instalação temporária, sem chamar um modelo ou conectar ao Instagram.

Veja os detalhes técnicos e os exemplos dos scripts no [README em inglês](README.md).
