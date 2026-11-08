# Prumo

Organizador de arquivos open source (MIT) para Windows.

## Recursos
- Abre uma pasta, lê os arquivos (inclusive subpastas) e mostra tudo na tela.
- **Regras editáveis** (botão Regras): por palavras no nome (nota fiscal, proposta...) e por extensão (Word, Excel...). Ficam salvas em `%APPDATA%\Prumo\prumo.json`. Dá para **exportar e importar** as regras em um arquivo.
- **Plano de confirmação**: antes de mover, mostra arquivo → pasta. Nada acontece sem você confirmar.
- **Histórico** com as últimas 200 ações (organizar, renomear, NF-e, arquivar): desfaz tudo ou arquivo por arquivo.
- **Pasta Revisar** para o que não casa com nenhuma regra.
- **Favoritos e etiquetas** coloridas, com atalhos na barra lateral.
- **Renomear em lote** com padrão (`{nome}`, `{n}`, `{data}`, `{pasta}`), procurar e trocar, maiúsculas e prévia.
- **NF-e (XML)**: lê fornecedor, número e data e guarda em `Notas fiscais/Fornecedor/Ano/Mês`, levando junto o PDF (DANFE) com a mesma chave.
- **Duplicados** (mesmo conteúdo) e **arquivos antigos** (sem abrir há mais de 1 ano), com arquivar ou excluir em lote.
- **Busca no conteúdo** de PDF, Word, Excel e textos.
- **Notas** com texto rico, tarefas, atalhos de Markdown e imagens no meio do texto.
- **Calendário** com lembretes que se repetem e aviso do Windows na hora; cartões do Quadro com data e cor aparecem no calendário.
- **Notas com links** entre elas (`[[`) e para páginas da web, ordem que você escolher e corretor ortográfico offline.
- **Privacidade**: não coleta nenhum dado. Veja [PRIVACIDADE.md](PRIVACIDADE.md) e [TERMOS.md](TERMOS.md).
- Tecla **Delete** exclui (vai para a Lixeira, com confirmação).
- Renomear e escolher pasta por arquivo, com opção de local livre (pasta relativa ou caminho completo como `D:\Financeiro`).
- Nomes inválidos do Windows são corrigidos; arquivos nunca são sobrescritos (`nome (1).ext`); arquivos em uso são pulados e avisados.
- Visualização em Grade, Lista ou **Detalhes** (colunas ordenáveis, como no Explorer).
- Clique no arquivo para **pré-visualizar** (imagens, PDF, texto, Word e Excel); duplo clique abre no programa padrão.
- Mostrar no Explorer, abrir arquivo, arrastar arquivos do Explorer, quadro kanban salvo.

## Rodar
Precisa do Node.js 18+.

    npm install
    npm start

Autoteste das funções sem tela (NF-e, duplicados, busca): `node test-extras.js`.

## Instalador do Windows
    npm run dist

Gera `dist/Prumo-Setup-0.10.0.exe`, `latest.yml` e o `.blockmap`. No Windows, ligue o Modo Desenvolvedor (ou use o terminal como administrador) para o ícone ir para o .exe. Sem assinatura digital, o Windows pode mostrar o aviso do SmartScreen na instalação (Mais informações > Executar assim mesmo).

## Logo
- `build/icon.ico` e `build/icon.png`: ícone do instalador e da janela.

## Novidades da 0.6
- Configurações > Organização: subpastas por ano ou ano e mês (liga e desliga).
- Menu de clique direito nos arquivos e tela de boas-vindas.
- Fontes embutidas (Inter e Pacifico para o nome): o app não precisa de internet.
