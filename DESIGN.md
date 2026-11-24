# Design

O Prumo segue o **moderno padrão** dos apps de produtividade: barra lateral, blocos discretos com borda fina, tipografia Inter, uma cor de destaque e muito acabamento. Familiar de propósito: o app fica aberto o dia todo e precisa sumir na tarefa.

## Temas

Três temas prontos, definidos por tokens no começo de `renderer/index.html`: **Claro** (`light`), **Escuro** (`escuro`) e **Ônix** (padrão `:root`), mais o automático que segue o Windows. Nos temas, o usuário só troca a **cor de destaque** (Configurações > Temas).

| Token | Uso |
|---|---|
| `--bg` / `--card` / `--side` | fundo, blocos e barra lateral |
| `--ink` / `--dim` / `--line` | texto, texto secundário, divisórias |
| `--accent` | botão principal, item atual, seleção, interruptores |
| `--accent-ink` | texto sobre o destaque |
| `--accent-text` | links e destaques em texto |
| `--soft` | fundo suave do item selecionado |
| `--danger` / `--ok` / `--warn` | estados |

## Cor de destaque

Padrão violeta `#7c3aed`. Cores prontas: violeta, azul, petróleo, verde, laranja, vermelho, rosa e grafite, mais uma cor livre. `applyAccent()` recalcula a cada troca de tema:

- texto sobre o destaque branco ou escuro, o que passar de 4,5:1; se nenhum passar, o destaque escurece um pouco até o branco passar;
- `--accent-text` escurece (Claro) ou clareia (escuros) até 4,5:1 sobre `--card`.

## Tipografia e forma

Inter em toda a interface; "Prumo" em Pacifico. Blocos com raio de 12 px e borda `--line`; sem vidro, sem sombras decorativas. Ícones em traço de 2 px; logo em `build/logo.svg`.
