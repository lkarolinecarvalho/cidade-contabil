# ADR-0005 — O lançamento do jogador nunca é gravado

**Status:** aceito

## Contexto
Se o lançamento montado pelo jogador fosse gravado direto, um erro corromperia o
balanço e todas as operações seguintes, tornando o jogo incoerente.

## Decisão
- O motor calcula os lançamentos esperados a partir da operação.
- O lançamento do jogador é **comparado** com o esperado, linha a linha, para gerar o
  feedback (conta, lado D/C e valor).
- Ao concluir a operação, o razão grava **sempre os lançamentos do motor**.
- As missões declaram a operação, nunca o lançamento.

### Prévia do erro
Quando o lançamento do jogador está equilibrado mas errado, o motor calcula uma
**prévia** (`simularLancamentoInformado`) de como ficariam a DRE e o Balanço com ele,
lado a lado com o correto. A prévia é descartada e nunca toca o razão. Lançamento
desequilibrado não gera prévia, só o aviso de que débitos ≠ créditos.

## Consequências
- O balanço é sempre correto; o erro do jogador vira aprendizado, não estado quebrado.
- Conteúdo novo não exige escrever lançamentos à mão (menos erro de conteúdo).
- Estorno e retificação de lançamentos ficam para uma fase posterior, como mecânica própria.
