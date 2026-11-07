# Prumo: resumo de retomada do projeto

Use este arquivo para continuar em uma conversa nova. Envie também o `prumo.zip` e peça: "continue o projeto Prumo a partir do RESUMO.md".

## O que é
Organizador de arquivos open source (MIT) para Windows, em Electron. Lê uma pasta (ex.: Downloads), mostra um **plano** (arquivo -> pasta) e só move depois de confirmar. Tem **Desfazer**, regras editáveis, pré-visualização e quadro kanban. Nome sempre "Prumo", com P maiúsculo e na fonte Pacifico; o restante em Inter. Frase: "Seus arquivos, no prumo."

## Versão atual: 0.11.2
**Regra do usuário: sempre entregar juntos o `prumo.zip` e o instalador `.exe` (com `latest.yml` e `.blockmap`).** O .exe tem ~100 MB e o app do usuário não baixa arquivo desse tamanho: entregar também dividido em partes de 30 MB (`split -b 30m -d -a 1`, renomeadas `.bin`) com um `juntar.bat` (`copy /b parte0+parte1+... Prumo-Setup-X.exe`).
**Usuário pediu: trabalhar só no app; não atualizar a landing page por enquanto.**

**GitHub: https://github.com/Halfszin/prumo (público).** Esta sessão do Claude não pode criar releases nem enviar tags, então a publicação é pelo GitHub Actions (`.github/workflows/instalador.yml`): roda em `windows-latest`, faz `npm ci`, `node test-extras.js` e `electron-builder --win --publish always`, criando a release `vX.Y.Z` com o .exe, `latest.yml` e `.blockmap`. Para publicar uma versão nova: subir a versão no `package.json`, fazer push na `main` e disparar o workflow (`gh api -X POST repos/Halfszin/prumo/actions/workflows/instalador.yml/dispatches -f ref=main`) ou o botão "Run workflow" no GitHub. Link do instalador: https://github.com/Halfszin/prumo/releases/latest. A atualização automática usa por padrão `https://github.com/Halfszin/prumo/releases/latest/download` (`UPDATE_URL` no `main.js`).

Novidades da 0.11.2: atualização automática mostra o andamento. Botão no alto vira barra "Baixando X… N%" e depois "Atualizar para X" (com aviso); erros aparecem em Configurações > Sobre e num aviso; registro em `%APPDATA%\Prumo\update.log` (`updater()`, `updInfo`, eventos `update-status`). Corrigido: "Verificar agora" disparava duas verificações e dois downloads ao mesmo tempo.

Novidades da 0.11.1: barra de rolagem da lista de pastas fina, sem as setas do Windows (o `scrollbar-width` desligava o estilo próprio), mais forte ao passar o mouse; no Dashboard, clicar num mês de "Atividade por mês" abre a lista com os arquivos daquele mês (`view='m:ANO-MES'`, mês de 0 a 11), com atalhos para o Calendário e de volta ao Dashboard.

Novidades da 0.11.0:
- **Organização automática corrigida**: ela só move arquivos de regras marcadas como Automático, e nenhuma regra padrão vinha marcada, então "ligada" não fazia nada. Agora, ao ligar sem nenhuma regra automática, o app pergunta e marca todas; a seção mostra as regras com caixas e avisa (`#bg-warn`) se nada está marcado. Testado no Electron: arquivo novo foi movido; `.crdownload` e o que já estava na pasta ficaram.
- **Configurações em grupos** (Organização: Regras, Organização automática, Pastas por data; Personalizar: Aparência, Barra lateral; Seus dados: Espaço usado, Histórico; Prumo: Sobre e atualizações), com cartões (`.sc`) e linhas de ajuste (`.srow`). `openSet('secao')` abre direto numa seção.
- **Espaço usado** saiu da barra lateral e foi para Configurações > Espaço usado (lista completa com tamanho e %).
- **Histórico** agora fica nas Configurações (removida a página `#p-hist`); pode voltar à barra lateral pela personalização.
- **Barra lateral personalizável**: Configurações > Barra lateral liga/desliga cada atalho (`prefs.sideOff`, padrão `['hist']`; Arquivos sempre visível) e os grupos Suas pastas e Etiquetas (`prefs.grpOff`).
- **Barra lateral recolhida**: as pastas ficavam tortas porque a barra de rolagem do `#nav-cats` (e o margin -6px) empurrava o conteúdo; no modo recolhido a rolagem fica invisível e todos os blocos têm a mesma largura.
- **Notas fixadas**: botão de alfinete na barra da nota; fixadas ficam no topo da lista em "Fixadas" (`n.pin`). Fixar e Excluir viraram botões de ícone.
- **Animações**: entrada das Configurações e das seções, troca de página com cartões em sequência (classe `.enter`), toasts, botões. Interruptor em Aparência > Animações (`prefs.noAnim`); respeita "reduzir movimento" do Windows.

