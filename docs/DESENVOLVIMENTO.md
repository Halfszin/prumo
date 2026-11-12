# Desenvolvimento

## Rodar e testar

Precisa do Node.js 18 ou mais novo.

```
npm install
npm start      # abre o app
npm test       # testes de NF-e, duplicados, busca e ids repetidos na tela
```

## Estrutura

| Arquivo | Função |
| --- | --- |
| `main.js` | Processo principal: janela, bandeja, comunicação com a tela, histórico, atualização automática, lembretes, exportar e apagar dados. |
| `preload.js` | Ponte segura entre a tela e o processo principal (`window.api`). |
| `renderer/index.html` | Toda a interface (HTML, CSS e JS num arquivo, com as fontes embutidas). Aberto direto no navegador, funciona como prévia com dados de exemplo. |
| `fsops.js` | Mover arquivos sem sobrescrever e com nomes válidos no Windows. |
| `background.js` | Organização automática: vigia a pasta e só move arquivos novos, prontos e de regras marcadas. |
| `extras.js` | Leitura de NF-e, hash de duplicados e extração de texto de PDF, Word, Excel e textos. |
| `search-worker.js` | Busca no conteúdo fora do processo principal, para a janela não travar. |
| `scripts/licencas.js` | Gera `THIRD_PARTY_LICENSES.txt` com as licenças dos componentes. |
| `site/index.html` | Página de apresentação. |
| `build/` | Ícones do app e do instalador. |

Os dados do usuário ficam em `%APPDATA%\Prumo` (`prumo.json`, pasta `notas` e `update.log`). Os limites de retenção estão em `PRIVACIDADE.md` e são aplicados em `main.js` (`pruneHistory`, `cleanNoteImages`, rotação do `update.log`).

## Publicar uma versão

1. Suba a versão em `package.json` e anote a mudança no `CHANGELOG.md`.
2. Envie para a branch `main`.
3. Em **Actions > Instalador do Windows > Run workflow**, gere a versão. O GitHub monta o instalador no Windows e publica em Releases o `.exe`, o `latest.yml` e o `.blockmap`.

O app instalado procura atualizações em `https://github.com/Halfszin/prumo/releases/latest/download`, baixa em segundo plano e instala em silêncio.

Para gerar o instalador no próprio computador: `npm run dist` (no Windows, com o Modo Desenvolvedor ligado ou o terminal como administrador, para o ícone ir para o `.exe`).

## Cuidados

- Nunca usar `alert`, `confirm` ou `prompt` nativos: no Windows eles tiram o foco dos campos de texto. Use o diálogo `askC`.
- Ao mudar ou criar funções, atualize o texto do guia (`GUIDE_HTML` em `renderer/index.html`) e suba `GUIDE_VER`, para o guia novo aparecer para todos.
- Ao mudar as dependências, gere de novo o `THIRD_PARTY_LICENSES.txt` com `node scripts/licencas.js <pasta com a LICENSE da Inter> <pasta com a LICENSE da Pacifico>`.
- Ao mudar a política de privacidade, suba `PRIV_VER` para o aviso aparecer de novo.
- Cores: use os tokens (`--accent-text` para texto roxo, `--danger` para vermelho); o contraste foi conferido para WCAG AA nos dois temas.

## Ideias

Próximos passos e o plano do app para Android: [IDEIAS.md](IDEIAS.md).

## Microsoft Store

1. No Partner Center, reserve o nome e copie de "Identidade do produto" os campos `Package/Identity/Name`, `Package/Identity/Publisher` e `Package/Properties/PublisherDisplayName` para `build.appx` no `package.json` (`identityName`, `publisher`, `publisherDisplayName`).
2. Em Actions > Instalador do Windows > Run workflow, marque "Gerar também o pacote da Microsoft Store".
3. Baixe o `Prumo-Loja-X.Y.Z.appx` na página da versão e envie no Partner Center. A Loja assina o pacote.

Na versão da Loja o Prumo não procura atualizações sozinho: quem atualiza é a própria Loja.

## Ainda não testado em Windows real

Corretor ortográfico, instalação silenciosa de ponta a ponta, notificações dos lembretes e organização automática em pastas grandes.
