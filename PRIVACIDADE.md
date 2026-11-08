# Política de Privacidade do Prumo

Versão 1.0 · em vigor desde 8 de novembro de 2026

O Prumo é um organizador de arquivos para Windows, de código aberto (licença MIT). Esta política explica, em linguagem simples, o que acontece com seus dados.

## Resumo

- **O Prumo não coleta nenhum dado seu.** Não há conta, cadastro, propaganda, estatísticas de uso, telemetria nem rastreamento.
- **O Prumo não usa cookies.**
- **Tudo o que você cria fica só no seu computador.** Nada é enviado ao autor do Prumo nem a terceiros.

## O que fica guardado no seu computador

Para funcionar, o Prumo guarda na pasta `%APPDATA%\Prumo` do seu usuário do Windows:

- suas configurações, regras de organização, quadro, lembretes, favoritos e etiquetas (arquivo `prumo.json`);
- suas notas e as imagens que você coloca nelas (pasta `notas`);
- o histórico das organizações, com os caminhos dos arquivos movidos, para você poder desfazer;
- um registro técnico das atualizações (`update.log`), para entender falhas de atualização.

O Prumo lê os arquivos das pastas que você abre para mostrar, organizar, procurar dentro deles e achar duplicados. Essa leitura acontece no seu computador e o conteúdo dos arquivos não sai dele.

## Conexões com a internet

- **Atualizações:** o Prumo procura uma versão nova no GitHub (github.com) a cada poucas horas e, se houver, baixa o instalador. Como em qualquer download, o GitHub recebe o endereço IP do seu computador e dados técnicos da conexão, de acordo com a [declaração de privacidade do GitHub](https://docs.github.com/pt/site-policy/privacy-policies/github-general-privacy-statement). Você pode desligar isso em Configurações > Privacidade e dados; desligado, o Prumo não se conecta a nada.
- **Links nas notas:** quando você clica num link de uma nota, ele abre no seu navegador, fora do Prumo.
- **Corretor ortográfico:** usa o corretor do próprio Windows, no seu computador.

Nenhuma outra conexão é feita.

## Por quanto tempo os dados ficam guardados

| Dado | Limite |
| --- | --- |
| Histórico de organizações | 90 dias ou as últimas 200 ações, o que vier primeiro |
| Registro de atualizações | até cerca de 512 KB; o mais antigo é apagado |
| Imagens que nenhuma nota usa mais | apagadas depois de 1 dia |
| Marcas de lembretes já avisados | 3 dias |
| Busca dentro dos arquivos | só na memória, apagada ao fechar o Prumo |
| Notas, regras, quadro, lembretes e configurações | até você apagar |

## Seus direitos

A Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) garante a você, entre outros, o acesso, a portabilidade e a eliminação dos seus dados. Como tudo fica no seu computador, você exerce esses direitos diretamente, em Configurações > Privacidade e dados:

- **Ver seus dados:** abre a pasta onde o Prumo guarda tudo.
- **Exportar seus dados:** salva uma cópia de tudo numa pasta que você escolher.
- **Apagar todos os seus dados:** apaga tudo o que o Prumo guardou e o reinicia do zero. Os arquivos que você organizou não são tocados.

Desinstalar o Prumo e apagar a pasta `%APPDATA%\Prumo` também remove tudo.

## Crianças

O Prumo não coleta dados de ninguém, inclusive de crianças e adolescentes.

## Mudanças nesta política

Se esta política mudar, o Prumo mostra um aviso na próxima vez que for aberto, e a versão nova fica disponível no aplicativo e no repositório do projeto.

## Contato

Dúvidas sobre privacidade: abra um chamado em [github.com/Halfszin/prumo/issues](https://github.com/Halfszin/prumo/issues).
