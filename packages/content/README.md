# @cidade/content

Schemas zod e dados do jogo: missões, afirmativas, NPCs, produtos e estabelecimentos.

- Formato em [`docs/modelo-de-conteudo.md`](../../docs/modelo-de-conteudo.md).
- Dados em `data/`. Os exemplos atuais são parciais e servem de modelo para o marco **M2** (ex.: `m004-compra-prazo` depende de `m004-compra-avista`, ainda não escrita).
- Todo dado é validado nos testes; conteúdo inválido quebra o CI.
