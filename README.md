# Prumo

Organizador de arquivos open source (MIT) para Windows.

## Recursos
- Abre uma pasta, lê os arquivos (inclusive subpastas) e mostra tudo na tela.
- **Regras editáveis** (botão Regras): por palavras no nome (nota fiscal, proposta...) e por extensão (Word, Excel...). Ficam salvas em `%APPDATA%\Prumo\arrumei.json`.
- **Plano de confirmação**: antes de mover, mostra arquivo → pasta. Nada acontece sem você confirmar.
- **Desfazer** a última organização (guarda as 20 últimas).
- Renomear e escolher pasta por arquivo, com opção de local livre (pasta relativa ou caminho completo como `D:\Financeiro`).
- Nomes inválidos do Windows são corrigidos; arquivos nunca são sobrescritos (`nome (1).ext`); arquivos em uso são pulados e avisados.
- Visualização em Grade, Lista ou **Detalhes** (colunas ordenáveis, como no Explorer).
- Clique no arquivo para **pré-visualizar** (imagens, PDF, texto, Word e Excel); duplo clique abre no programa padrão.
- Mostrar no Explorer, abrir arquivo, arrastar arquivos do Explorer, quadro kanban salvo.

## Rodar
Precisa do Node.js 18+.

    npm install
    npm start

## Instalador do Windows
    npm run dist

Gera `dist/Prumo Setup 0.6.1.exe`. Sem assinatura digital, o Windows pode mostrar o aviso do SmartScreen na instalação (Mais informações > Executar assim mesmo).

## Logo
- `build/icon.ico` e `build/icon.png`: ícone do instalador e da janela.

## Novidades da 0.6
- Configurações > Organização: subpastas por ano ou ano e mês (liga e desliga).
- Menu de clique direito nos arquivos e tela de boas-vindas.
- Fontes embutidas (Inter e Pacifico para o nome): o app não precisa de internet.
