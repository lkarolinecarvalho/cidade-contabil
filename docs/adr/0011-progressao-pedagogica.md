# ADR-0011 — Progressão pedagógica: do zero, sem tributos no começo

**Status:** aceito. Altera a lista de capítulos do
[ADR-0010](0010-hamburgueria-limitada.md).

## Contexto

O começo da campanha estava duro para quem nunca estudou Contabilidade: a segunda
operação com mercadoria já trazia ICMS a Recuperar e IPI no custo, antes de o jogador
entender uma compra simples. Os termos técnicos apareciam sem apresentação.

## Decisão

1. **O jogador não sabe nada.** Todo conceito novo é apresentado pela Marta, numa aula
   curta, antes da operação que o usa. Toda missão segue
   contexto → explicação → exemplo → operação → lançamento → consequência.
2. **A campanha começa por conversas**, sem lançamento: o que é Contabilidade, o
   patrimônio, por que registrar, as técnicas, a tomada de decisão, os usuários e, por
   fim, contas, débito, crédito e lançamento.
3. **Fase sem tributos.** Nos capítulos 2 e 3, compras e vendas são feitas pelo valor
   total da nota (R-DID-01, simplificação didática exposta como nota didática).
4. **Os tributos entram no capítulo 4**, como necessidade do crescimento da casa, numa
   conversa própria e depois em notas que identificam emitente, destinatário e
   finalidade (situações A a E, seção 23 das regras).
5. **Comparar para entender.** Missões de compra podem comparar a própria nota com a de
   outra missão; os valores vêm do motor.
6. A campanha passa a ter **8 capítulos** ([campanha.md](../campanha.md)).

## Consequências

- O motor aceita compra e venda com `semTributos` e calcula o IPI na base do ICMS no
  material de uso e consumo (R-ICMS-07). O cenário dourado foi recalculado.
- O estoque mistura unidades compradas sem tributos (custo cheio) e com tributos (custo
  líquido do ICMS): o custo médio reflete as duas fases. É efeito da simplificação.
- A seção 23 das regras foi redigida a partir da legislação e aguarda validação.
