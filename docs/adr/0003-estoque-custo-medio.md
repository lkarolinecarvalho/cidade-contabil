# ADR-0003 — Controle de estoque

**Status:** aceito

## Contexto
A venda precisa reconhecer o CMV no momento em que acontece, para o jogador ver a
receita e o custo juntos. É preciso escolher entre inventário permanente e periódico,
e um critério de custeio.

## Decisão
- **Inventário permanente**: cada entrada e saída atualiza o estoque na hora.
- **Custo médio ponderado móvel**, por produto.
- Guardar valor total e quantidade; o custo médio é derivado. CMV arredondado por
  saída; a última saída absorve o resíduo (R-EST-03).

## Consequências
- O CMV aparece em toda venda, reforçando a diferença entre receita, custo e caixa.
- O custo médio é aceito pela legislação fiscal e é o mais cobrado em prova.
- PEPS e inventário periódico podem entrar depois, como desafios de nível avançado.
