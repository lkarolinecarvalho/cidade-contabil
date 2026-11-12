# ADR-0010 — A empresa é uma hamburgueria, sociedade limitada

> **Alterado pelo [ADR-0011](0011-progressao-pedagogica.md):** a campanha passou a ter 8 capítulos, com uma fase inicial sem tributos.

**Status:** aceito. Substitui o [ADR-0007](0007-sociedade-anonima.md) e a lista de
capítulos do [ADR-0008](0008-escopo-mvp-campanha.md).

## Contexto

O "Mercado Vila Nova S.A." era genérico: uma loja com um produto só, "mercadorias
diversas". Faltava um cenário que sustentasse a história e que permitisse treinar
muitas operações diferentes sem um catálogo grande. Começar pela S.A. também não ajuda
quem está começando.

## Decisão

- A empresa é a **Chapa da Praça Ltda.**, uma hamburgueria de bairro.
- O catálogo é fixo e pequeno: quatro insumos, uma mercadoria para revenda e um material
  de consumo. O que varia é a condição da operação, não o produto.
- O custo do lanche é a baixa dos insumos por uma **receita fixa** (R-INS-03).
- Existe um **arco industrial** (hambúrguer congelado) para treinar o IPI recuperável.
- A empresa é **sociedade limitada**, com o avatar (90%) e um sócio NPC (10%). A S.A. e
  o capital autorizado ficam na teoria do Escritório, como comparação entre os tipos.
- O regime tributário continua sendo o Lucro Presumido, como simplificação didática.
- A campanha passa a ter **6 capítulos** ([campanha.md](../campanha.md)). Os 6
  estabelecimentos do mapa continuam os mesmos (ADR-0008).
- O jogo se organiza em dois ambientes: a empresa (prática) e o Escritório Contábil
  (consulta, teoria, revisão e desafios).

## Consequências

- As regras novas estão nas seções 15 a 22 de `docs/regras-contabeis.md`.
- O cenário dourado principal foi reescrito (`docs/cenario-campanha.md`).
- O que continua valendo do ADR-0007: o sócio NPC só existe na narrativa, e a carteira
  do avatar cai só pela parte dele nas integralizações.
