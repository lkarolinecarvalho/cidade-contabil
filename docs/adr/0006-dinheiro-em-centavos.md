# ADR-0006 — Dinheiro em centavos inteiros

**Status:** aceito

## Contexto
Ponto flutuante gera diferenças de centavos, inaceitáveis num jogo que ensina
partidas dobradas.

## Decisão
- Todo valor monetário é um `number` inteiro em centavos (tipo `Centavos`).
- Alíquotas em pontos-base ou frações exatas, nunca multiplicando floats soltos.
- Arredondamento meio para cima, em centavos, **por linha de tributo** e por linha
  de CMV (R-GER-02).
- A formatação em R$ acontece só na UI.

## Consequências
- Os testes comparam valores exatos.
- O cenário de referência fixa os resultados esperados de cada arredondamento.
