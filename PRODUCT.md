# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Uma mesma pessoa usa o Prumo para trabalho e vida pessoal, em pé de igualdade: arruma a pasta Downloads, documentos, notas fiscais (NF-e), contratos, planilhas e fotos no Windows, e acompanha tarefas, prazos e anotações no mesmo app. Usa no computador o dia inteiro (o app fica na bandeja) e, pelo Wi-Fi de casa, também no celular.

## Product Purpose
Organizar arquivos do Windows por regras simples, sempre mostrando o plano antes de mover e permitindo desfazer, e reunir no mesmo lugar notas, calendário com lembretes e um quadro de tarefas. Sucesso: pastas arrumadas sem medo de perder nada, e o dia a dia de tarefas e prazos visível num só lugar.

## Positioning
Organizador de arquivos local e de código aberto que nunca move nada sem mostrar o plano, desfaz tudo, lê notas fiscais brasileiras e junta arquivos, notas, calendário e quadro no mesmo app, sem conta e sem coletar dados.

## Operating Context
- App Electron para Windows (instalador próprio, Microsoft Store e app Android que abre o Prumo do computador pela rede de casa).
- Uma única interface (`renderer/index.html`) serve o computador e o celular; a página `site/` (landing page) fica fora do escopo de qualquer mudança visual do app.
- Telas: Arquivos (grade, lista, detalhes, pré-visualização), Dashboard, Calendário, Quadro (kanban com cronômetro e avisos), Notas (editor rico), Configurações e diálogos.

## Capabilities and Constraints
- Tudo roda localmente; a única conexão é a procura de atualizações (opcional) e o acesso pelo celular na rede de casa (desligado por padrão).
- Interface em português do Brasil.
- Janela mínima de 640 px; abaixo de 900 px a barra lateral fica só com ícones; no celular, barra de navegação embaixo.
- Sem opções de fonte nas Configurações.

## Brand Commitments
- Nome "Prumo" escrito na fonte manuscrita Pacifico.
- Logo: o símbolo do fio de prumo em vetor (`build/logo.svg`).
- Três temas obrigatórios: Claro, Escuro e Ônix, mais o automático que segue o Windows.
- Visual: moderno padrão (o usuário testou um visual em blocos e preferiu o padrão); sem glassmorphism.
- Temas prontos em que o usuário edita só a cor de destaque (padrão violeta).

## Evidence on Hand
Dados de exemplo da prévia (21 arquivos fictícios, quadro e notas de demonstração) e o guia "Guia do Prumo" dentro das Notas. Não há depoimentos, números de usuários ou imprensa.

## Product Principles
- Nada muda nos arquivos sem o usuário ver o plano e poder desfazer.
- Tudo fica no computador do usuário.
- Uma pessoa, um lugar: arquivos, tarefas, prazos e notas convivem sem trocar de app.
- Rápido de usar todo dia: o app fica aberto o tempo todo e precisa ser leve de olhar.

## Accessibility & Inclusion
Contraste WCAG AA nos três temas, navegação completa pelo teclado (inclusive mover cartões do Quadro) e foco sempre visível.
