# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: HTML, CSS e JS estáticos em um único arquivo para a landing page (hospedagem ainda indefinida). O produto em si é um app de desktop para Windows (Electron) e mantém seu renderer em `renderer/index.html`.

## Users

Todos, em ambiente profissional. Pessoas e equipes que trabalham com Word, Excel, PDF e notas fiscais no Windows e precisam reconhecer o valor do produto "numa batida de olho". Inclui empresas que queiram implantar o Prumo nos computadores da organização.

## Product Purpose

Organizar pastas bagunçadas (como Downloads) por regras visíveis, mostrando um plano antes de mover qualquer arquivo e permitindo desfazer. Sucesso é o usuário confiar no app o bastante para usá-lo todos os dias.

## Positioning

Organizador de arquivos aberto (MIT) que nunca move nada sem confirmação, com regras editáveis em vez de "mágica", Desfazer da última organização e funcionamento local, sem conexão externa.

## Operating Context

Windows. Arquivos .docx, .xlsx, .pdf, imagens, vídeos, notas fiscais e propostas. Pastas como Downloads e Documentos. Instalador .exe (NSIS) sem assinatura digital, o que gera o aviso do SmartScreen.

## Capabilities and Constraints

Existe hoje (versão 0.6.1): abrir pasta e ler subpastas; regras por palavras no nome e por extensão (Notas fiscais, Propostas, Word, Excel, Documentos, Imagens, Vídeos, Áudio, Compactados, Instaladores); plano de confirmação com destino editável por arquivo; destino em Documentos ou outra pasta; subpastas por ano ou ano e mês (opcional); Desfazer com confirmação; renomear e mover; seleção múltipla; pré-visualização de imagem, PDF, texto, Word e Excel; visualizações Grade, Lista e Detalhes; quadro kanban; tema claro e escuro; menu de clique direito; atalhos (Ctrl+F, Ctrl+B, Ctrl+,).
Ainda não existe: organização automática na bandeja, leitura de NF-e, renomear em lote, atualização automática, assinatura digital.
Restrições: somente Windows; pré-visualização de PDF ainda não testada em Windows real; repositório GitHub e link do instalador ainda não publicados (indefinidos).

## Brand Commitments

Nome Prumo, sempre com P maiúsculo e na fonte Pacifico. Demais textos em Inter. Logo: fio de prumo geométrico (arquivo enviado pelo usuário). Acento violeta e tema escuro como padrão, com tema claro disponível (layout de referência enviado pelo usuário). Frase: "Seus arquivos, no prumo."

## Evidence on Hand

Logo, mockup do app, app 0.6.1 funcionando em testes, código aberto sob MIT. Não existem depoimentos, clientes, números de uso, benchmarks, preços nem contagem de downloads: a página não pode afirmar nenhum deles. O usuário está gerando em paralelo o repositório Git e o instalador direto; links finais indefinidos, usar marcadores provisórios.

## Product Principles

1. Nada se move sem confirmação.
2. Tudo pode ser desfeito.
3. As regras são visíveis e editáveis, sem mágica.
4. Local e aberto: nenhum arquivo sai do computador.
5. Reconhecível de relance, em ambiente profissional.

## Accessibility & Inclusion

Idioma pt-BR. Leitura rápida: hierarquia clara, contraste suficiente, uso por teclado, respeito a movimento reduzido.
