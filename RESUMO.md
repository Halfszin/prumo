# Prumo: resumo de retomada do projeto

Use este arquivo para continuar em uma conversa nova. Envie também o `prumo.zip` e peça: "continue o projeto Prumo a partir do RESUMO.md".

## O que é
Organizador de arquivos open source (MIT) para Windows, em Electron. Lê uma pasta (ex.: Downloads), mostra um **plano** (arquivo -> pasta) e só move depois de confirmar. Tem **Desfazer**, regras editáveis, pré-visualização e quadro kanban. Nome sempre "Prumo", com P maiúsculo e na fonte Pacifico; o restante em Inter. Frase: "Seus arquivos, no prumo."

## Versão atual: 0.9.3
**Regra do usuário: sempre entregar juntos o `prumo.zip` e o instalador `.exe` (com `latest.yml` e `.blockmap`).**

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
- `background.js` vigia a pasta e organiza só o que é seguro (ver abaixo). Testado com script Node.
- `preload.js` ponte segura entre tela e processo principal.
- `renderer/index.html` toda a interface (HTML, CSS e JS em um arquivo, fontes embutidas).
- `build/icon.png` e `build/icon.ico` ícone feito do logo do usuário (fio de prumo).
- `site/index.html` landing page (guardada; o usuário gostou, mas queria um novo layout do APP, não uma página de apresentação).
- `PRODUCT.md` e `.impeccable/` contexto de design (Impeccable).
- `package.json` versão, dependências (mammoth, read-excel-file, electron-updater) e configuração do instalador.

## Funções
Regras por palavras no nome e extensão (com coluna **Automático**); plano com destino editável por arquivo; destino em Documentos ou outra pasta; subpastas por ano ou ano e mês (liga/desliga); Desfazer com confirmação (guarda 20); seleção múltipla; pré-visualização de imagem, PDF, texto, Word e Excel; Grade, Lista e Detalhes com ordenação e paginação; menu de clique direito; boas-vindas; tema escuro (padrão), claro ou automático; barra lateral retrátil (Ctrl+B); atalhos Ctrl+F (busca), Ctrl+, (configurações), F5 (atualizar); quadro kanban salvo.

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
1. Renomear em lote por padrão. 2. Leitura de NF-e (XML) para renomear e guardar por fornecedor/ano/mês. 3. Pasta "Revisar" para o que não casa com regra. 4. Favoritos e etiquetas. 5. Histórico completo com desfazer individual. 6. Assinatura digital do instalador. 7. Animação "arquivos voam para a pasta" (View Transitions). 8. Links reais do GitHub e do instalador na landing page (`LINKS` no início do script de `site/index.html`).

## Fluxo de trabalho usado
Corrigir em `organizador.html` (cópia web) e `prumo/renderer/index.html`; testar abrindo o Electron com xvfb e capturando telas; gerar o instalador com `electron-builder --win` (Wine instalado); publicar a prévia web.
