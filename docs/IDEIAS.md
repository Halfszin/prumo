# Ideias e próximos passos

## Prumo de bolso (Android)

Decisão: **não** portar o Prumo inteiro para o Android. O organizador de arquivos esbarra no acesso restrito a arquivos do Android 11+ (a permissão "acesso a todos os arquivos" passa por análise na Google Play), nos limites de apps em segundo plano e no fato de que o problema de pastas bagunçadas com NF-e e documentos é do computador, não do celular.

O que faz sentido é um app companheiro, menor:

- **Notas** (com links, imagens e o guia).
- **Calendário e lembretes** (no celular os avisos funcionam melhor).
- **Quadro de tarefas.**
- **Foto de documento:** fotografar uma nota fiscal ou recibo e mandar para o Prumo do computador organizar.

Pontos em aberto:

- **Sincronização sem coletar dados:** nada de servidor próprio. Caminho previsto: uma pasta na nuvem do próprio usuário (Google Drive, OneDrive) ou a rede de casa.
- **Tecnologia:** reaproveitar a interface (`renderer/index.html`) com Capacitor; a parte de arquivos do Windows (mover, bandeja, instalador) fica de fora.
- **Custos:** conta de desenvolvedor da Google Play (US$ 25, uma vez).
- **Antes de começar:** confirmar o uso real: o que o usuário sente falta de fazer no celular hoje.

## Outras ideias

- Assinatura digital do instalador (SignPath Foundation, grátis para open source) e publicação na Microsoft Store, para tirar o aviso do SmartScreen.
- Quadro mais completo: descrição com texto rico, checklist com progresso, arquivos anexados, prioridade, lembrete na data do cartão, cartão criado a partir de um arquivo, vários quadros e cartões que se repetem.
- Busca geral com Ctrl+K (arquivos, notas, cartões e ajustes).
- Regras por idade ou tamanho (ex.: instaladores com mais de 30 dias vão para a Lixeira).
- Ler texto de fotos e PDFs escaneados (OCR) para a busca no conteúdo.
- Resumo semanal com o que chegou, duplicados e espaço usado.
- Exportar nota para PDF ou Markdown.
- Arrastar para reordenar os itens da barra lateral.
- Página de apresentação (`site/`) com as fontes embutidas, sem carregar do Google Fonts.
