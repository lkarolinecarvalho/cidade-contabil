# ADR-0004 — Pessoa x empresa (princípio da entidade)

**Status:** aceito

## Contexto
O avatar tem dinheiro e a empresa tem caixa. Se o jogo mostrar um único saldo, ele
ensina errado o princípio da entidade.

## Decisão
- A **carteira pessoal** do avatar é um estado do jogo fora do razão da empresa.
- O HUD mostra "Sua carteira" e "Caixa da empresa" separadamente, com ícones diferentes.
- A primeira missão é a integralização de capital (carteira → Caixa / Capital Social).
- Despesa pessoal paga com recursos da empresa é bloqueada, com uma explicação.

## Consequências
- O conceito de entidade é ensinado pela própria interface.
- Pró-labore e distribuição de lucros (empresa → carteira) ficam para depois da v1.