## Versão anterior: 0.10.0

Novidades da 0.10.0 (todas as ideias pendentes + pedidos novos):
- **Favoritos e etiquetas**: estrela no arquivo (Grade, Lista, Detalhes), menu de clique direito, botões na barra de seleção. Etiquetas com cor (padrão: Importante, Trabalho, Pessoal), grupo "Etiquetas" na barra lateral. Guardado em `meta` (por caminho) e `tagdefs`; o `main.js` acompanha o arquivo quando ele é movido/desfeito/excluído (`remapMeta`), e a tela relê com `syncMeta()`.
- **Pasta Revisar**: o que não casa com regra vai para "Revisar" (antes "Outros"); aparece em Suas pastas com cor âmbar (`REV`).
- **Renomear em lote** (`#rdlg`): padrão com `{nome} {n} {data} {pasta}`, procurar/trocar, maiúsculas, número inicial e dígitos, prévia com aviso de nomes repetidos. Vai para o Histórico (`kind:'rename'`).
- **NF-e (XML)**: botão "Ler NF-e" lê emitente (xFant ou xNome), número, data (dhEmi/dEmi) e chave (`extras.js` > `parseNfe`), propõe `Notas fiscais/Fornecedor/AAAA/MM/NF 123 - Fornecedor - AAAA-MM-DD.xml` e leva junto o PDF que tem a chave no nome. Usa o diálogo de plano (`planPre`, `planKind`).
- **Histórico** (menu): até 200 ações com `id`; desfazer tudo ou um arquivo (`undo-items`). Entradas antigas ganham `id` ao abrir (`fixIds`).
- **Delete** exclui o arquivo selecionado (ou os marcados) com a mesma confirmação.
- **Duplicados**: compara só arquivos de mesmo tamanho, por SHA-1 (`hash`); aba Duplicados com "Marcar cópias" (fica o mais antigo) e card no Dashboard com o espaço recuperável.
- **Arquivos antigos**: último uso = maior entre acesso e modificação (`atime` no scan) há mais de 1 ano; "Arquivar marcados" move para `Arquivo morto/ANO`; card no Dashboard.
- **Busca no conteúdo**: botão "Conteúdo" na busca; PDF (pdfjs-dist, até 60 páginas), Word, Excel e textos, com cache por caminho+data; mostra o trecho encontrado.
- **Lembretes com hora e repetição** (todo dia, semana, mês, ano; guardados em `recur` com `done` por dia) e aviso do Windows na hora (`checkReminders` no `main.js` a cada 20 s; precisa do Prumo aberto ou na bandeja). Clicar no aviso abre o dia no Calendário.
- **Quadro**: botão ⋯ no cartão dá data e etiqueta de cor; cartões com data aparecem no Calendário (célula e painel do dia).
- **Tema automático de verdade**: segue o Windows e muda junto (`LMQ`); opção também nas boas-vindas.
- **Exportar/Importar regras** em `.json` (Configurações > Regras).
- **Notas** (menu): estilo Notion/Obsidian, lista com busca, título, barra de formatação (T, H1-H3, negrito, itálico, sublinhado, tachado, listas, tarefas, citação, código, divisor), atalhos de Markdown (`# `, `## `, `- `, `1. `, `[] `, `> `, ```` ``` ````, `---`), imagens por botão, Ctrl+V ou arrastar (reduzidas a 1600 px, guardadas em `%APPDATA%\Prumo\notas`), clique na imagem para Pequena/Média/Grande/Remover. Ctrl+N cria nota. Blocos são trocados no DOM (`retag`, `makeList`, `splitBlock`), sem `formatBlock`, que embaralhava os blocos.
- **Barra lateral**: contadores centralizados e, recolhida, todos os ícones no mesmo bloco (selecionado com contorno, Configurações com bloco).
- Testado: `node test-extras.js`, prévia web no Chromium e Electron sob xvfb com pasta real (NF-e, busca em PDF, duplicados, antigos, organizar, desfazer individual, imagem na nota). Não testado em Windows real.

## Versão anterior: 0.9.3

Novidades da 0.9.3: **Excluir** no clique direito (um arquivo, ou todos os marcados; sempre manda para a Lixeira do Windows via `shell.trashItem`, só dentro da pasta aberta, com confirmação pelo diálogo próprio `askC`; IPC `trash`, em `preload.js` como `api.trash`). **Cores por pasta**: paleta de 11 cores vivas sem cinza, cada pasta recebe uma cor própria e estável, guardada no estado (`colors`, chave liberada em `main.js`); só "Outros" continua neutro e "Soltos" é âmbar. A barra "Espaço usado" ganhou dicas (nome e tamanho), separação entre trechos e legenda com as 4 maiores pastas. **Quadro**: colunas e cartões movem-se pela alça ⋮⋮ (arrastando, com indicador do ponto de soltura, ou pelas setas do teclado com a alça selecionada); o texto continua editável com um clique.

Correção da 0.9.2: **não era possível digitar nos campos das regras** depois de excluir/restaurar regra, porque o `confirm()` nativo do Electron no Windows tira o foco dos campos de texto. Agora o app usa um diálogo próprio (`askC(titulo, msg, rotuloOk)`, elemento `#cdlg`; nunca usar `alert/confirm/prompt` nativos) e o `main.js` devolve o foco à janela depois dos seletores de pasta (`refocus()` e evento `focus`). Também: Esc com diálogo aberto fecha só o diálogo; e "Restaurar padrão" voltava às regras já editadas na primeira execução (as regras e `DEFAULT_RULES` eram o mesmo objeto; agora é cópia).

Correção da 0.9.1: o ícone do Prumo volta ao `.exe`, ao instalador e à barra de tarefas (na 0.9.0 o `Prumo.exe` ficou com o ícone do Electron). O `package.json` agora tem `win.icon: build/icon.ico` e `signAndEditExecutable: true`; sem isso o electron-builder não grava o ícone no exe. Depois de gerar, conferir com `wrestool -x -t14 dist/win-unpacked/Prumo.exe` (deve ter os 6 tamanhos do icon.ico). No Windows, `signAndEditExecutable: true` exige Modo Desenvolvedor ligado ou terminal como administrador.

Novidades da 0.9.0: **Calendário** de verdade (menu, entre Para organizar e Quadro): grade mensal com o número de arquivos modificados por dia e pontos coloridos por pasta, **lembretes por dia** (adicionar, marcar como feito, excluir; ficam salvos em `events` no estado, chave liberada em `main.js`), painel do dia com os arquivos modificados (clique abre a pré-visualização), navegação por mês, botão Hoje e setas do teclado. **Atividade por mês** do Dashboard refeita (barras compactas e rótulo colado na barra, mais: este mês com variação, mês mais ativo, média e lembretes pendentes; botão Abrir calendário). **Etiquetas de pasta** agora iguais (roxas) em Grade, Lista e Detalhes, e centralizadas na Lista.

Da 0.8.0: **Dashboard** (KPIs, Por pasta com alternância Arquivos/Espaço, Para organizar, Atividade por mês, Maiores arquivos) e **conjunto de ícones próprio** (sprite SVG com `currentColor` no topo do `renderer/index.html`: dashboard, pasta, download, quadro, documentos, notas, calendario, config e favoritos; use `ic('nome',tamanho)`; `catIc(nome)` escolhe o ícone da pasta). O ícone **favoritos** está no sprite, ainda sem uso. Contagens, cores e filtros por pasta funcionam também com subpastas por data (`ownerOf(f)`).
Não testado em Windows real (testado em Chromium e Electron sob xvfb).

### Antes (0.7.0)
Novidades desta versão: botão **Atualizar** (F5 e releitura ao voltar para a janela), **atualização automática** (endereço nas Configurações > Sobre), **segundo plano** (bandeja + organização automática segura) e revisão de design das telas.

## Estrutura da pasta `prumo/`
- `main.js` processo principal: janela, bandeja, IPC, atualização, estado salvo em `%APPDATA%\Prumo\prumo.json`.
- `fsops.js` mover arquivo sem sobrescrever e com nomes seguros para o Windows.
- `extras.js` NF-e, hash de duplicados e texto de PDF/Word/Excel (sem Electron). Autoteste: `test-extras.js`.
- `background.js` vigia a pasta e organiza só o que é seguro (ver abaixo). Testado com script Node.
- `preload.js` ponte segura entre tela e processo principal.
- `renderer/index.html` toda a interface (HTML, CSS e JS em um arquivo, fontes embutidas).
- `build/icon.png` e `build/icon.ico` ícone feito do logo do usuário (fio de prumo).
- `site/index.html` landing page (guardada; o usuário gostou, mas queria um novo layout do APP, não uma página de apresentação).
- `PRODUCT.md` e `.impeccable/` contexto de design (Impeccable).
- `package.json` versão, dependências (mammoth, read-excel-file, electron-updater, pdfjs-dist) e configuração do instalador.

## Funções
Regras por palavras no nome e extensão (com coluna **Automático**), exportar/importar; plano com destino editável por arquivo; destino em Documentos ou outra pasta; subpastas por ano ou ano e mês (liga/desliga); Desfazer com confirmação (guarda 20); seleção múltipla; pré-visualização de imagem, PDF, texto, Word e Excel; Grade, Lista e Detalhes com ordenação e paginação; menu de clique direito; boas-vindas; tema escuro (padrão), claro ou automático; barra lateral retrátil (Ctrl+B); atalhos Ctrl+F (busca), Ctrl+, (configurações), F5 (atualizar); quadro kanban salvo.

## Segundo plano (regras de segurança)
Fica na bandeja; só vigia a pasta escolhida (padrão Downloads) e só arquivos soltos na raiz. **Nunca move** temporários (.crdownload, .part, .tmp, .download, .aria2...), bloqueios do Office (`~$`), `desktop.ini`, arquivos ocultos, arquivos ainda crescendo (espera ~5 s sem mudar) nem arquivos em uso. Só move se a regra estiver marcada como **Automático**. Registra no Desfazer e avisa por notificação. Não organiza arquivos que já estavam na pasta quando foi ligado.

## Atualização automática
Informar em Configurações > Sobre o endereço da pasta de releases (ex.: `https://github.com/USUARIO/prumo/releases/latest/download`). Publicar junto, em cada versão: `Prumo-Setup-X.exe`, `latest.yml` e `Prumo-Setup-X.exe.blockmap` (o nome sem espaços é de propósito: o GitHub troca espaços por pontos e quebraria a atualização). O app confere a cada 4 h, baixa em segundo plano e mostra o botão "Atualizar para X".

## Como gerar o instalador
No Windows: `npm install` e `npm run dist` (no Windows precisa do Modo Desenvolvedor ligado, ou terminal como administrador, porque o `package.json` usa `signAndEditExecutable:true` para gravar o ícone do Prumo no .exe; com `false` o .exe fica com o ícone do Electron). Os instaladores entregues aqui foram gerados em Linux com Wine e o ícone embutido (no ambiente do Claude: `apt-get install wine64 wine32:i386` e `npx electron-builder --win`; rodar com `WINEDEBUG=-all`).

## Preferências do usuário
Responder em português. Ao fim de cada versão, **sugerir novas implementações**. Sem opção de fontes nas Configurações. Busca em Ctrl+F. Barra de rolagem do quadro oculta (rola com roda do mouse, Shift+roda ou arrastando). Sem assinatura digital (aviso do SmartScreen é esperado).

## Não testado em Windows real
Abrir/mover/desfazer em pastas reais, pré-visualização de PDF, bandeja e notificações, início com o Windows, atualização automática de ponta a ponta. A lógica de segundo plano passou em teste automatizado em Linux.

## Pendências e ideias
Feitas na 0.10.0: renomear em lote, NF-e, Revisar, favoritos e etiquetas, histórico com desfazer individual. Abandonado por ora: versão Android.
1. Assinatura digital do instalador. 2. Animação "arquivos voam para a pasta" (View Transitions). 3. Links reais do GitHub e do instalador na landing page (`LINKS` no início do script de `site/index.html`). 4. Ideias novas sugeridas ao usuário na 0.10.0: links entre notas com `[[nome]]` e notas ligadas a arquivos; anexar arquivo ou pasta a um cartão do Quadro; regras por tamanho/idade/origem (ex.: "instaladores com mais de 30 dias vão para a Lixeira"); OCR em imagens e PDFs escaneados para a busca no conteúdo; resumo semanal (notificação de domingo com o que entrou, duplicados e espaço); exportar nota para PDF/Markdown; limpar imagens órfãs das notas.

## Fluxo de trabalho usado
Corrigir em `prumo/renderer/index.html` (a mesma página é a prévia web publicada); testar abrindo o Electron com xvfb e capturando telas; gerar o instalador com `electron-builder --win` (Wine instalado); publicar a prévia web.
