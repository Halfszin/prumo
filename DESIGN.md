# Design

O Prumo usa um visual **bento**: a interface é um mosaico de blocos de cantos generosos sobre um fundo levemente tingido. Cada área de trabalho (barra lateral, indicadores, painéis, colunas, cartões, seções das Configurações) é um bloco; os espaços entre eles são sempre iguais.

## Temas e cores

Os tokens ficam no bloco "Visual bento" de `renderer/index.html`. Três temas: Claro (`light`), Escuro (`escuro`) e Ônix (padrão `:root`), mais o automático que segue o Windows.

| Token | Uso |
|---|---|
| `--bg` | fundo onde os blocos ficam |
| `--card` / `--side` | blocos de conteúdo e barra lateral |
| `--ink` / `--dim` / `--line` | texto, texto secundário, divisórias |
| `--accent` (#c4f25a, verde-lima) | ação principal, item atual da navegação, seleção, interruptores ligados; o texto por cima usa `--accent-ink` (escuro) |
| `--accent-text` | links e destaques em texto (verde-escuro no Claro, lima nos escuros) |
| `--t1`…`--t6` | cores dos blocos (lima, céu, pêssego, lilás, menta, rosa), suaves no Claro e profundas nos escuros |
| `--danger` / `--ok` / `--warn` | estados |

O verde-lima nunca é usado como cor de texto sobre fundo claro.

## Tipografia

- Títulos, números grandes e nomes de cartões e colunas: **Bricolage Grotesque** (`--fd`, embutida).
- Texto da interface: **Inter**.
- Nome "Prumo": **Pacifico** (compromisso de marca).

## Forma

- Raio dos blocos: `--r` (20 px); cartões do Quadro 16 px; botões e campos 12 px; diálogos 24 px.
- Espaço entre blocos: `--gap` (12 px).
- No Claro os blocos são brancos sem borda; nos temas escuros levam uma borda fina (`--line`).
- Sem vidro/desfoque e sem sombras decorativas.

## Assinatura

O Dashboard é um bento de 12 colunas: quatro indicadores coloridos (`--t1`…`--t4`) com números grandes, seguidos de painéis de larguras 7/5 e 6/6. Os atalhos de pasta em Arquivos repetem as cores dos blocos. No Quadro, as colunas são faixas tingidas (nunca blocos dentro de blocos) e os cartões são os blocos.

## Ícones

Logo em vetor (`build/logo.svg`); ícones gerados por `node scripts/icones.js`. Ícones da interface em traço de 2 px.
